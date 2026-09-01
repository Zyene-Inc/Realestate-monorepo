import {
  Prisma,
  SecurityDepositDeductionCategory,
  SecurityDepositDispositionStatus,
} from '@prisma/client';
import { LeaseDepositService } from './lease-deposit.service';

describe('LeaseDepositService', () => {
  it('uses the disposition request ID as the zero-dollar return idempotency marker', async () => {
    const requestId = '243b504d-2d96-4c4c-8ee8-5026406fdb37';
    const disposition = {
      id: 'deposit-1',
      leaseId: 'lease-1',
      tenantId: 'tenant-1',
      unitId: 'unit-1',
      status: SecurityDepositDispositionStatus.ITEMIZED,
      issueRequestId: null,
      refundAmount: new Prisma.Decimal(0),
    };
    const tx = {
      securityDepositLedgerEntry: { create: jest.fn() },
      securityDepositDisposition: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(disposition)
          .mockResolvedValueOnce(null),
        update: jest.fn(),
      },
      auditLog: { create: jest.fn() },
      $queryRaw: jest.fn(),
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<void>) => callback(tx),
      ),
    };
    const lifecycle = {
      getLease: jest.fn().mockResolvedValue({ id: 'lease-1' }),
    };
    const service = new LeaseDepositService(
      prisma as never,
      {} as never,
      lifecycle as never,
    );

    await service.issue({ id: 'admin-1' } as never, disposition.id, {
      returnMethod: 'CHECK',
      returnReference: 'check-100',
      requestId,
    });

    expect(tx.securityDepositLedgerEntry.create).not.toHaveBeenCalled();
    const update = (
      tx.securityDepositDisposition.update.mock.calls as unknown as Array<
        [
          {
            where: { id: string };
            data: {
              issueRequestId: string;
              status: SecurityDepositDispositionStatus;
            };
          },
        ]
      >
    )[0][0];
    expect(update.where.id).toBe(disposition.id);
    expect(update.data.issueRequestId).toBe(requestId);
    expect(update.data.status).toBe(SecurityDepositDispositionStatus.ISSUED);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('returns the existing result when the same request ID is retried', async () => {
    const requestId = '243b504d-2d96-4c4c-8ee8-5026406fdb37';
    const tx = {
      securityDepositDisposition: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'deposit-1',
          leaseId: 'lease-1',
          status: SecurityDepositDispositionStatus.ISSUED,
          issueRequestId: requestId,
        }),
      },
      securityDepositLedgerEntry: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      $queryRaw: jest.fn(),
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<string>) =>
          callback(tx),
      ),
    };
    const lifecycle = {
      getLease: jest.fn().mockResolvedValue({ id: 'lease-1' }),
    };
    const service = new LeaseDepositService(
      prisma as never,
      {} as never,
      lifecycle as never,
    );

    await service.issue({ id: 'admin-1' } as never, 'deposit-1', {
      returnMethod: 'CHECK',
      returnReference: 'check-100',
      requestId,
    });

    expect(tx.securityDepositLedgerEntry.create).not.toHaveBeenCalled();
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(lifecycle.getLease).toHaveBeenCalledWith('lease-1');
  });

  it('locks and re-reads the disposition before validating a new deduction', async () => {
    const tx = {
      securityDepositDisposition: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'deposit-1',
          leaseId: 'lease-1',
          status: SecurityDepositDispositionStatus.DRAFT,
          amountHeld: new Prisma.Decimal(500),
          deductions: [{ amount: new Prisma.Decimal(450) }],
        }),
        update: jest.fn(),
      },
      securityDepositDeduction: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      $queryRaw: jest.fn(),
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<string>) =>
          callback(tx),
      ),
    };
    const service = new LeaseDepositService(
      prisma as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.addDeduction({ id: 'admin-1' } as never, 'deposit-1', {
        category: SecurityDepositDeductionCategory.DAMAGE,
        description: 'Wall repair',
        amount: 100,
      }),
    ).rejects.toThrow(
      'Deductions cannot exceed the verified security deposit held',
    );
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.securityDepositDeduction.create).not.toHaveBeenCalled();
  });
});
