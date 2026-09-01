import { BadRequestException } from '@nestjs/common';
import { OwnerExpenseEntryType, Prisma } from '@prisma/client';
import { MaintenanceExpenseLedgerService } from './maintenance-expense-ledger.service';

const completedRequest = {
  id: 'request-1',
  category: 'plumbing',
  status: 'completed',
  cost: new Prisma.Decimal('125.50'),
  completedAt: new Date('2026-08-24T20:00:00.000Z'),
  propertyId: 'property-1',
  unitId: 'unit-1',
  assignedVendorId: 'vendor-1',
  property: { ownerId: 'owner-1' },
};

describe('MaintenanceExpenseLedgerService', () => {
  it('posts the initial completed cost as an immutable owner charge', async () => {
    const tx = {
      ownerExpenseLedgerEntry: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'expense-1' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new MaintenanceExpenseLedgerService({} as never);

    await service.reconcile(tx as never, completedRequest, 'admin-1');

    const createData = (
      tx.ownerExpenseLedgerEntry.create.mock.calls as unknown as Array<
        [
          {
            data: {
              propertyOwnerId: string;
              maintenanceRequestId: string;
              entryType: OwnerExpenseEntryType;
              amount: Prisma.Decimal;
              postedByUserId: string;
            };
          },
        ]
      >
    )[0][0].data;
    expect(createData.propertyOwnerId).toBe('owner-1');
    expect(createData.maintenanceRequestId).toBe('request-1');
    expect(createData.entryType).toBe(OwnerExpenseEntryType.CHARGE);
    expect(createData.amount.toFixed(2)).toBe('125.50');
    expect(createData.postedByUserId).toBe('admin-1');
    const auditData = (
      tx.auditLog.create.mock.calls as unknown as Array<
        [{ data: { action: string; resourceId: string } }]
      >
    )[0][0].data;
    expect(auditData.action).toBe('OWNER_MAINTENANCE_EXPENSE_POSTED');
    expect(auditData.resourceId).toBe('expense-1');
  });

  it('posts a signed adjustment instead of rewriting an existing expense', async () => {
    const tx = {
      ownerExpenseLedgerEntry: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: new Prisma.Decimal('125.50') },
        }),
        findFirst: jest
          .fn()
          .mockResolvedValue({ propertyOwnerId: 'owner-original' }),
        create: jest.fn().mockResolvedValue({ id: 'expense-2' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new MaintenanceExpenseLedgerService({} as never);

    await service.reconcile(
      tx as never,
      { ...completedRequest, cost: new Prisma.Decimal('100.00') },
      'admin-1',
    );

    const adjustmentData = (
      tx.ownerExpenseLedgerEntry.create.mock.calls as unknown as Array<
        [
          {
            data: {
              propertyOwnerId: string;
              entryType: OwnerExpenseEntryType;
              amount: Prisma.Decimal;
            };
          },
        ]
      >
    )[0][0].data;
    expect(adjustmentData.propertyOwnerId).toBe('owner-original');
    expect(adjustmentData.entryType).toBe(OwnerExpenseEntryType.ADJUSTMENT);
    expect(adjustmentData.amount.toFixed(2)).toBe('-25.50');
  });

  it('blocks a positive completed cost until the property has an owner', async () => {
    const tx = {
      ownerExpenseLedgerEntry: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    const service = new MaintenanceExpenseLedgerService({} as never);

    await expect(
      service.reconcile(
        tx as never,
        { ...completedRequest, property: { ownerId: null } },
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.ownerExpenseLedgerEntry.create).not.toHaveBeenCalled();
  });

  it('reverses the posted total when a completed request is reopened', async () => {
    const tx = {
      ownerExpenseLedgerEntry: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: new Prisma.Decimal('125.50') },
        }),
        findFirst: jest
          .fn()
          .mockResolvedValue({ propertyOwnerId: 'owner-original' }),
        create: jest.fn().mockResolvedValue({ id: 'expense-3' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new MaintenanceExpenseLedgerService({} as never);

    await service.reconcile(
      tx as never,
      { ...completedRequest, status: 'in_progress', completedAt: null },
      'admin-1',
    );

    const reversal = (
      tx.ownerExpenseLedgerEntry.create.mock.calls as unknown as Array<
        [
          {
            data: {
              entryType: OwnerExpenseEntryType;
              amount: Prisma.Decimal;
              description: string;
            };
          },
        ]
      >
    )[0][0].data;
    expect(reversal.entryType).toBe(OwnerExpenseEntryType.ADJUSTMENT);
    expect(reversal.amount.toFixed(2)).toBe('-125.50');
    expect(reversal.description).toContain('reversal');
  });

  it('does not append a duplicate entry when the ledger already matches', async () => {
    const tx = {
      ownerExpenseLedgerEntry: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: new Prisma.Decimal('125.50') },
        }),
        findFirst: jest.fn().mockResolvedValue({ propertyOwnerId: 'owner-1' }),
        create: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    };
    const service = new MaintenanceExpenseLedgerService({} as never);

    await service.reconcile(tx as never, completedRequest, 'admin-1');

    expect(tx.ownerExpenseLedgerEntry.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
