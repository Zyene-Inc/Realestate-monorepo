import { NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';

describe('TenantsService', () => {
  function serviceWith(prisma: object) {
    return new TenantsService(prisma as never);
  }

  function firstArgument(mock: { mock: { calls: unknown[][] } }): unknown {
    return mock.mock.calls[0]?.[0];
  }

  it('bounds and deterministically orders the admin tenant list', async () => {
    const rows = [{ id: 'tenant-1' }];
    const prisma = {
      tenant: { findMany: jest.fn().mockResolvedValue(rows) },
    };
    await expect(serviceWith(prisma).findAll()).resolves.toEqual(rows);
    expect(prisma.tenant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
        take: 250,
      }),
    );
  });

  it('returns the bounded admin detail view and rejects missing tenants', async () => {
    const tenant = { id: 'tenant-1' };
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(tenant)
      .mockResolvedValueOnce(null);
    const service = serviceWith({ tenant: { findUnique } });
    await expect(service.findOne(tenant.id)).resolves.toEqual(tenant);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(firstArgument(findUnique)).toMatchObject({
      where: { id: tenant.id },
      include: {
        payments: { orderBy: { dueDate: 'desc' }, take: 24 },
        maintenanceRequests: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 50,
        },
      },
    });
  });

  it('trims and audits tenant profile updates in one transaction', async () => {
    const current = { id: 'tenant-1', status: 'invited' };
    const updated = { ...current, status: 'active', firstName: 'Taylor' };
    const tx = {
      tenant: { update: jest.fn().mockResolvedValue(updated) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue(current) },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };

    await expect(
      serviceWith(prisma).update('admin-1', current.id, {
        firstName: ' Taylor ',
        lastName: ' Resident ',
        dateOfBirth: '1990-01-02',
        status: 'active',
      }),
    ).resolves.toEqual(updated);
    expect(firstArgument(tx.tenant.update)).toMatchObject({
      where: { id: current.id },
      data: {
        firstName: 'Taylor',
        lastName: 'Resident',
        dateOfBirth: new Date('1990-01-02'),
      },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'admin-1',
        action: 'TENANT_PROFILE_UPDATED',
        resource: 'tenant',
        resourceId: current.id,
        oldValue: JSON.stringify({ status: 'invited' }),
        newValue: JSON.stringify({ status: 'active' }),
      },
    });
  });

  it('returns bounded tenant dashboard data and rejects a missing profile', async () => {
    const tenant = { id: 'tenant-1' };
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(tenant)
      .mockResolvedValueOnce(null);
    const service = serviceWith({ tenant: { findUnique } });
    await expect(service.getDashboardData('user-1')).resolves.toEqual(tenant);
    await expect(service.getDashboardData('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(firstArgument(findUnique)).toMatchObject({
      where: { userId: 'user-1' },
      include: {
        maintenanceRequests: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 5,
        },
        payments: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
  });

  it('looks up only the signed-in tenant active lease', async () => {
    const lease = { id: 'lease-1' };
    const prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
      },
      lease: { findFirst: jest.fn().mockResolvedValue(lease) },
    };
    await expect(serviceWith(prisma).getActiveLease('user-1')).resolves.toEqual(
      lease,
    );
    expect(prisma.lease.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          status: { in: ['active', 'expiring', 'renewed'] },
        },
      }),
    );
  });

  it('does not expose lease data when the signed-in tenant profile is absent', async () => {
    const prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue(null) },
      lease: { findFirst: jest.fn() },
    };
    await expect(
      serviceWith(prisma).getActiveLease('missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.lease.findFirst).not.toHaveBeenCalled();
  });
});
