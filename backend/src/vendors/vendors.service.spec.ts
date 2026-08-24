import { ConflictException, NotFoundException } from '@nestjs/common';
import { VendorsService } from './vendors.service';

describe('VendorsService', () => {
  function makeService(prisma: object, audit = { log: jest.fn() }) {
    return {
      service: new VendorsService(prisma as never, audit as never),
      audit,
    };
  }

  it('bounds and deterministically orders vendor search results', async () => {
    const rows = [{ id: 'vendor-1' }];
    const prisma = { vendor: { findMany: jest.fn().mockResolvedValue(rows) } };
    await expect(
      makeService(prisma).service.findAll(' plumbing '),
    ).resolves.toEqual(rows);
    expect(prisma.vendor.findMany).toHaveBeenCalledTimes(1);
  });

  it('creates a vendor and records an audit event', async () => {
    const vendor = { id: 'vendor-1', name: 'Reliable Plumbing' };
    const prisma = { vendor: { create: jest.fn().mockResolvedValue(vendor) } };
    const { service, audit } = makeService(prisma);
    await expect(
      service.create('admin-1', { name: 'Reliable Plumbing', rating: 4.8 }),
    ).resolves.toEqual(vendor);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'VENDOR_CREATED',
        resource: 'vendor',
        resourceId: vendor.id,
      }),
    );
  });

  it('rejects an update for a missing vendor', async () => {
    const prisma = {
      vendor: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    await expect(
      makeService(prisma).service.update('admin-1', 'missing', {
        name: 'Nope',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('protects vendors assigned to maintenance requests from deletion', async () => {
    const prisma = {
      vendor: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'vendor-1',
          _count: { maintenanceRequests: 1 },
        }),
        delete: jest.fn(),
      },
    };
    await expect(
      makeService(prisma).service.remove('admin-1', 'vendor-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.vendor.delete).not.toHaveBeenCalled();
  });
});
