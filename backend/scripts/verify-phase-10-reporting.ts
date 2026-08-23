import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import {
  AgentAccountStatus,
  CommissionPaymentMethod,
  ListingStatus,
  ListingType,
  PaymentStatus,
  PrismaClient,
  PublishStatus,
  Role,
  SaleCommissionStatus,
  UserStatus,
} from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const apiUrl = process.env.VERIFY_API_URL || 'http://127.0.0.1:3015/api';
const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !publishableKey || !secretKey) {
  throw new Error('Supabase verification credentials are missing');
}

const prisma = new PrismaClient();
const admin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const suffix = randomUUID().slice(0, 8);
const password = `Verify-${randomUUID()}!`;
const authUserIds: string[] = [];
const appUserIds: string[] = [];
const agentIds: string[] = [];
const ownerIds: string[] = [];
const propertyIds: string[] = [];
let tenantId: string | undefined;
let unitId: string | undefined;
let leaseId: string | undefined;
let paymentId: string | undefined;
let commissionId: string | undefined;

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
  return {
    response,
    body: (await response.json().catch(() => null)) as T,
  };
}

async function createPortalUser(role: Role) {
  const email = `phase10-${role.toLowerCase()}-${suffix}@example.com`;
  const authentication = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authentication.error || !authentication.data.user) {
    throw authentication.error || new Error(`Could not create ${role}`);
  }
  authUserIds.push(authentication.data.user.id);
  const user = await prisma.user.create({
    data: {
      authUserId: authentication.data.user.id,
      email,
      role,
      status: UserStatus.ACTIVE,
    },
  });
  appUserIds.push(user.id);
  return { user, email };
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
  const baselinePendingAgents = await prisma.agent.count({
    where: { accountStatus: AgentAccountStatus.PENDING },
  });
  const baselinePendingListings = await prisma.property.count({
    where: {
      listingType: ListingType.SALE,
      listingStatus: ListingStatus.PENDING_REVIEW,
    },
  });
  const superAdmin = await createPortalUser(Role.SUPER_ADMIN);
  const salesAdmin = await createPortalUser(Role.SALES_ADMIN);
  const tenantAdmin = await createPortalUser(Role.TENANT_ADMIN);

  const approvedAgentUser = await prisma.user.create({
    data: {
      authUserId: randomUUID(),
      email: `phase10-approved-agent-${suffix}@example.com`,
      role: Role.AGENT,
      status: UserStatus.ACTIVE,
    },
  });
  const pendingAgentUser = await prisma.user.create({
    data: {
      authUserId: randomUUID(),
      email: `phase10-pending-agent-${suffix}@example.com`,
      role: Role.AGENT,
      status: UserStatus.ACTIVE,
    },
  });
  appUserIds.push(approvedAgentUser.id, pendingAgentUser.id);
  const approvedAgent = await prisma.agent.create({
    data: {
      userId: approvedAgentUser.id,
      companyName: `Phase 10 Approved Realty ${suffix}`,
      contactName: 'Approved Agent',
      email: approvedAgentUser.email,
      accountStatus: AgentAccountStatus.APPROVED,
      approvedAt: new Date(),
      approvedByUserId: salesAdmin.user.id,
      verificationDocuments: [],
    },
  });
  const pendingAgent = await prisma.agent.create({
    data: {
      userId: pendingAgentUser.id,
      companyName: `Phase 10 Pending Realty ${suffix}`,
      contactName: 'Pending Agent',
      email: pendingAgentUser.email,
      accountStatus: AgentAccountStatus.PENDING,
      verificationDocuments: [],
    },
  });
  agentIds.push(approvedAgent.id, pendingAgent.id);

  const owner = await prisma.propertyOwner.create({
    data: {
      ownerName: 'Phase Ten Owner',
      contactEmail: `phase10-owner-${suffix}@example.com`,
      commissionRate: '12.50',
      createdAt: new Date('2099-02-01T00:00:00.000Z'),
    },
  });
  const secondOwner = await prisma.propertyOwner.create({
    data: {
      ownerName: 'Phase Ten Second Owner',
      contactEmail: `phase10-owner-two-${suffix}@example.com`,
      commissionRate: '10.00',
      createdAt: new Date('2099-01-01T00:00:00.000Z'),
    },
  });
  ownerIds.push(owner.id, secondOwner.id);

  const rental = await prisma.property.create({
    data: {
      listingType: ListingType.RENT,
      listingStatus: null,
      publishStatus: PublishStatus.PUBLISHED,
      ownerId: owner.id,
      name: `Phase 10 Rental ${suffix}`,
      address: '1010 Reporting Way',
      city: 'Dallas',
      state: 'TX',
      zip: '75201',
      propertyType: 'Apartment',
      amenities: [],
      photos: [],
      documents: [],
      status: 'active',
      publishedAt: new Date(),
    },
  });
  const pendingListing = await prisma.property.create({
    data: {
      listingType: ListingType.SALE,
      listingStatus: ListingStatus.PENDING_REVIEW,
      publishStatus: PublishStatus.DRAFT,
      agentId: approvedAgent.id,
      name: `Phase 10 Pending Listing ${suffix}`,
      address: '1011 Reporting Way',
      city: 'Dallas',
      state: 'TX',
      zip: '75201',
      propertyType: 'Single family',
      amenities: [],
      photos: [],
      documents: [],
      status: 'active',
      submittedAt: new Date(),
    },
  });
  const soldListing = await prisma.property.create({
    data: {
      listingType: ListingType.SALE,
      listingStatus: ListingStatus.APPROVED,
      publishStatus: PublishStatus.PUBLISHED,
      agentId: approvedAgent.id,
      reviewedByUserId: salesAdmin.user.id,
      name: `Phase 10 Sold Listing ${suffix}`,
      address: '1012 Reporting Way',
      city: 'Dallas',
      state: 'TX',
      zip: '75201',
      propertyType: 'Single family',
      amenities: [],
      photos: [],
      documents: [],
      status: 'sold',
      reviewedAt: new Date(),
      publishedAt: new Date(),
    },
  });
  propertyIds.push(rental.id, pendingListing.id, soldListing.id);

  const unit = await prisma.unit.create({
    data: {
      propertyId: rental.id,
      unitNumber: 'P10',
      bedrooms: 2,
      bathrooms: 2,
      squareFeet: 1100,
      rentAmount: 2000,
      depositAmount: 2000,
      status: 'occupied',
    },
  });
  unitId = unit.id;
  const tenant = await prisma.tenant.create({
    data: {
      firstName: 'Phase',
      lastName: 'Ten',
      email: `phase10-tenant-${suffix}@example.com`,
      unitId: unit.id,
      status: 'active',
    },
  });
  tenantId = tenant.id;
  const lease = await prisma.lease.create({
    data: {
      tenantId: tenant.id,
      unitId: unit.id,
      startDate: new Date('2029-01-01T00:00:00.000Z'),
      endDate: new Date('2031-12-31T00:00:00.000Z'),
      monthlyRent: 2000,
      securityDeposit: 2000,
      status: 'active',
    },
  });
  leaseId = lease.id;
  const payment = await prisma.payment.create({
    data: {
      tenantId: tenant.id,
      leaseId: lease.id,
      unitId: unit.id,
      propertyOwnerId: owner.id,
      rentAmount: 2000,
      totalAmount: 2000,
      paidAmount: 0,
      balanceDue: 2000,
      status: PaymentStatus.PENDING,
      paidAt: null,
      dueDate: new Date('2030-06-01T00:00:00.000Z'),
    },
  });
  paymentId = payment.id;
  const commission = await prisma.saleCommission.create({
    data: {
      idempotencyKey: randomUUID(),
      propertyId: soldListing.id,
      agentId: approvedAgent.id,
      salePrice: '400000.00',
      commissionAmount: '12000.00',
      receivedAt: new Date('2030-06-16T12:00:00.000Z'),
      paymentMethod: CommissionPaymentMethod.CHECK,
      status: SaleCommissionStatus.ACTIVE,
      recordedByUserId: salesAdmin.user.id,
    },
  });
  commissionId = commission.id;
  await prisma.auditLog.createMany({
    data: [
      {
        userId: superAdmin.user.id,
        action: 'PHASE10_VERIFICATION_EVENT',
        resource: 'phase10_verification',
        resourceId: payment.id,
        newValue: JSON.stringify({ sequence: 1 }),
        createdAt: new Date('2030-06-20T12:00:00.000Z'),
      },
      {
        userId: salesAdmin.user.id,
        action: 'PHASE10_VERIFICATION_EVENT',
        resource: 'phase10_verification',
        resourceId: commission.id,
        newValue: JSON.stringify({ sequence: 2 }),
        createdAt: new Date('2030-06-19T12:00:00.000Z'),
      },
    ],
  });

  const [superToken, salesToken, tenantToken] = await Promise.all([
    signIn(superAdmin.email),
    signIn(salesAdmin.email),
    signIn(tenantAdmin.email),
  ]);
  const attributedPayment = await request<{
    propertyOwnerId: string | null;
    ownerCommissionRate: string | null;
    managementCommissionAmount: string | null;
    ownerProceedsAmount: string | null;
  }>(
    `/payments/${payment.id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        clientRequestId: randomUUID(),
        status: PaymentStatus.PAID,
        paidAmount: 2000,
        paymentMethod: 'check',
        referenceNumber: `P10-${suffix}`,
      }),
    },
    tenantToken,
  );
  assert(
    attributedPayment.response.status === 200 &&
      attributedPayment.body.propertyOwnerId === owner.id &&
      Number(attributedPayment.body.ownerCommissionRate) === 12.5 &&
      Number(attributedPayment.body.managementCommissionAmount) === 250 &&
      Number(attributedPayment.body.ownerProceedsAmount) === 1750,
    'Payment API did not persist the historical owner commission split',
  );
  await prisma.payment.update({
    where: { id: payment.id },
    data: { paidAt: new Date('2030-06-15T12:00:00.000Z') },
  });
  const anonymous = await request('/admin/reports/overview');
  assert(
    anonymous.response.status === 401,
    'Anonymous report access was not blocked',
  );
  const salesDenied = await request('/admin/reports/overview', {}, salesToken);
  assert(
    salesDenied.response.status === 403,
    'Sales Admin accessed cross-vertical reports',
  );
  const tenantDenied = await request('/admin/audit-logs', {}, tenantToken);
  assert(
    tenantDenied.response.status === 403,
    'Rental Admin accessed compliance history',
  );

  const overview = await request<{
    queues: { pendingAgents: number; pendingListings: number };
    rentRevenue: {
      collected: string;
      managementCommission: string;
      ownerProceeds: string;
    };
    saleRevenue: { commission: string };
    companyRevenue: { combined: string };
    compliance: { auditEventCount: number; actorCount: number };
  }>('/admin/reports/overview?from=2030-01-01&to=2030-12-31', {}, superToken);
  assert(overview.response.status === 200, 'Super Admin report request failed');
  assert(
    overview.body.queues.pendingAgents === baselinePendingAgents + 1 &&
      overview.body.queues.pendingListings === baselinePendingListings + 1,
    'Pending approval queue totals are incorrect',
  );
  assert(
    overview.body.rentRevenue.collected === '2000.00' &&
      overview.body.rentRevenue.managementCommission === '250.00' &&
      overview.body.rentRevenue.ownerProceeds === '1750.00' &&
      overview.body.saleRevenue.commission === '12000.00' &&
      overview.body.companyRevenue.combined === '12250.00',
    'Cross-vertical revenue totals are incorrect',
  );
  assert(
    overview.body.compliance.auditEventCount === 2 &&
      overview.body.compliance.actorCount === 2,
    'Compliance summary is incorrect',
  );

  const ownerPage = await request<{
    items: Array<{
      id: string;
      rentCollected: string;
      managementCommission: string;
      ownerProceeds: string;
      unitCount: number;
      occupiedUnitCount: number;
    }>;
    nextCursor: string | null;
  }>(
    '/admin/reports/owners?from=2030-01-01&to=2030-12-31&limit=1',
    {},
    superToken,
  );
  assert(
    ownerPage.response.status === 200 &&
      ownerPage.body.items[0]?.id === owner.id,
    'Owner report ordering or first page is incorrect',
  );
  assert(
    ownerPage.body.items[0].rentCollected === '2000.00' &&
      ownerPage.body.items[0].managementCommission === '250.00' &&
      ownerPage.body.items[0].ownerProceeds === '1750.00' &&
      ownerPage.body.items[0].unitCount === 1 &&
      ownerPage.body.items[0].occupiedUnitCount === 1,
    'Owner attribution report is incorrect',
  );
  assert(ownerPage.body.nextCursor, 'Owner report cursor was not returned');
  const ownerPageTwo = await request<{ items: Array<{ id: string }> }>(
    `/admin/reports/owners?from=2030-01-01&to=2030-12-31&limit=1&cursor=${encodeURIComponent(ownerPage.body.nextCursor)}`,
    {},
    superToken,
  );
  assert(
    ownerPageTwo.body.items[0]?.id === secondOwner.id,
    'Owner report cursor skipped or duplicated a row',
  );

  const auditPage = await request<{
    items: Array<{
      id: string;
      action: string;
      newValue: { sequence: number };
    }>;
    nextCursor: string | null;
  }>(
    '/admin/audit-logs?from=2030-01-01&to=2030-12-31&action=PHASE10_VERIFICATION_EVENT&resource=phase10_verification&limit=1',
    {},
    superToken,
  );
  assert(
    auditPage.response.status === 200 &&
      auditPage.body.items.length === 1 &&
      auditPage.body.items[0].action === 'PHASE10_VERIFICATION_EVENT' &&
      auditPage.body.items[0].newValue.sequence === 1 &&
      auditPage.body.nextCursor,
    'Audit filtering, value parsing, or pagination failed',
  );
  const auditPageTwo = await request<{
    items: Array<{ newValue: { sequence: number } }>;
  }>(
    `/admin/audit-logs?from=2030-01-01&to=2030-12-31&action=PHASE10_VERIFICATION_EVENT&resource=phase10_verification&limit=1&cursor=${encodeURIComponent(auditPage.body.nextCursor)}`,
    {},
    superToken,
  );
  assert(
    auditPageTwo.body.items[0]?.newValue.sequence === 2,
    'Audit cursor skipped or duplicated an event',
  );

  console.info(
    'PHASE10_REPORTING_VERIFIED roles=3 revenue=12250.00 ownerSplit=250.00/1750.00 auditPages=2',
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { resource: 'phase10_verification' },
          { userId: { in: appUserIds } },
          { resourceId: { in: [...propertyIds, ...agentIds] } },
        ],
      },
    });
    if (commissionId) {
      await prisma.saleCommissionEvent.deleteMany({ where: { commissionId } });
      await prisma.saleCommission.deleteMany({ where: { id: commissionId } });
    }
    if (paymentId)
      await prisma.payment.deleteMany({ where: { id: paymentId } });
    if (leaseId) await prisma.lease.deleteMany({ where: { id: leaseId } });
    if (tenantId) await prisma.tenant.deleteMany({ where: { id: tenantId } });
    if (unitId) await prisma.unit.deleteMany({ where: { id: unitId } });
    if (propertyIds.length) {
      await prisma.property.deleteMany({ where: { id: { in: propertyIds } } });
    }
    if (agentIds.length) {
      await prisma.agent.deleteMany({ where: { id: { in: agentIds } } });
    }
    if (ownerIds.length) {
      await prisma.propertyOwner.deleteMany({
        where: { id: { in: ownerIds } },
      });
    }
    if (appUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: appUserIds } } });
    }
    for (const authUserId of authUserIds) {
      await admin.auth.admin.deleteUser(authUserId);
    }
    const leftovers = await prisma.auditLog.count({
      where: { resource: 'phase10_verification' },
    });
    console.info(
      leftovers === 0
        ? 'PHASE10_VERIFICATION_DATA_CLEANED'
        : `PHASE10_CLEANUP_FAILED remaining=${leftovers}`,
    );
    if (leftovers) process.exitCode = 1;
    await prisma.$disconnect();
  });
