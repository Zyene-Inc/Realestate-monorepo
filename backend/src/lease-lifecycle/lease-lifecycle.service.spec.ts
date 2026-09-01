import { LeaseRenewalStatus, NoticeToVacateStatus } from '@prisma/client';
import { LeaseLifecycleService } from './lease-lifecycle.service';

describe('LeaseLifecycleService', () => {
  it('locks the lease before rejecting a second active notice to vacate', async () => {
    const tx = {
      lease: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'lease-1',
          status: 'active',
          tenant: {
            id: 'tenant-1',
            email: 'tenant@example.com',
            firstName: 'Taylor',
            lastName: 'Tenant',
          },
          unit: {
            id: 'unit-1',
            property: { name: 'Oakwood' },
          },
          vacateNotices: [
            { id: 'notice-1', status: NoticeToVacateStatus.SUBMITTED },
          ],
          renewals: [],
        }),
      },
      noticeToVacate: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      $queryRaw: jest.fn(),
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const notifications = { vacateNoticeReceived: jest.fn() };
    const service = new LeaseLifecycleService(
      prisma as never,
      notifications as never,
    );

    await expect(
      service.createAdminNotice({ id: 'admin-1' } as never, 'lease-1', {
        noticeDate: '2099-01-01T00:00:00.000Z',
        plannedMoveOutDate: '2099-02-01T00:00:00.000Z',
        forwardingAddress: '100 Forwarding Street, Kansas City, MO',
      }),
    ).rejects.toThrow('This lease already has an active notice to vacate');
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.noticeToVacate.create).not.toHaveBeenCalled();
    expect(notifications.vacateNoticeReceived).not.toHaveBeenCalled();
  });

  it('rejects a notice while an open renewal offer exists', async () => {
    const tx = {
      lease: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'lease-1',
          status: 'active',
          tenant: { id: 'tenant-1' },
          unit: { id: 'unit-1', property: { name: 'Oakwood' } },
          vacateNotices: [],
          renewals: [{ id: 'renewal-1', status: LeaseRenewalStatus.SIGNING }],
        }),
      },
      noticeToVacate: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      $queryRaw: jest.fn(),
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const service = new LeaseLifecycleService(prisma as never, {} as never);

    await expect(
      service.createAdminNotice({ id: 'admin-1' } as never, 'lease-1', {
        noticeDate: '2099-01-01T00:00:00.000Z',
        plannedMoveOutDate: '2099-02-01T00:00:00.000Z',
        forwardingAddress: '100 Forwarding Street, Kansas City, MO',
      }),
    ).rejects.toThrow(
      'Cancel the open renewal offer before creating a notice to vacate',
    );
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.noticeToVacate.create).not.toHaveBeenCalled();
  });

  it('creates one notice, marks the lease expiring, and notifies the tenant', async () => {
    const lease = {
      id: 'lease-1',
      status: 'active',
      tenantId: 'tenant-1',
      unitId: 'unit-1',
      tenant: {
        id: 'tenant-1',
        email: 'tenant@example.com',
        firstName: 'Taylor',
        lastName: 'Tenant',
      },
      unit: {
        id: 'unit-1',
        property: { name: 'Oakwood' },
      },
      vacateNotices: [],
      renewals: [],
    };
    const tx = {
      lease: {
        findUnique: jest.fn().mockResolvedValue(lease),
        update: jest.fn(),
      },
      noticeToVacate: {
        create: jest.fn().mockResolvedValue({ id: 'notice-1' }),
      },
      auditLog: { create: jest.fn() },
      $queryRaw: jest.fn(),
    };
    const prisma = {
      lease: {
        findUnique: jest.fn().mockResolvedValue({ id: 'lease-1' }),
      },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const notifications = {
      vacateNoticeReceived: jest.fn(),
    };
    const service = new LeaseLifecycleService(
      prisma as never,
      notifications as never,
    );

    await service.createAdminNotice({ id: 'admin-1' } as never, 'lease-1', {
      noticeDate: '2099-01-01T00:00:00.000Z',
      plannedMoveOutDate: '2099-02-01T00:00:00.000Z',
      forwardingAddress: '100 Forwarding Street, Kansas City, MO',
    });

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    const createNotice = (
      tx.noticeToVacate.create.mock.calls as unknown as Array<
        [{ data: { leaseId: string; tenantId: string; unitId: string } }]
      >
    )[0][0];
    expect(createNotice.data).toMatchObject({
      leaseId: 'lease-1',
      tenantId: 'tenant-1',
      unitId: 'unit-1',
    });
    expect(tx.lease.update).toHaveBeenCalledWith({
      where: { id: 'lease-1' },
      data: { status: 'expiring' },
    });
    expect(notifications.vacateNoticeReceived).toHaveBeenCalledWith(
      'tenant@example.com',
      expect.objectContaining({ propertyName: 'Oakwood' }),
      'notice-1',
    );
  });

  it('rejects a move-out date before the notice date without opening a transaction', async () => {
    const prisma = { $transaction: jest.fn() };
    const service = new LeaseLifecycleService(prisma as never, {} as never);

    await expect(
      service.createAdminNotice({ id: 'admin-1' } as never, 'lease-1', {
        noticeDate: '2099-02-01T00:00:00.000Z',
        plannedMoveOutDate: '2099-01-01T00:00:00.000Z',
        forwardingAddress: '100 Forwarding Street, Kansas City, MO',
      }),
    ).rejects.toThrow('Move-out date cannot precede the notice date');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
