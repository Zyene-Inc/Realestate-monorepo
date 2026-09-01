import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ESignatureDocumentType } from '@prisma/client';
import {
  VerdocsEndpoint,
  authenticate,
  cancelEnvelope,
  createEnvelope,
  downloadEnvelopeDocument,
  getEnvelope,
  getTemplate,
  remindRecipient,
  type ICreateEnvelopeFromTemplateRequest,
  type ITemplate,
} from '@verdocs/js-sdk';

export type VerdocsCreateEnvelopeInput = {
  templateId: string;
  title: string;
  roleName: string;
  firstName: string;
  lastName: string;
  email: string;
  expiresAt: string;
  metadata: Record<string, string>;
  fields?: Array<{
    name: string;
    roleName: string;
    defaultValue: string;
  }>;
};

type VerdocsCreateEnvelopeRequest = Omit<
  ICreateEnvelopeFromTemplateRequest,
  'fields'
> & {
  fields?: Array<{
    name: string;
    role_name: string;
    readonly: boolean;
    required: boolean;
    default: string;
  }>;
};

@Injectable()
export class VerdocsService {
  private readonly logger = new Logger(VerdocsService.name);

  constructor(private readonly config: ConfigService) {}

  configuration() {
    const enabled =
      this.config.get<string>('ESIGNATURES_ENABLED')?.trim().toLowerCase() ===
      'true';
    const clientId = this.config.get<string>('VERDOCS_CLIENT_ID')?.trim();
    const clientSecret = this.config
      .get<string>('VERDOCS_CLIENT_SECRET')
      ?.trim();
    const webhookSecret = this.config
      .get<string>('VERDOCS_WEBHOOK_SECRET')
      ?.trim();
    const templateIds = this.templateIds();
    const templatesConfigured = Object.values(templateIds).every(Boolean);
    return {
      provider: 'VERDOCS' as const,
      plan: 'FREE_25_ENVELOPES_MONTHLY' as const,
      enabled,
      apiConfigured: Boolean(
        enabled && clientId && clientSecret && templatesConfigured,
      ),
      webhookConfigured: Boolean(enabled && webhookSecret),
      templatesConfigured,
    };
  }

  private templateIds() {
    return {
      [ESignatureDocumentType.LEASE]:
        this.config.get<string>('VERDOCS_LEASE_TEMPLATE_ID')?.trim() || '',
      [ESignatureDocumentType.DISCLOSURE]:
        this.config.get<string>('VERDOCS_DISCLOSURE_TEMPLATE_ID')?.trim() || '',
      [ESignatureDocumentType.AGREEMENT]:
        this.config.get<string>('VERDOCS_AGREEMENT_TEMPLATE_ID')?.trim() || '',
    };
  }

  templateIdFor(documentType: ESignatureDocumentType) {
    return this.templateIds()[documentType];
  }

  webhookSecret() {
    return this.config.get<string>('VERDOCS_WEBHOOK_SECRET')?.trim() || null;
  }

  private async endpoint() {
    const state = this.configuration();
    const clientId = this.config.get<string>('VERDOCS_CLIENT_ID')?.trim();
    const clientSecret = this.config
      .get<string>('VERDOCS_CLIENT_SECRET')
      ?.trim();
    if (!state.apiConfigured || !clientId || !clientSecret) {
      throw new ServiceUnavailableException(
        'Verdocs e-signatures are not configured',
      );
    }
    try {
      const endpoint = new VerdocsEndpoint({
        baseURL:
          this.config.get<string>('VERDOCS_API_BASE_URL')?.trim() ||
          'https://api.verdocs.com',
        timeout: 20_000,
        persist: false,
      });
      const session = await authenticate(endpoint, {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      });
      endpoint.setToken(session.access_token);
      return endpoint;
    } catch (error) {
      this.logger.error('Verdocs authentication failed', this.message(error));
      throw new ServiceUnavailableException('Verdocs is unavailable');
    }
  }

