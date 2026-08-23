import { readFile, writeFile, chmod } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  VerdocsEndpoint,
  authenticate,
  createField,
  createTemplate,
  getTemplate,
  getTemplates,
  type IRole,
  type ITemplate,
  type ITemplateField,
} from '@verdocs/js-sdk';

type TemplateDefinition = {
  envName: string;
  name: string;
  description: string;
  file: string;
  roleName: string;
};

const root = resolve(__dirname, '../..');
const envPath = process.env.VERDOCS_BOOTSTRAP_ENV
  ? resolve(process.env.VERDOCS_BOOTSTRAP_ENV)
  : resolve(root, 'backend/.env.verdocs.bootstrap');

function parseEnv(contents: string) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        const key = line.slice(0, separator);
        let value = line.slice(separator + 1);
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        return [key, value.replaceAll('\\n', '\n')];
      }),
  );
}

async function endpoint() {
  const credentialsPath = resolve(root, 'backend/.env.verdocs.credentials');
  const env = {
    ...parseEnv(await readFile(envPath, 'utf8')),
    ...parseEnv(await readFile(credentialsPath, 'utf8')),
  };
  const clientId = env.VERDOCS_CLIENT_ID;
  const clientSecret = env.VERDOCS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Verdocs client credentials are missing');
  }
  const result = new VerdocsEndpoint({
    baseURL: env.VERDOCS_API_BASE_URL || 'https://api.verdocs.com',
    persist: false,
    timeout: 120_000,
  });
  const session = await authenticate(result, {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  result.setToken(session.access_token);
  return result;
}

const definitions: TemplateDefinition[] = [
  {
    envName: 'VERDOCS_LEASE_TEMPLATE_ID',
    name: 'DEMO - Residential Lease',
    description:
      'Phase 9 integration template. Demo only; replace with counsel-approved lease before production use.',
    file: 'output/pdf/demo-residential-lease.pdf',
    roleName: 'Tenant',
  },
  {
    envName: 'VERDOCS_DISCLOSURE_TEMPLATE_ID',
    name: 'DEMO - Property Disclosure',
    description:
      'Phase 9 integration template. Demo only; replace with an approved disclosure before production use.',
    file: 'output/pdf/demo-property-disclosure.pdf',
    roleName: 'Recipient',
  },
  {
    envName: 'VERDOCS_AGREEMENT_TEMPLATE_ID',
    name: 'DEMO - Agent Company Agreement',
    description:
      'Phase 9 integration template. Demo only; replace with a counsel-approved agent agreement before production use.',
    file: 'output/pdf/demo-agent-company-agreement.pdf',
    roleName: 'AgentRepresentative',
  },
];

function role(name: string): IRole {
  return {
    template_id: '',
    name,
    type: 'signer',
    full_name: null,
    first_name: null,
    last_name: null,
    email: null,
    phone: null,
    message: 'Please review and sign this Coach Johnson Realty document.',
    sequence: 1,
    order: 1,
    delegator: false,
    name_locked: false,
  };
}

function signatureField(
  templateId: string,
  documentId: string,
  roleName: string,
): ITemplateField {
  return {
    name: `${roleName}-signature`,
    role_name: roleName,
    template_id: templateId,
    document_id: documentId,
    type: 'signature',
    required: true,
    readonly: false,
    settings: null,
    page: 1,
    validator: null,
    label: 'Signature',
    x: 135,
    y: 610,
    width: 180,
    height: 40,
    default: null,
    placeholder: null,
    multiline: false,
    group: null,
    options: null,
  };
}

async function ensureTemplate(
  api: VerdocsEndpoint,
  definition: TemplateDefinition,
  templates: ITemplate[],
) {
  let template = templates.find((item) => item.name === definition.name);
  if (!template) {
    const document = await readFile(resolve(root, definition.file));
    template = await createTemplate(api, {
      name: definition.name,
      description: definition.description,
      visibility: 'shared',
      sender: 'envelope_creator',
      documents: [
        {
          name: definition.file.split('/').at(-1)!,
          data: document.toString('base64'),
        },
      ],
      roles: [role(definition.roleName)],
    });
  }

  let detailed = await getTemplate(api, template.id);
  const document = (detailed.documents ?? detailed.template_documents)?.[0];
  if (!document) throw new Error(`${definition.name} has no document`);
  const hasRole = detailed.roles?.some(
    (item) => item.name === definition.roleName && item.type === 'signer',
  );
  if (!hasRole) {
    throw new Error(`${definition.name} is missing its signer role`);
  }
  const hasField = detailed.fields?.some(
    (field) => field.role_name === definition.roleName,
  );
  if (!hasField) {
    await createField(
      api,
      detailed.id,
      signatureField(detailed.id, document.id, definition.roleName),
    );
    detailed = await getTemplate(api, detailed.id);
  }
  if (!detailed.is_sendable) {
    throw new Error(`${definition.name} is not sendable after setup`);
  }
  return detailed;
}

async function main() {
  const api = await endpoint();
  const existing = await getTemplates(api, {
    rows: 100,
    page: 0,
    visibility: 'private_shared',
    sort_by: 'name',
    ascending: true,
  });
  const created = await Promise.all(
    definitions.map((definition) =>
      ensureTemplate(api, definition, existing.templates),
    ),
  );

  const generatedPath = resolve(root, 'backend/.env.verdocs.generated');
  const generated = [
    ...created.map(
      (template, index) => `${definitions[index].envName}=${template.id}`,
    ),
    '',
  ].join('\n');
  await writeFile(generatedPath, generated, { mode: 0o600 });
  await chmod(generatedPath, 0o600);

  console.log(
    JSON.stringify(
      {
        templates: created.map((template, index) => ({
          envName: definitions[index].envName,
          id: template.id,
          name: template.name,
          isSendable: template.is_sendable,
          roles: template.roles?.map((item) => item.name) ?? [],
          fields: template.fields?.map((item) => item.name) ?? [],
        })),
      },
      null,
      2,
    ),
  );
}

void main().catch((error: unknown) => {
  const failure = error as {
    message?: string;
    response?: { status?: number; data?: unknown };
    config?: { method?: string; url?: string };
  };
  console.error(
    JSON.stringify({
      message: failure.message ?? String(error),
      method: failure.config?.method,
      url: failure.config?.url,
      status: failure.response?.status,
      response: failure.response?.data,
    }),
  );
  process.exitCode = 1;
});
