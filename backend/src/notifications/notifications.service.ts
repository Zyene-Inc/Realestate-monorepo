import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type NotificationInput = {
  title: string;
  message: string;
  href?: string;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
      select: notificationSelect,
    });
  }

  async markRead(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    if (result.count === 0) {
      const existing = await this.prisma.notification.findFirst({
        where: { id, userId },
        select: { id: true, isRead: true },
      });
      if (!existing) throw new NotFoundException('Notification not found');
    }
    return { id };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  createForUsers(
    tx: Prisma.TransactionClient,
    userIds: readonly string[],
    notification: NotificationInput,
  ) {
    const recipients = [...new Set(userIds.filter(Boolean))];
    if (recipients.length === 0) return Promise.resolve({ count: 0 });
    return tx.notification.createMany({
      data: recipients.map((userId) => ({ userId, ...notification })),
    });
  }
}

const notificationSelect = {
  id: true,
  title: true,
  message: true,
  href: true,
  isRead: true,
  readAt: true,
  createdAt: true,
} as const;