  private message(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private async call<T>(label: string, operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      this.logger.error(`Verdocs ${label} failed`, this.message(error));
      throw new ServiceUnavailableException(
        `Verdocs could not ${label.replaceAll('-', ' ')}`,
      );
    }
  }

  async listTemplates() {
    const endpoint = await this.endpoint();
    const configured = this.templateIds();
    const templates = await this.call('list-templates', () =>
      Promise.all(
        Object.entries(configured).map(async ([documentType, templateId]) => ({
          documentType: documentType as ESignatureDocumentType,
          template: await getTemplate(endpoint, templateId),
        })),
      ),
    );
    return templates
      .filter(({ template }) => template.is_sendable)
      .map(({ documentType, template }) => ({
        ...this.publicTemplate(template),
        documentType,
      }));
  }

  async template(id: string) {
    const endpoint = await this.endpoint();
    return this.call('load-template', () => getTemplate(endpoint, id));
  }

  private publicTemplate(template: ITemplate) {
    return {
      id: template.id,
      name: template.name,
      description: template.description ?? null,
      isSendable: template.is_sendable,
      roles: (template.roles ?? []).map((role) => ({
        name: role.name,
        type: role.type,
      })),
      documentCount: (template.documents ?? template.template_documents ?? [])
        .length,
      updatedAt: template.updated_at,
    };
  }

  async create(input: VerdocsCreateEnvelopeInput) {
    const endpoint = await this.endpoint();
    const request: VerdocsCreateEnvelopeRequest = {
      template_id: input.templateId,
      name: input.title,
      sender_name:
        this.config.get<string>('VERDOCS_SENDER_NAME')?.trim() ||
        'Coach Johnson Realty',
      sender_email:
        this.config.get<string>('VERDOCS_SENDER_EMAIL')?.trim() || undefined,
      no_contact: false,
      visibility: 'private',
      initial_reminder: 86_400,
      followup_reminders: 172_800,
      max_reminder_days: 14,
      expires_at: input.expiresAt,
      locale: 'en-US',
      timezone: 'America/New_York',
      data: input.metadata,
      fields: input.fields?.map((field) => ({
        name: field.name,
        role_name: field.roleName,
        readonly: true,
        required: false,
        default: field.defaultValue,
      })),
      recipients: [
        {
          role_name: input.roleName,
          first_name: input.firstName,
          last_name: input.lastName,
          email: input.email,
          delegator: false,
          auth_methods: ['email'],
          message: 'Please review and sign this Coach Johnson Realty document.',
        },
      ],
    };
    return this.call('create-envelope', () =>
      createEnvelope(
        endpoint,
        request as unknown as ICreateEnvelopeFromTemplateRequest,
      ),
    );
  }

  async envelope(id: string) {
    const endpoint = await this.endpoint();
    return this.call('load-envelope', () => getEnvelope(endpoint, id));
  }

  async cancel(id: string) {
    const endpoint = await this.endpoint();
    return this.call('cancel-envelope', () => cancelEnvelope(endpoint, id));
  }

  async remind(id: string, roleName: string) {
    const endpoint = await this.endpoint();
    return this.call('send-reminder', () =>
      remindRecipient(endpoint, id, roleName),
    );
  }

  async downloadDocument(documentId: string) {
    const endpoint = await this.endpoint();
    const downloaded = await this.call<unknown>(
      'download-completed-document',
      () => downloadEnvelopeDocument(endpoint, documentId) as Promise<unknown>,
    );
    if (downloaded instanceof Blob) {
      return Buffer.from(await downloaded.arrayBuffer());
    }
    if (downloaded instanceof ArrayBuffer) return Buffer.from(downloaded);
    if (Buffer.isBuffer(downloaded)) return downloaded;
    if (downloaded instanceof Uint8Array) return Buffer.from(downloaded);
    throw new ServiceUnavailableException(
      'Verdocs returned an invalid completed document',
    );
  }
}
