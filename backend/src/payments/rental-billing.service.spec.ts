import { PaymentStatus } from '@prisma/client';
import { RentalBillingService } from './rental-billing.service';

describe('RentalBillingService', () => {
  const tenant = {
    id: 'tenant-1',
    firstName: 'Terry',
    lastName: 'Tenant',
    email: 'terry@example.com',
  };

  it('creates one idempotent monthly charge and never starts a checkout', async () => {
    const lease = {
      id: 'lease-1',
      tenantId: tenant.id,
      unitId: 'unit-1',
      monthlyRent: 1800,
      rentDueDay: 1,
      gracePeriodDays: 5,
      lateFeeAmount: 50,
      startDate: new Date('2026-08-01T00:00:00.000Z'),
      tenant,
    };
    const created = {
      id: 'payment-1',
      tenant,
      lease,
      totalAmount: 1800,
      dueDate: new Date('2026-08-01T00:00:00.000Z'),
    };
    const tx = {
      payment: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'payment-1' }),
        create: jest.fn().mockResolvedValue(created),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      lease: { findMany: jest.fn().mockResolvedValue([lease]) },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const emails = {
      sendRentReminder: jest.fn().mockResolvedValue({}),
      sendLateNotice: jest.fn().mockResolvedValue({}),
    };
    const service = new RentalBillingService(prisma as never, emails as never);

    const first = await service.runDailyBillingCycle(
      'admin-1',
      new Date('2026-08-01T08:13:00.000Z'),
    );
    const second = await service.runDailyBillingCycle(
      'admin-1',
      new Date('2026-08-01T08:14:00.000Z'),
    );

    expect(first).toMatchObject({
      billingPeriod: '2026-08-01',
      createdCharges: 1,
      markedOverdue: 0,
    });
    expect(second.createdCharges).toBe(0);
    const createCalls = tx.payment.create.mock.calls as unknown as Array<
      [
        {
          data: {
            billingPeriod: Date;
            dueDate: Date;
            status: PaymentStatus;
            balanceDue: number;
          };
        },
      ]
    >;
    expect(createCalls[0][0].data).toMatchObject({
      billingPeriod: new Date('2026-08-01T00:00:00.000Z'),
      dueDate: new Date('2026-08-01T00:00:00.000Z'),
      status: PaymentStatus.PENDING,
      balanceDue: 1800,
    });
    expect(emails.sendRentReminder).toHaveBeenCalledTimes(1);
  });

  it('marks a genuinely late balance overdue once and applies the lease fee', async () => {
    const lease = { gracePeriodDays: 5, lateFeeAmount: 50 };
    const payment = {
      id: 'payment-1',
      status: PaymentStatus.PENDING,
      balanceDue: 1800,
      rentAmount: 1800,
      lateFee: 0,
      totalAmount: 1800,
      paidAmount: 0,
      dueDate: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-05T00:00:00.000Z'),
      tenant,
      lease,
    };
    const overdue = {
      ...payment,
      status: PaymentStatus.OVERDUE,
      lateFee: 50,
      totalAmount: 1850,
      balanceDue: 1850,
    };
    const tx = {
      payment: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(overdue),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      lease: { findMany: jest.fn().mockResolvedValue([]) },
      payment: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([payment])
          .mockResolvedValueOnce([{ ...overdue }]),
      },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const emails = {
      sendRentReminder: jest.fn().mockResolvedValue({}),
      sendLateNotice: jest.fn().mockResolvedValue({}),
    };
    const service = new RentalBillingService(prisma as never, emails as never);

    const first = await service.runDailyBillingCycle(
      undefined,
      new Date('2026-08-06T00:00:00.000Z'),
    );
    const second = await service.runDailyBillingCycle(
      undefined,
      new Date('2026-08-06T08:13:00.000Z'),
    );

    expect(first).toMatchObject({ markedOverdue: 1, lateFeesApplied: 1 });
    expect(second).toMatchObject({ markedOverdue: 0, lateFeesApplied: 0 });
    const updateCalls = tx.payment.updateMany.mock.calls as unknown as Array<
      [
        {
          data: {
            status: PaymentStatus;
            lateFee: number;
            totalAmount: number;
            balanceDue: number;
          };
        },
      ]
    >;
    expect(updateCalls[0][0].data).toMatchObject({
      status: PaymentStatus.OVERDUE,
      lateFee: 50,
      totalAmount: 1850,
      balanceDue: 1850,
    });
    expect(emails.sendLateNotice).toHaveBeenCalledTimes(1);
  });
});
