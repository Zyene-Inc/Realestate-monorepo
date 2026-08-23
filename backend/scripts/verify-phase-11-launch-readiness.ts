import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import {
  AgentAccountStatus,
  CommissionPaymentMethod,
  ListingStatus,
  ListingType,
  PaymentStatus,
  PrismaClient,
  Role,
  UserStatus,
} from '@prisma/client';
import { ConflictException } from '@nestjs/common';
import { PaymentsService } from '../src/payments/payments.service';
import { SaleCommissionsService } from '../src/commissions/sale-commissions.service';

if (process.env.VERIFY_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.VERIFY_DATABASE_URL;
}
const prisma = new PrismaClient();
const suffix = randomUUID().slice(0, 8);
const userIds: string[] = [];
const propertyIds: string[] = [];
let agentId: string | undefined;
let ownerId: string | undefined;
let unitId: string | undefined;
let tenantId: string | undefined;
let leaseId: string | undefined;
let paymentId: string | undefined;
let commissionId: string | undefined;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function percentile(values: number[], percentileValue: number) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * percentileValue) - 1)];
}

async function timed<T>(operation: () => Promise<T>) {
  const startedAt = performance.now();
  const value = await operation();
  return { value, durationMs: performance.now() - startedAt };
}

async function main() {
  const salesAdmin = await prisma.user.create({
    data: {
      authUserId: randomUUID(),
      email: `phase11-sales-${suffix}@example.com`,
      role: Role.SALES_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  const agentUser = await prisma.user.create({
    data: {
      authUserId: randomUUID(),
      email: `phase11-agent-${suffix}@example.com`,
      role: Role.AGENT,
      status: UserStatus.ACTIVE,
    },
  });
  userIds.push(salesAdmin.id, agentUser.id);

  const agent = await prisma.agent.create({
    data: {
      userId: agentUser.id,
      companyName: `Phase 11 Realty ${suffix}`,
      contactName: 'Phase Eleven Agent',
      email: agentUser.email,
      accountStatus: AgentAccountStatus.APPROVED,
      approvedAt: new Date(),
      approvedByUserId: salesAdmin.id,
      verificationDocuments: [],
    },
  });
  agentId = agent.id;
  const owner = await prisma.propertyOwner.create({
    data: {
      ownerName: 'Phase Eleven Owner',
      contactEmail: `phase11-owner-${suffix}@example.com`,
      commissionRate: '10.00',
    },
  });
  ownerId = owner.id;

  const rental = await prisma.property.create({
    data: {
      listingType: ListingType.RENT,
      ownerId: owner.id,
      name: `Phase 11 Rental ${suffix}`,
      address: '111 Reliability Way',
      city: 'Kansas City',
      state: 'MO',
      zip: '64108',
      propertyType: 'Apartment',
      amenities: [],
      photos: [],
      documents: [],
      status: 'active',
    },
  });
  const sold = await prisma.property.create({
    data: {
      listingType: ListingType.SALE,
      listingStatus: ListingStatus.APPROVED,
      agentId: agent.id,
      reviewedByUserId: salesAdmin.id,
      name: `Phase 11 Sold Home ${suffix}`,
      address: '112 Reliability Way',
      city: 'Kansas City',
      state: 'MO',
      zip: '64108',
      propertyType: 'Single family',
      amenities: [],
      photos: [],
      documents: [],
      status: 'sold',
      reviewedAt: new Date(),
    },
  });
  propertyIds.push(rental.id, sold.id);
  const unit = await prisma.unit.create({
    data: {
      propertyId: rental.id,
      unitNumber: 'P11',
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 950,
      rentAmount: 1800,
      depositAmount: 1800,
      status: 'occupied',
    },
  });
  unitId = unit.id;
  const tenant = await prisma.tenant.create({
    data: {
      firstName: 'Reliability',
      lastName: 'Tenant',
      email: `phase11-tenant-${suffix}@example.com`,
      unitId: unit.id,
      status: 'active',
    },
  });
  tenantId = tenant.id;
  const lease = await prisma.lease.create({
    data: {
      tenantId: tenant.id,
      unitId: unit.id,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2027-12-31T00:00:00.000Z'),
      monthlyRent: 1800,
      securityDeposit: 1800,
      status: 'active',
    },
  });
  leaseId = lease.id;

  const emailCounts = {
    reminders: 0,
    lateNotices: 0,
    receipts: 0,
  };
  const emails = {
    sendRentReminder: async () => {
      emailCounts.reminders += 1;
    },
    sendLateNotice: async () => {
      emailCounts.lateNotices += 1;
    },
    sendPaymentRecorded: async () => {
      emailCounts.receipts += 1;
    },
  };
  const payments = new PaymentsService(prisma as never, emails as never);
  const commissions = new SaleCommissionsService(prisma as never);

  const paymentRequestId = randomUUID();
  const paymentPayload = {
    clientRequestId: paymentRequestId,
    tenantId: tenant.id,
    leaseId: lease.id,
    unitId: unit.id,
    rentAmount: 1800,
    totalAmount: 1800,
    paidAmount: 0,
    paymentMethod: 'check',
    referenceNumber: `P11-${suffix}`,
    dueDate: new Date('2026-09-01T00:00:00.000Z'),
    status: PaymentStatus.PENDING,
    notes: 'Phase 11 concurrency verification',
  };
  const paymentAttempts = await Promise.all(
    Array.from({ length: 20 }, () =>
      timed(() => payments.recordPayment(paymentPayload, salesAdmin.id)),
    ),
  );
  const paymentIds = new Set(
    paymentAttempts.map((attempt) => attempt.value.id),
  );
  assert(
    paymentIds.size === 1,
    'Concurrent payment retries created duplicates',
  );
  paymentId = paymentAttempts[0].value.id;
  assert(
    (await prisma.payment.count({
      where: { idempotencyKey: paymentRequestId },
    })) === 1,
    'Payment idempotency key did not remain unique',
  );
  assert(emailCounts.reminders === 1, 'Payment retry sent duplicate reminders');

  await expectConflict(() =>
    payments.recordPayment(
      { ...paymentPayload, totalAmount: 1900 },
      salesAdmin.id,
    ),
  );

  const statusRequestId = randomUUID();
  const statusAttempts = await Promise.all(
    Array.from({ length: 20 }, () =>
      timed(() =>
        payments.updatePaymentStatus(
          paymentId!,
          {
            clientRequestId: statusRequestId,
            status: PaymentStatus.PAID,
            paidAmount: 1800,
          },
          salesAdmin.id,
        ),
      ),
    ),
  );
  assert(
    new Set(statusAttempts.map((attempt) => attempt.value.id)).size === 1,
    'Concurrent payment status retries diverged',
  );
  assert(emailCounts.receipts === 1, 'Status retry sent duplicate receipts');

  const commissionRequestId = randomUUID();
  const commissionPayload = {
    clientRequestId: commissionRequestId,
    propertyId: sold.id,
    salePrice: '425000.00',
    commissionAmount: '12750.00',
    receivedAt: new Date().toISOString(),
    paymentMethod: CommissionPaymentMethod.ACH,
    referenceNumber: `ACH-${suffix}`,
    notes: 'Phase 11 concurrency verification',
  };
  const commissionAttempts = await Promise.all(
    Array.from({ length: 20 }, () =>
      timed(() => commissions.create(salesAdmin.id, commissionPayload)),
    ),
  );
  assert(
    new Set(commissionAttempts.map((attempt) => attempt.value.id)).size === 1,
    'Concurrent commission retries created duplicates',
  );
  commissionId = commissionAttempts[0].value.id;
  assert(
    (await prisma.saleCommission.count({
      where: { idempotencyKey: commissionRequestId },
    })) === 1,
    'Commission idempotency key did not remain unique',
  );
  await expectConflict(() =>
    commissions.create(salesAdmin.id, {
      ...commissionPayload,
      commissionAmount: '13000.00',
    }),
  );

  const auditCounts = await prisma.auditLog.groupBy({
    by: ['action'],
    where: { resourceId: { in: [paymentId, commissionId] } },
    _count: { _all: true },
  });
  const countFor = (action: string) =>
    auditCounts.find((row) => row.action === action)?._count._all ?? 0;
  assert(countFor('PAYMENT_RECORDED') === 1, 'Payment create audit duplicated');
  assert(countFor('PAYMENT_UPDATED') === 1, 'Payment update audit duplicated');
  assert(
    countFor('SALE_COMMISSION_CREATED') === 1,
    'Commission create audit duplicated',
  );

  const paymentP95 = percentile(
    paymentAttempts.map((attempt) => attempt.durationMs),
    0.95,
  );
  const statusP95 = percentile(
    statusAttempts.map((attempt) => attempt.durationMs),
    0.95,
  );
  const commissionP95 = percentile(
    commissionAttempts.map((attempt) => attempt.durationMs),
    0.95,
  );
  assert(
    Math.max(paymentP95, statusP95, commissionP95) < 10_000,
    'Concurrent financial operation p95 exceeded 10 seconds',
  );

  console.log(
    JSON.stringify({
      result: 'PHASE_11_RELIABILITY_VERIFIED',
      concurrency: 20,
      exactAuditCounts: {
        PAYMENT_RECORDED: 1,
        PAYMENT_UPDATED: 1,
        SALE_COMMISSION_CREATED: 1,
      },
      emailCounts,
      p95Ms: {
        paymentCreate: Math.round(paymentP95),
        paymentStatus: Math.round(statusP95),
        commissionCreate: Math.round(commissionP95),
      },
    }),
  );
}

async function expectConflict(operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch (error) {
    if (error instanceof ConflictException) return;
    throw error;
  }
  throw new Error('Reused idempotency key with changed data was accepted');
}

async function cleanup() {
  await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  if (propertyIds.length > 0) {
    await prisma.saleCommission.deleteMany({
      where: { propertyId: { in: propertyIds } },
    });
  }
  if (leaseId) {
    await prisma.payment.deleteMany({ where: { leaseId } });
  }
  if (leaseId) await prisma.lease.deleteMany({ where: { id: leaseId } });
  if (tenantId) await prisma.tenant.deleteMany({ where: { id: tenantId } });
  if (unitId) await prisma.unit.deleteMany({ where: { id: unitId } });
  if (propertyIds.length > 0) {
    await prisma.property.deleteMany({ where: { id: { in: propertyIds } } });
  }
  if (ownerId) {
    await prisma.propertyOwner.deleteMany({ where: { id: ownerId } });
  }
  if (agentId) await prisma.agent.deleteMany({ where: { id: agentId } });
  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

async function run() {
  let failure: unknown;
  try {
    await main();
  } catch (error) {
    failure = error;
  }
  try {
    await cleanup();
  } catch (cleanupError) {
    failure ??= cleanupError;
  }
  await prisma.$disconnect();
  if (failure) throw failure;
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
