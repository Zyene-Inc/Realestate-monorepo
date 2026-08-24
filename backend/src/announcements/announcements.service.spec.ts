import { BadRequestException } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';

describe('AnnouncementsService', () => {
  function makeService(prisma: object, audit = { log: jest.fn() }) {
    return {
      service: new AnnouncementsService(prisma as never, audit as never),
      audit,
    };
  }

  it('lists only global, property, and unit announcements visible to the tenant', async () => {
    const rows = [{ id: 'announcement-1' }];
    const prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({
          unitId: 'unit-1',
          unit: { propertyId: 'property-1' },
        }),
      },
      announcement: { findMany: jest.fn().mockResolvedValue(rows) },
    };
    await expect(
      makeService(prisma).service.listForTenant('tenant-user'),
    ).resolves.toEqual(rows);
    expect(prisma.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { propertyId: null, unitId: null },
            { propertyId: 'property-1', unitId: null },
            { unitId: 'unit-1' },
          ],
        },
        take: 100,
      }),
    );
  });

  it('rejects a unit scoped announcement when the selected property differs', async () => {
    const prisma = {
      unit: {
        findUnique: jest.fn().mockResolvedValue({
          propertyId: 'property-1',
          property: { listingType: 'RENT' },
        }),
      },
      announcement: { create: jest.fn() },
    };
    await expect(
      makeService(prisma).service.create('admin-1', {
        title: 'Water notice',
        content: 'Water will be unavailable tomorrow morning.',
        propertyId: 'property-2',
        unitId: 'unit-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a global announcement and records an audit event', async () => {
    const announcement = { id: 'announcement-1', title: 'Lobby update' };
    const prisma = {
      announcement: { create: jest.fn().mockResolvedValue(announcement) },
    };
    const { service, audit } = makeService(prisma);
    await expect(
      service.create('admin-1', {
        title: 'Lobby update',
        content: 'The lobby will be cleaned at noon.',
      }),
    ).resolves.toEqual(announcement);
    expect(prisma.announcement.create).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ANNOUNCEMENT_CREATED',
        resourceId: announcement.id,
      }),
    );
  });
});
