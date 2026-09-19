import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('marks only the current user’s unread notification as read', async () => {
    const prisma = {
      notification: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn(),
      },
    };
    const service = new NotificationsService(prisma as never);

    await expect(service.markRead('user-1', 'notice-1')).resolves.toEqual({
      id: 'notice-1',
    });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'notice-1', userId: 'user-1', isRead: false },
        data: expect.objectContaining({
          isRead: true,
          readAt: expect.any(Date),
        }),
      }),
    );
    expect(prisma.notification.findFirst).not.toHaveBeenCalled();
  });

  it('keeps an already-read notification idempotent for its owner', async () => {
    const prisma = {
      notification: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'notice-1', isRead: true }),
      },
    };

    await expect(
      new NotificationsService(prisma as never).markRead('user-1', 'notice-1'),
    ).resolves.toEqual({ id: 'notice-1' });
  });

  it('does not reveal another user’s notification', async () => {
    const prisma = {
      notification: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    await expect(
      new NotificationsService(prisma as never).markRead('user-1', 'notice-2'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
