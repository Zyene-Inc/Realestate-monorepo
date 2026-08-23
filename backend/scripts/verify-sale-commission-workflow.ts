import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import {
  AgentAccountStatus,
  CommissionPaymentMethod,
  ListingStatus,
  ListingType,
  PrismaClient,
  Role,
  SaleCommissionStatus,
  UserStatus,
} from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const apiUrl = process.env.VERIFY_API_URL || 'http://127.0.0.1:3014/api';
const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !publishableKey || !secretKey) {
  throw new Error('Supabase verification credentials are missing');
}

const prisma = new PrismaClient();
const supabaseAdmin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const suffix = randomUUID().slice(0, 8);
const password = `Verify-${randomUUID()}!`;
const salesAdminEmail = `phase8-sales-${suffix}@example.com`;
const rentalAdminEmail = `phase8-rental-${suffix}@example.com`;
const agentEmail = `phase8-agent-${suffix}@example.com`;
const authUserIds: string[] = [];
const appUserIds: string[] = [];
const propertyIds: string[] = [];
let agentId: string | undefined;
let commissionId: string | undefined;

type JsonObject = Record<string, unknown>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
  const body = (await response.json().catch(() => null)) as T;
  return { response, body };
}

async function createPortalUser(email: string, role: Role) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error || new Error(`Could not create ${role}`);
  authUserIds.push(data.user.id);
  const user = await prisma.user.create({
    data: {
      authUserId: data.user.id,
      email,
      role,
      status: UserStatus.ACTIVE,
    },
  });
  appUserIds.push(user.id);
  return user;
}

async function signIn(email: string) {
  const client = createClient(supabaseUrl!, publishableKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.session) {
    throw result.error || new Error(`Sign-in failed for ${email}`);
  }
  return result.data.session.access_token;
}

