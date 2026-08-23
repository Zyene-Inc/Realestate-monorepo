import { ConflictException } from '@nestjs/common';
import {
  CommissionPaymentMethod,
  Prisma,
  SaleCommissionEventType,
  SaleCommissionStatus,
} from '@prisma/client';
import { SaleCommissionsService } from './sale-commissions.service';

const receivedAt = new Date('2026-08-15T12:00:00.000Z');
const updatedAt = new Date('2026-08-16T12:00:00.000Z');

function commission(overrides: Record<string, unknown> = {}) {
  return {
    id: 'commission-1',
    idempotencyKey: '3ecbc8c2-0fba-4ad4-b956-b9e006f79be5',
    propertyId: 'property-1',
    agentId: 'agent-1',
    salePrice: new Prisma.Decimal('400000.00'),
    commissionAmount: new Prisma.Decimal('12000.00'),
    currency: 'USD',
    receivedAt,
    paymentMethod: CommissionPaymentMethod.CHECK,
    referenceNumber: 'CHK-100',
    notes: 'Closing commission',
    status: SaleCommissionStatus.ACTIVE,
    recordedByUserId: 'admin-1',
    voidedAt: null,
    voidReason: null,
    voidedByUserId: null,
    createdAt: receivedAt,
    updatedAt,
    property: {
      id: 'property-1',
      name: 'Sold Home',
      address: '1 Main St',
      city: 'Dallas',
      state: 'TX',
      zip: '75001',
      price: new Prisma.Decimal('410000.00'),
      status: 'sold',
    },
    agent: {
      id: 'agent-1',
      companyName: 'Agent Realty',
      contactName: 'Alex Agent',
      email: 'agent@example.com',
    },
    recordedBy: { id: 'admin-1', email: 'admin@example.com' },
    voidedBy: null,
    ...overrides,
  };
}

