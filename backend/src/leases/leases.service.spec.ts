import { ConflictException } from '@nestjs/common';
import { LeasesService } from './leases.service';

describe('LeasesService rental occupancy synchronization', () => {
  const data = {
    tenantId: 'tenant-1',
    unitId: 'unit-1',
    startDate: '2026-09-01T00:00:00.000Z',
    endDate: '2027-08-31T00:00:00.000Z',
    monthlyRent: 1500,
    securityDeposit: 1500,
  };

  it('blocks a second active lease for the same unit', async () => {
    const prisma = {
      tenant: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'tenant-1', unitId: null }),
      },
      unit: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'unit-1', status: 'vacant' }),
      },
      lease: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'existing-lease' }),
      },
      $transaction: jest.fn(),
    };

    await expect(
      new LeasesService(prisma as never, {} as never).create('admin-1', data),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates the lease, assigns the tenant, and occupies the unit atomically', async () => {
    const lease = {
      id: 'lease-1',
      ...data,
      tenantId: 'tenant-1',
      unitId: 'unit-1',
      status: 'active',
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      tenant: {
        firstName: 'Taylor',
        lastName: 'Resident',
        email: 'tenant@example.com',
      },
      unit: {
        unitNumber: '1A',
        property: {
          name: 'Oakwood',
          owner: { id: 'owner-1', commissionRate: { toString: () => '10' } },
        },
      },
    };
    const emails = {
      sendLeaseCreated: jest.fn().mockResolvedValue({}),
      sendMoveInChargesPosted: jest.fn().mockResolvedValue({}),
    };
    const tx = {
      lease: { create: jest.fn().mockResolvedValue(lease) },
      tenant: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      unit: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      moveInCharge: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      moveInInspection: {
        create: jest.fn().mockResolvedValue({ id: 'inspection-1' }),
      },
    };
    const prisma = {
      tenant: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'tenant-1', unitId: null }),
      },
      unit: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'unit-1', status: 'vacant' }),
      },
      lease: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };

    await expect(
      new LeasesService(prisma as never, emails as never).create(
        'admin-1',
        data,
      ),
    ).resolves.toEqual(lease);
    expect(tx.tenant.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'tenant-1',
        OR: [{ unitId: null }, { unitId: 'unit-1' }],
      },
      data: { unitId: 'unit-1', status: 'active' },
    });
    expect(tx.unit.updateMany).toHaveBeenCalledWith({
      where: { id: 'unit-1', status: 'vacant' },
      data: { status: 'occupied', availableDate: null },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'admin-1',
        action: 'RENTAL_LEASE_CREATED',
        resource: 'lease',
        resourceId: 'lease-1',
        newValue: JSON.stringify({
          tenantId: 'tenant-1',
          unitId: 'unit-1',
          moveInChargesPosted: 2,
          moveInInspectionId: 'inspection-1',
        }),
      },
    });
    const moveInRows = (
      tx.moveInCharge.createMany.mock.calls as unknown as Array<
        [{ data: Array<{ category: string }> }]
      >
    )[0][0].data;
    expect(moveInRows.map((row) => row.category)).toEqual([
      'FIRST_MONTH_RENT',
      'SECURITY_DEPOSIT',
    ]);
    expect(emails.sendMoveInChargesPosted).toHaveBeenCalledTimes(1);
    expect(tx.moveInInspection.create).toHaveBeenCalledTimes(1);
  });

  it('reserves a unit without activating occupancy before signature', async () => {
    const pending = {
      id: 'lease-pending',
      tenantId: 'tenant-1',
      unitId: 'unit-1',
      status: 'pending_signature',
    };
    const tx = {
      $queryRaw: jest.fn(),
      rentalApplication: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'application-1',
          propertyId: 'property-1',
          status: 'APPROVED',
        }),
      },
      tenant: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'tenant-1', unitId: 'unit-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      unit: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'unit-1',
          propertyId: 'property-1',
          status: 'vacant',
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      lease: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(pending),
      },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };

    await expect(
      new LeasesService(
        prisma as never,
        {} as never,
      ).createPendingFromApplication('admin-1', 'application-1', 'tenant-1', {
        ...data,
        rentDueDay: 1,
        gracePeriodDays: 5,
        lateFeeAmount: 50,
      }),
    ).resolves.toEqual(pending);
    expect(tx.unit.updateMany).toHaveBeenCalledWith({
      where: { id: 'unit-1', status: 'vacant' },
      data: { status: 'reserved', availableDate: null },
    });
    expect(tx.tenant.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'tenant-1',
        OR: [{ unitId: null }, { unitId: 'unit-1' }],
      },
      data: { unitId: 'unit-1', status: 'invited' },
    });
    expect(tx.lease.create).toHaveBeenCalledTimes(1);
  });
});