async function main() {
  const salesAdmin = await createPortalUser(salesAdminEmail, Role.SALES_ADMIN);
  await createPortalUser(rentalAdminEmail, Role.TENANT_ADMIN);
  const agentUser = await createPortalUser(agentEmail, Role.AGENT);
  const agent = await prisma.agent.create({
    data: {
      userId: agentUser.id,
      companyName: `Phase 8 Realty ${suffix}`,
      contactName: 'Phase Eight Agent',
      email: agentEmail,
      accountStatus: AgentAccountStatus.APPROVED,
      verificationDocuments: [],
      approvedAt: new Date(),
      approvedByUserId: salesAdmin.id,
    },
  });
  agentId = agent.id;

  const sold = await prisma.property.create({
    data: {
      listingType: ListingType.SALE,
      listingStatus: ListingStatus.APPROVED,
      agentId: agent.id,
      reviewedByUserId: salesAdmin.id,
      name: `Phase 8 Sold Home ${suffix}`,
      address: '808 Ledger Lane',
      city: 'Dallas',
      state: 'TX',
      zip: '75201',
      propertyType: 'Single family',
      price: '500000.00',
      amenities: [],
      photos: [],
      documents: [],
      status: 'sold',
      reviewedAt: new Date(),
    },
  });
  const active = await prisma.property.create({
    data: {
      listingType: ListingType.SALE,
      listingStatus: ListingStatus.APPROVED,
      agentId: agent.id,
      reviewedByUserId: salesAdmin.id,
      name: `Phase 8 Active Home ${suffix}`,
      address: '809 Ledger Lane',
      city: 'Dallas',
      state: 'TX',
      zip: '75201',
      propertyType: 'Single family',
      price: '450000.00',
      amenities: [],
      photos: [],
      documents: [],
      status: 'active',
      reviewedAt: new Date(),
    },
  });
  propertyIds.push(sold.id, active.id);

  const salesToken = await signIn(salesAdminEmail);
  const rentalToken = await signIn(rentalAdminEmail);

  const anonymous = await request('/admin/sale-commissions');
  assert(
    anonymous.response.status === 401,
    'Anonymous ledger access was not blocked',
  );
  const wrongRole = await request(
    '/admin/sale-commissions/report',
    {},
    rentalToken,
  );
  assert(
    wrongRole.response.status === 403,
    'Rental Admin accessed the sale ledger',
  );

  const eligible = await request<{
    items: Array<{ id: string; agent: { id: string } }>;
  }>('/admin/sale-commissions/eligible-listings?limit=100', {}, salesToken);
  assert(
    eligible.response.status === 200 &&
      eligible.body.items.some(
        (item) => item.id === sold.id && item.agent.id === agent.id,
      ) &&
      !eligible.body.items.some((item) => item.id === active.id),
    'Eligible listings did not enforce the approved sold state',
  );

  const rejectedCreate = await request(
    '/admin/sale-commissions',
    {
      method: 'POST',
      body: JSON.stringify({
        clientRequestId: randomUUID(),
        propertyId: active.id,
        commissionAmount: '10000.00',
        receivedAt: new Date().toISOString(),
        paymentMethod: CommissionPaymentMethod.ACH,
      }),
    },
    salesToken,
  );
  assert(
    rejectedCreate.response.status === 409,
    'An unsold listing accepted commission',
  );

  const clientRequestId = randomUUID();
  const payload = {
    clientRequestId,
    propertyId: sold.id,
    salePrice: '505000.00',
    commissionAmount: '15150.00',
    receivedAt: new Date().toISOString(),
    paymentMethod: CommissionPaymentMethod.WIRE,
    referenceNumber: `WIRE-${suffix}`,
    notes: 'Phase 8 production workflow verification',
  };
  const created = await request<JsonObject>(
    '/admin/sale-commissions',
    { method: 'POST', body: JSON.stringify(payload) },
    salesToken,
  );
  assert(created.response.status === 201, 'Commission creation failed');
  commissionId = String(created.body.id);
  assert(
    created.body.agentId === agent.id &&
      created.body.status === SaleCommissionStatus.ACTIVE &&
      Array.isArray(created.body.events) &&
      created.body.events.length === 1,
    'Commission attribution or creation event is incorrect',
  );

  const retry = await request<JsonObject>(
    '/admin/sale-commissions',
    { method: 'POST', body: JSON.stringify(payload) },
    salesToken,
  );
  assert(
    retry.response.status === 201 && retry.body.id === commissionId,
    'Idempotent create returned a duplicate record',
  );
  const duplicateCount = await prisma.saleCommission.count({
    where: { idempotencyKey: clientRequestId },
  });
  assert(duplicateCount === 1, 'Idempotency key did not prevent duplication');

  const page = await request<{
    items: Array<{ id: string }>;
    nextCursor: string | null;
  }>('/admin/sale-commissions?limit=1', {}, salesToken);
  assert(
    page.response.status === 200 && page.body.items[0]?.id === commissionId,
    'Paginated ledger omitted the new commission',
  );

  const corrected = await request<JsonObject>(
    `/admin/sale-commissions/${commissionId}/correct`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        commissionAmount: '15250.00',
        reason: 'Matched final closing statement',
      }),
    },
    salesToken,
  );
  assert(
    corrected.response.status === 200 &&
      String(corrected.body.commissionAmount) === '15250' &&
      Array.isArray(corrected.body.events) &&
      corrected.body.events.length === 2,
    'Correction did not preserve a second history event',
  );

  const verificationYear = new Date().getUTCFullYear();
  const report = await request<{
    summary: { commissionAmount: string; recordCount: number };
    byAgent: Array<{ agent: { id: string }; commissionAmount: string }>;
  }>(
    `/admin/sale-commissions/report?from=${verificationYear}-01-01&to=${verificationYear}-12-31`,
    {},
    salesToken,
  );
  assert(
    report.response.status === 200 &&
      Number(report.body.summary.commissionAmount) >= 15250 &&
      report.body.byAgent.some(
        (row) =>
          row.agent.id === agent.id && Number(row.commissionAmount) >= 15250,
      ),
    'Revenue reporting did not include the corrected active commission',
  );

  const voided = await request<JsonObject>(
    `/admin/sale-commissions/${commissionId}/void`,
    {
      method: 'POST',
      body: JSON.stringify({ reason: 'Production verification cleanup' }),
    },
    salesToken,
  );
  assert(
    voided.response.status === 201 &&
      voided.body.status === SaleCommissionStatus.VOIDED &&
      Array.isArray(voided.body.events) &&
      voided.body.events.length === 3,
    'Void did not preserve the complete three-event history',
  );
  const actions = await prisma.auditLog.findMany({
    where: { resource: 'sale_commission', resourceId: commissionId },
    orderBy: { createdAt: 'asc' },
    select: { action: true },
  });
  assert(
    JSON.stringify(actions.map(({ action }) => action)) ===
      JSON.stringify([
        'SALE_COMMISSION_CREATED',
        'SALE_COMMISSION_CORRECTED',
        'SALE_COMMISSION_VOIDED',
      ]),
    'Generic audit log actions were incomplete or duplicated',
  );

  console.info(
    `PHASE8_COMMISSION_WORKFLOW_VERIFIED commission=${commissionId} events=3 audits=3`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    if (commissionId) {
      await prisma.auditLog.deleteMany({
        where: { resource: 'sale_commission', resourceId: commissionId },
      });
      await prisma.saleCommission.deleteMany({ where: { id: commissionId } });
    }
    if (propertyIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { resourceId: { in: propertyIds } },
      });
      await prisma.property.deleteMany({ where: { id: { in: propertyIds } } });
    }
    if (agentId) await prisma.agent.deleteMany({ where: { id: agentId } });
    if (appUserIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { userId: { in: appUserIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: appUserIds } } });
    }
    for (const authUserId of authUserIds) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
    }
    const leftovers = await prisma.saleCommission.count({
      where: { id: commissionId ?? '__none__' },
    });
    if (leftovers !== 0) {
      console.error('Phase 8 verification cleanup failed');
      process.exitCode = 1;
    } else {
      console.info('PHASE8_COMMISSION_TEST_DATA_CLEANED');
    }
    await prisma.$disconnect();
  });