describe('SaleCommissionsService', () => {
  it('records an idempotent commission only for a sold approved listing and derives its agent', async () => {
    const created = commission();
    const detailed = { ...created, events: [{ type: 'CREATED' }] };
    const tx = {
      property: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'property-1', agentId: 'agent-1' }),
      },
      saleCommission: {
        create: jest.fn().mockResolvedValue(created),
        findUniqueOrThrow: jest.fn().mockResolvedValue(detailed),
      },
      saleCommissionEvent: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      saleCommission: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };

    const result = await new SaleCommissionsService(prisma as never).create(
      'admin-1',
      {
        clientRequestId: '3ecbc8c2-0fba-4ad4-b956-b9e006f79be5',
        propertyId: 'property-1',
        salePrice: '400000.00',
        commissionAmount: '12000.00',
        receivedAt: receivedAt.toISOString(),
        paymentMethod: CommissionPaymentMethod.CHECK,
        referenceNumber: ' CHK-100 ',
        notes: ' Closing commission ',
      },
    );

    expect(result).toEqual(detailed);
    expect(tx.property.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'property-1',
        listingType: 'SALE',
        listingStatus: 'APPROVED',
        status: 'sold',
        agentId: { not: null },
      },
      select: { id: true, agentId: true },
    });
    const createInput = (
      tx.saleCommission.create.mock.calls as unknown as Array<
        [{ data: Record<string, unknown> }]
      >
    )[0][0];
    expect(createInput.data.agentId).toBe('agent-1');
    expect(createInput.data.propertyId).toBe('property-1');
    expect(createInput.data.recordedByUserId).toBe('admin-1');
    expect(createInput.data.referenceNumber).toBe('CHK-100');
    expect(createInput.data.notes).toBe('Closing commission');
    const eventInput = (
      tx.saleCommissionEvent.create.mock.calls as unknown as Array<
        [{ data: Record<string, unknown> }]
      >
    )[0][0];
    expect(eventInput.data.commissionId).toBe('commission-1');
    expect(eventInput.data.actorUserId).toBe('admin-1');
    expect(eventInput.data.type).toBe(SaleCommissionEventType.CREATED);
    const auditInput = (
      tx.auditLog.create.mock.calls as unknown as Array<
        [{ data: Record<string, unknown> }]
      >
    )[0][0];
    expect(auditInput.data.action).toBe('SALE_COMMISSION_CREATED');
  });

  it('does not create a record when the listing is not an approved sold sale', async () => {
    const tx = {
      property: { findFirst: jest.fn().mockResolvedValue(null) },
      saleCommission: { create: jest.fn() },
    };
    const prisma = {
      saleCommission: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };

    await expect(
      new SaleCommissionsService(prisma as never).create('admin-1', {
        clientRequestId: '3ecbc8c2-0fba-4ad4-b956-b9e006f79be5',
        propertyId: 'property-1',
        commissionAmount: '12000.00',
        receivedAt: receivedAt.toISOString(),
        paymentMethod: CommissionPaymentMethod.ACH,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.saleCommission.create).not.toHaveBeenCalled();
  });

  it('returns the original record for a retried idempotency key', async () => {
    const original = { ...commission(), events: [] };
    const prisma = {
      saleCommission: { findUnique: jest.fn().mockResolvedValue(original) },
      $transaction: jest.fn(),
    };

    await expect(
      new SaleCommissionsService(prisma as never).create('admin-1', {
        clientRequestId: '3ecbc8c2-0fba-4ad4-b956-b9e006f79be5',
        propertyId: 'property-1',
        commissionAmount: '12000.00',
        receivedAt: receivedAt.toISOString(),
        paymentMethod: CommissionPaymentMethod.ACH,
      }),
    ).resolves.toEqual(original);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an idempotency key reused with a different request', async () => {
    const original = {
      ...commission(),
      requestFingerprint: 'different-fingerprint',
      events: [],
    };
    const prisma = {
      saleCommission: { findUnique: jest.fn().mockResolvedValue(original) },
      $transaction: jest.fn(),
    };

    await expect(
      new SaleCommissionsService(prisma as never).create('admin-1', {
        clientRequestId: '3ecbc8c2-0fba-4ad4-b956-b9e006f79be5',
        propertyId: 'property-1',
        commissionAmount: '9999.00',
        receivedAt: receivedAt.toISOString(),
        paymentMethod: CommissionPaymentMethod.ACH,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('corrects active records atomically and preserves old and new values', async () => {
    const current = commission();
    const corrected = commission({
      commissionAmount: new Prisma.Decimal('12500.00'),
      updatedAt: new Date('2026-08-17T12:00:00.000Z'),
    });
    const detailed = { ...corrected, events: [] };
    const tx = {
      saleCommission: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValueOnce(corrected)
          .mockResolvedValueOnce(detailed),
      },
      saleCommissionEvent: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      saleCommission: { findUnique: jest.fn().mockResolvedValue(current) },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };

    await new SaleCommissionsService(prisma as never).correct(
      'admin-1',
      'commission-1',
      { commissionAmount: '12500.00', reason: 'Corrected closing statement' },
    );

    expect(tx.saleCommission.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'commission-1',
          status: SaleCommissionStatus.ACTIVE,
          updatedAt,
        },
      }),
    );
    const eventInput = (
      tx.saleCommissionEvent.create.mock.calls as unknown as Array<
        [
          {
            data: {
              type: SaleCommissionEventType;
              reason: string;
              oldValue: Record<string, unknown>;
              newValue: Record<string, unknown>;
            };
          },
        ]
      >
    )[0][0];
    expect(eventInput.data.type).toBe(SaleCommissionEventType.CORRECTED);
    expect(eventInput.data.reason).toBe('Corrected closing statement');
    expect(eventInput.data.oldValue.commissionAmount).toBe('12000.00');
    expect(eventInput.data.newValue.commissionAmount).toBe('12500.00');
    const auditInput = (
      tx.auditLog.create.mock.calls as unknown as Array<
        [{ data: Record<string, unknown> }]
      >
    )[0][0];
    expect(auditInput.data.action).toBe('SALE_COMMISSION_CORRECTED');
  });

  it('voids without deleting and records the terminal audit event', async () => {
    const current = commission();
    const voided = commission({
      status: SaleCommissionStatus.VOIDED,
      voidedAt: new Date('2026-08-18T12:00:00.000Z'),
      voidReason: 'Duplicate receipt',
      voidedByUserId: 'admin-1',
      voidedBy: { id: 'admin-1', email: 'admin@example.com' },
    });
    const tx = {
      saleCommission: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValueOnce(voided)
          .mockResolvedValueOnce({ ...voided, events: [] }),
      },
      saleCommissionEvent: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      saleCommission: { findUnique: jest.fn().mockResolvedValue(current) },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };

    await new SaleCommissionsService(prisma as never).voidCommission(
      'admin-1',
      'commission-1',
      ' Duplicate receipt ',
    );

    const updateInput = (
      tx.saleCommission.updateMany.mock.calls as unknown as Array<
        [{ data: Record<string, unknown> }]
      >
    )[0][0];
    expect(updateInput.data.status).toBe(SaleCommissionStatus.VOIDED);
    expect(updateInput.data.voidReason).toBe('Duplicate receipt');
    expect(updateInput.data.voidedByUserId).toBe('admin-1');
    const eventInput = (
      tx.saleCommissionEvent.create.mock.calls as unknown as Array<
        [{ data: Record<string, unknown> }]
      >
    )[0][0];
    expect(eventInput.data.type).toBe(SaleCommissionEventType.VOIDED);
    expect(eventInput.data.reason).toBe('Duplicate receipt');
    const auditInput = (
      tx.auditLog.create.mock.calls as unknown as Array<
        [{ data: Record<string, unknown> }]
      >
    )[0][0];
    expect(auditInput.data.action).toBe('SALE_COMMISSION_VOIDED');
    expect(tx.saleCommission).not.toHaveProperty('delete');
  });

  it('uses bounded keyset pagination for the ledger', async () => {
    const rows = [
      commission({ id: 'commission-3', receivedAt: new Date('2026-08-03') }),
      commission({ id: 'commission-2', receivedAt: new Date('2026-08-02') }),
      commission({ id: 'commission-1', receivedAt: new Date('2026-08-01') }),
    ];
    const prisma = {
      saleCommission: { findMany: jest.fn().mockResolvedValue(rows) },
    };
    const result = await new SaleCommissionsService(prisma as never).list({
      limit: 2,
    });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toEqual(expect.any(String));
    expect(prisma.saleCommission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 }),
    );
  });
});
