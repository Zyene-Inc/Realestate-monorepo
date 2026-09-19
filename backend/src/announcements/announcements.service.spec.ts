import { AnnouncementAudience, Role, UserStatus } from '@prisma/client';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';

const admin = {
  sub: 'admin-1',
  authUserId: 'auth-admin-1',
  email: 'admin@example.com',
  role: Role.TENANT_ADMIN,
  status: UserStatus.ACTIVE,
};

describe('AnnouncementsService', () => {
  function makeService(
    prisma: object,
    audit = { log: jest.fn() },
    notifications = {
      createForUsers: jest.fn().mockResolvedValue({ count: 0 }),
    },
  ) {
    return {
      service: new AnnouncementsService(
        prisma as never,
        audit as never,
        notifications as never,
      ),
      audit,
      notifications,
    };
  }

  it('lists only tenant notices visible to the signed-in resident', async () => {
    const rows = [
      {
        id: 'announcement-1',
        acknowledgements: [
          { acknowledgedAt: new Date('2026-09-16T12:00:00Z') },
        ],
      },
    ];
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
    ).resolves.toEqual([
      {
        id: 'announcement-1',
        acknowledgedAt: new Date('2026-09-16T12:00:00Z'),
      },
    ]);
    expect(prisma.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          audience: AnnouncementAudience.TENANT,
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

  it('rejects a unit notice when the selected property differs', async () => {
    const prisma = {
      unit: {
        findUnique: jest.fn().mockResolvedValue({
          propertyId: 'property-1',
          property: { listingType: 'RENT' },
        }),
      },
    };

    await expect(
      makeService(prisma).service.create(admin as never, {
        title: 'Water notice',
        content: 'Water will be unavailable tomorrow morning.',
        audience: AnnouncementAudience.TENANT,
        requiresAcknowledgement: false,
        propertyId: 'property-2',
        unitId: 'unit-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a tenant announcement, notifies visible residents, and records an audit event', async () => {
    const announcement = {
      id: 'announcement-1',
      title: 'Lobby update',
      content: 'The lobby will be cleaned at noon.',
      audience: AnnouncementAudience.TENANT,
      requiresAcknowledgement: true,
      propertyId: null,
      unitId: null,
    };
    const tx = {
      announcement: { create: jest.fn().mockResolvedValue(announcement) },
      tenant: {
        findMany: jest.fn().mockResolvedValue([{ userId: 'tenant-user-1' }]),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };
    const { service, notifications } = makeService(prisma);

    await expect(
      service.create(admin as never, {
        title: announcement.title,
        content: announcement.content,
        audience: AnnouncementAudience.TENANT,
        requiresAcknowledgement: true,
      }),
    ).resolves.toEqual(announcement);
    expect(notifications.createForUsers).toHaveBeenCalledWith(
      tx,
      ['tenant-user-1'],
      expect.objectContaining({ href: '/tenant/announcements' }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ANNOUNCEMENT_CREATED',
          resourceId: announcement.id,
        }),
      }),
    );
  });

  it('prevents a tenant administrator from publishing to agents', async () => {
    await expect(
      makeService({}).service.create(admin as never, {
        title: 'Sales update',
        content: 'Agent-only detail.',
        audience: AnnouncementAudience.AGENT,
        requiresAcknowledgement: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
