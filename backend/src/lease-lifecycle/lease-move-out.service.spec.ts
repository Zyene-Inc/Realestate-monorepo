import { BadRequestException } from '@nestjs/common';
import { MoveOutInspectionStatus, MoveOutTurnoverStatus } from '@prisma/client';
import { LeaseMoveOutService } from './lease-move-out.service';

describe('LeaseMoveOutService', () => {
  const actor = {
    id: 'admin-1',
    role: 'TENANT_ADMIN',
    email: 'admin@example.com',
  } as never;

  it('never releases occupancy before keys are returned', async () => {
    const prisma = { moveOutInspection: { findUnique: jest.fn() } };
    const service = new LeaseMoveOutService(prisma as never, {} as never);

    await expect(
      service.completeInspection(actor, 'inspection-1', {
        expectedRevision: 1,
        actualMoveOutAt: '2026-08-24T12:00:00.000Z',
        turnoverStatus: MoveOutTurnoverStatus.READY_TO_RENT,
        keysReturned: false,
        forwardingAddress: '100 Forwarding Street, Kansas City, MO',
        items: [{ id: 'item-1', condition: 'GOOD', estimatedCost: 0 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.moveOutInspection.findUnique).not.toHaveBeenCalled();
  });

  it('rejects duplicate checklist IDs that omit another inspection item', async () => {
    const prisma = {
      moveOutInspection: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inspection-1',
          status: MoveOutInspectionStatus.SCHEDULED,
          items: [{ id: 'item-1' }, { id: 'item-2' }],
        }),
      },
      $transaction: jest.fn(),
    };
    const service = new LeaseMoveOutService(prisma as never, {} as never);

    await expect(
      service.completeInspection(actor, 'inspection-1', {
        expectedRevision: 1,
        actualMoveOutAt: '2026-08-24T12:00:00.000Z',
        turnoverStatus: MoveOutTurnoverStatus.READY_TO_RENT,
        keysReturned: true,
        forwardingAddress: '100 Forwarding Street, Kansas City, MO',
        items: [
          { id: 'item-1', condition: 'GOOD', estimatedCost: 0 },
          { id: 'item-1', condition: 'GOOD', estimatedCost: 0 },
        ],
      }),
    ).rejects.toThrow('Submit the complete current inspection checklist');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('terminates the lease and releases the unit in the completed inspection transaction', async () => {
    const inspection = {
      id: 'inspection-1',
      noticeId: 'notice-1',
      leaseId: 'lease-1',
      tenantId: 'tenant-1',
      unitId: 'unit-1',
      status: MoveOutInspectionStatus.SCHEDULED,
      items: [{ id: 'item-1' }],
    };
    const tx = {
      moveOutInspection: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      moveOutInspectionItem: { update: jest.fn() },
      moveInCharge: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ paidAmount: 1200, refundedAmount: 0 }),
      },
      securityDepositDisposition: { create: jest.fn() },
      noticeToVacate: { update: jest.fn() },
      lease: { update: jest.fn() },
      tenant: { updateMany: jest.fn() },
      unit: { update: jest.fn() },
      auditLog: { create: jest.fn() },
      $queryRaw: jest.fn(),
    };
    const prisma = {
      moveOutInspection: {
        findUnique: jest.fn().mockResolvedValue(inspection),
      },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<void>) => callback(tx),
      ),
    };
    const lifecycle = {
      getLease: jest.fn().mockResolvedValue({ id: 'lease-1' }),
    };
    const service = new LeaseMoveOutService(
      prisma as never,
      lifecycle as never,
    );

    await service.completeInspection(actor, inspection.id, {
      expectedRevision: 1,
      actualMoveOutAt: '2026-08-24T12:00:00.000Z',
      turnoverStatus: MoveOutTurnoverStatus.MAINTENANCE_REQUIRED,
      keysReturned: true,
      forwardingAddress: '100 Forwarding Street, Kansas City, MO',
      items: [
        {
          id: 'item-1',
          condition: 'DAMAGED',
          notes: 'Wall damage',
          estimatedCost: 250,
        },
      ],
    });

    expect(tx.lease.update).toHaveBeenCalledWith({
      where: { id: 'lease-1' },
      data: { status: 'terminated' },
    });
    expect(tx.tenant.updateMany).toHaveBeenCalledWith({
      where: { id: 'tenant-1', unitId: 'unit-1' },
      data: { unitId: null, status: 'inactive' },
    });
    expect(tx.unit.update).toHaveBeenCalledWith({
      where: { id: 'unit-1' },
      data: { status: 'under maintenance', availableDate: null },
    });
    const create = (
      tx.securityDepositDisposition.create.mock.calls as unknown as Array<
        [{ data: { amountHeld: unknown; refundAmount: unknown } }]
      >
    )[0][0];
    expect(create.data.amountHeld).toBeDefined();
    expect(create.data.refundAmount).toBeDefined();
  });
});
