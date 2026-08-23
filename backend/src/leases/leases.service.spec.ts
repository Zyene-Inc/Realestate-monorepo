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
        property: { name: 'Oakwood' },
      },
    };
    const emails = { sendLeaseCreated: jest.fn().mockResolvedValue({}) };
    const tx = {
      lease: { create: jest.fn().mockResolvedValue(lease) },
      tenant: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      unit: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
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
        newValue: JSON.stringify({ tenantId: 'tenant-1', unitId: 'unit-1' }),
      },
    });
  });
});
