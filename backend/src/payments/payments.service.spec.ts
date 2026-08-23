import { PaymentStatus, Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService owner attribution', () => {
  type PaymentMutationData = {
    propertyOwnerId: string | null;
    ownerCommissionRate: Prisma.Decimal;
    managementCommissionAmount: Prisma.Decimal;
    ownerProceedsAmount: Prisma.Decimal;
    paidAt: Date | null;
  };
  const input = {
    clientRequestId: '12345678-1234-4234-8234-123456789012',
    tenantId: 'tenant-1',
    leaseId: 'lease-1',
    unitId: 'unit-1',
    rentAmount: 2000,
    totalAmount: 2000,
    paidAmount: 2000,
    dueDate: new Date('2026-08-01'),
    status: PaymentStatus.PAID,
  };

  it('snapshots the owner and exact management split atomically on receipt', async () => {
    const created = {
      id: 'payment-1',
      ...input,
      paidAt: new Date('2026-08-22'),
      updatedAt: new Date('2026-08-22'),
      balanceDue: 0,
      tenant: {
        firstName: 'Terry',
        lastName: 'Tenant',
        email: 'tenant@example.com',
      },
    };
    const tx = {
      lease: { findFirst: jest.fn().mockResolvedValue({ id: 'lease-1' }) },
      unit: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'unit-1',
          property: {
            owner: {
              id: 'owner-1',
              commissionRate: new Prisma.Decimal('12.50'),
            },
          },
        }),
      },
      payment: { create: jest.fn().mockResolvedValue(created) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      payment: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const emails = { sendPaymentRecorded: jest.fn().mockResolvedValue({}) };

    await new PaymentsService(prisma as never, emails as never).recordPayment(
      input,
      'admin-1',
    );

    const data = (
      tx.payment.create.mock.calls as unknown as Array<
        [{ data: PaymentMutationData }]
      >
    )[0][0].data;
    expect(data.propertyOwnerId).toBe('owner-1');
    expect(data.ownerCommissionRate.toFixed(2)).toBe('12.50');
    expect(data.managementCommissionAmount.toFixed(2)).toBe('250.00');
    expect(data.ownerProceedsAmount.toFixed(2)).toBe('1750.00');
    expect(data.paidAt).toBeInstanceOf(Date);
    const auditData = (
      tx.auditLog.create.mock.calls as unknown as Array<
        [{ data: { action: string; resourceId: string } }]
      >
    )[0][0].data;
    expect(auditData.action).toBe('PAYMENT_RECORDED');
    expect(auditData.resourceId).toBe('payment-1');
  });

  it('keeps the historical owner and rate when a received payment is corrected', async () => {
    const paidAt = new Date('2026-08-10');
    const payment = {
      id: 'payment-1',
      tenantId: 'tenant-1',
      leaseId: 'lease-1',
      unitId: 'unit-1',
      totalAmount: 2000,
      paidAmount: 1800,
      balanceDue: 200,
      status: PaymentStatus.PARTIAL,
      paidAt,
      propertyOwnerId: 'owner-original',
      ownerCommissionRate: new Prisma.Decimal('10.00'),
      updatedAt: new Date('2026-08-20'),
      lastStatusRequestId: null,
      tenant: {
        firstName: 'Terry',
        lastName: 'Tenant',
        email: 'tenant@example.com',
      },
      unit: {
        property: {
          owner: {
            id: 'owner-new',
            commissionRate: new Prisma.Decimal('20.00'),
          },
        },
      },
    };
    const updated = {
      ...payment,
      paidAmount: 2000,
      status: PaymentStatus.PAID,
      updatedAt: new Date('2026-08-22'),
    };
    const tx = {
      payment: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updated),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      payment: { findUnique: jest.fn().mockResolvedValue(payment) },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const emails = { sendPaymentRecorded: jest.fn().mockResolvedValue({}) };

    await new PaymentsService(
      prisma as never,
      emails as never,
    ).updatePaymentStatus(
      'payment-1',
      {
        clientRequestId: '22345678-1234-4234-8234-123456789012',
        status: PaymentStatus.PAID,
        paidAmount: 2000,
      },
      'admin-1',
    );

    const data = (
      tx.payment.updateMany.mock.calls as unknown as Array<
        [{ data: PaymentMutationData }]
      >
    )[0][0].data;
    expect(data.propertyOwnerId).toBe('owner-original');
    expect(data.ownerCommissionRate.toFixed(2)).toBe('10.00');
    expect(data.managementCommissionAmount.toFixed(2)).toBe('200.00');
    expect(data.ownerProceedsAmount.toFixed(2)).toBe('1800.00');
    expect(data.paidAt).toBe(paidAt);
  });
});
