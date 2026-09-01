import { ConflictException } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';

describe('MaintenanceService tenant workflow', () => {
  const tenant = {
    id: 'tenant-1',
    unitId: 'unit-1',
    unit: { id: 'unit-1', propertyId: 'property-1' },
  };

  it('derives the unit and property from the signed-in tenant', async () => {
    const created = {
      id: 'request-1',
      category: 'plumbing',
      priority: 'high',
      photos: [],
      cost: null,
      expenseLedgerEntries: [],
      tenant: {
        firstName: 'Taylor',
        lastName: 'Resident',
        email: 'tenant@example.com',
      },
      unit: { unitNumber: '1A' },
      property: { name: 'Oakwood' },
      vendor: null,
    };
    const tx = {
      maintenanceRequest: { create: jest.fn().mockResolvedValue(created) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue(tenant) },
      maintenanceRequest: {
        findUnique: jest.fn().mockResolvedValue({
          ...created,
        }),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const service = new MaintenanceService(
      prisma as never,
      { get: jest.fn() } as never,
      { sendMaintenanceCreated: jest.fn() } as never,
      { reconcile: jest.fn() } as never,
    );

    await service.create('tenant-user', {
      category: 'plumbing',
      priority: 'high',
      description: 'Water is leaking beneath the kitchen sink.',
    });

    expect(tx.maintenanceRequest.create).toHaveBeenCalledWith({
      data: {
        category: 'plumbing',
        priority: 'high',
        description: 'Water is leaking beneath the kitchen sink.',
        preferredAccessTimes: undefined,
        tenantId: 'tenant-1',
        unitId: 'unit-1',
        propertyId: 'property-1',
        status: 'submitted',
        photos: [],
      },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        unit: { select: { id: true, unitNumber: true } },
        property: {
          select: { id: true, name: true, address: true, ownerId: true },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
            specialty: true,
          },
        },
        expenseLedgerEntries: { select: { amount: true } },
      },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'tenant-user',
        action: 'MAINTENANCE_REQUEST_CREATED',
        resource: 'maintenance_request',
        resourceId: 'request-1',
        newValue: JSON.stringify({ category: 'plumbing', priority: 'high' }),
      },
    });
  });

  it('requires management completion before tenant confirmation', async () => {
    const prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue(tenant) },
      maintenanceRequest: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'request-1',
          status: 'in_progress',
          photos: [],
        }),
      },
      $transaction: jest.fn(),
    };

    await expect(
      new MaintenanceService(
        prisma as never,
        { get: jest.fn() } as never,
        {} as never,
        { reconcile: jest.fn() } as never,
      ).confirmCompletion('tenant-user', 'request-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
