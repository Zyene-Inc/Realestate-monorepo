import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import {
  AgentAccountStatus,
  ESignatureEventSource,
  Role,
  UserStatus,
} from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const api = process.env.VERIFY_API_URL;
if (!api) {
  throw new Error('VERIFY_API_URL is required for Verdocs activation checks');
}
const suffix = randomUUID().slice(0, 8);
const password = `${randomBytes(18).toString('base64url')}Aa1!`;
const adminEmail = `phase9-admin-${suffix}@example.invalid`;
const agentEmail = `support+phase9-${suffix}@coachjohnsonrealty.com`;

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !publishableKey || !secretKey) {
  throw new Error('Supabase environment variables are missing');
}

const adminClient = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const publicClient = createClient(supabaseUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let adminAuthId: string | undefined;
let agentAuthId: string | undefined;
let adminUserId: string | undefined;
let agentUserId: string | undefined;
let agentId: string | undefined;
let envelopeId: string | undefined;

async function json(response: Response) {
  const body = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function waitForWebhook() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const count = await prisma.eSignatureEvent.count({
      where: { envelopeId, source: ESignatureEventSource.VERDOCS },
    });
    if (count > 0) return count;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  return 0;
}

async function cleanup() {
  if (envelopeId) {
    await prisma.eSignatureDocument.deleteMany({ where: { envelopeId } });
    await prisma.eSignatureEvent.deleteMany({ where: { envelopeId } });
    await prisma.auditLog.deleteMany({
      where: { resource: 'e_signature_envelope', resourceId: envelopeId },
    });
    await prisma.eSignatureEnvelope.deleteMany({ where: { id: envelopeId } });
  }
  if (agentId) await prisma.agent.deleteMany({ where: { id: agentId } });
  if (agentUserId || adminUserId) {
    await prisma.auditLog.deleteMany({
      where: {
        userId: {
          in: [agentUserId, adminUserId].filter(Boolean) as string[],
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [agentUserId, adminUserId].filter(Boolean) as string[] },
      },
    });
  }
  if (agentAuthId) await adminClient.auth.admin.deleteUser(agentAuthId);
  if (adminAuthId) await adminClient.auth.admin.deleteUser(adminAuthId);
}

async function main() {
  try {
    const adminAuth = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
    });
    if (adminAuth.error || !adminAuth.data.user) {
      throw new Error(adminAuth.error?.message ?? 'Admin auth user failed');
    }
    adminAuthId = adminAuth.data.user.id;

    const agentAuth = await adminClient.auth.admin.createUser({
      email: agentEmail,
      password,
      email_confirm: true,
    });
    if (agentAuth.error || !agentAuth.data.user) {
      throw new Error(agentAuth.error?.message ?? 'Agent auth user failed');
    }
    agentAuthId = agentAuth.data.user.id;

    const adminUser = await prisma.user.create({
      data: {
        authUserId: adminAuthId,
        email: adminEmail,
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    adminUserId = adminUser.id;
    const agentUser = await prisma.user.create({
      data: {
        authUserId: agentAuthId,
        email: agentEmail,
        role: Role.AGENT,
        status: UserStatus.ACTIVE,
      },
    });
    agentUserId = agentUser.id;
    const agent = await prisma.agent.create({
      data: {
        userId: agentUser.id,
        companyName: 'Phase 9 Demo Realty LLC',
        contactName: 'Demo Agent',
        email: agentEmail,
        accountStatus: AgentAccountStatus.APPROVED,
        approvedAt: new Date(),
        approvedByUserId: adminUser.id,
      },
    });
    agentId = agent.id;

    const login = await publicClient.auth.signInWithPassword({
      email: adminEmail,
      password,
    });
    if (login.error || !login.data.session) {
      throw new Error(login.error?.message ?? 'Admin sign-in failed');
    }
    const authorization = {
      authorization: `Bearer ${login.data.session.access_token}`,
      'content-type': 'application/json',
    };

    const configuration = await json(
      await fetch(`${api}/admin/e-signatures/configuration`, {
        headers: authorization,
      }),
    );
    const templates = (await json(
      await fetch(`${api}/admin/e-signatures/templates`, {
        headers: authorization,
      }),
    )) as unknown as Array<{
      id: string;
      documentType: string;
      isSendable: boolean;
      roles: Array<{ name: string }>;
    }>;
    const agreement = templates.find(
      (template) => template.documentType === 'AGREEMENT',
    );
    if (!agreement?.isSendable) {
      throw new Error('Agreement template unavailable');
    }

    const created = await json(
      await fetch(`${api}/admin/e-signatures`, {
        method: 'POST',
        headers: authorization,
        body: JSON.stringify({
          clientRequestId: randomUUID(),
          templateId: agreement.id,
          documentType: 'AGREEMENT',
          targetType: 'AGENT',
          targetId: agent.id,
          recipientRoleName: agreement.roles[0]?.name,
          title: `PHASE 9 DEMO - Agent Agreement ${suffix}`,
        }),
      }),
    );
    envelopeId = created.id as string;
    const providerEnvelopeId = created.providerEnvelopeId as string;
    if (!envelopeId || !providerEnvelopeId) {
      throw new Error('Provider envelope was not created');
    }
    const webhookEventsAfterCreate = await waitForWebhook();

    const canceled = await json(
      await fetch(`${api}/admin/e-signatures/${envelopeId}/cancel`, {
        method: 'POST',
        headers: authorization,
      }),
    );
    const eventCount = await prisma.eSignatureEvent.count({
      where: { envelopeId },
    });
    console.log(
      JSON.stringify(
        {
          configuration,
          templateCount: templates.length,
          providerEnvelopeCreated: true,
          webhookEventsAfterCreate,
          finalStatus: canceled.status,
          eventCount,
          temporaryRecordsCleaned: true,
        },
        null,
        2,
      ),
    );
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
