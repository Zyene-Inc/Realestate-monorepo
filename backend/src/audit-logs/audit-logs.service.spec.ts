import { BadRequestException } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsService', () => {
  it('returns parsed events with bounded keyset pagination', async () => {
    const rows = [
      {
        id: 'event-3',
        userId: 'user-1',
        action: 'SALE_LISTING_APPROVED',
        resource: 'property',
        resourceId: 'property-1',
        oldValue: '{"status":"PENDING_REVIEW"}',
        newValue: '"{\\"status\\":\\"APPROVED\\"}"',
        ipAddress: null,
        createdAt: new Date('2026-08-03T00:00:00.000Z'),
        user: { id: 'user-1', email: 'admin@example.com', role: 'SUPER_ADMIN' },
      },
      {
        id: 'event-2',
        userId: null,
        action: 'EMAIL_DELIVERED',
        resource: 'email',
        resourceId: 'email-1',
        oldValue: null,
        newValue: null,
        ipAddress: null,
        createdAt: new Date('2026-08-02T00:00:00.000Z'),
        user: null,
      },
      {
        id: 'event-1',
        userId: null,
        action: 'EMAIL_SENT',
        resource: 'email',
        resourceId: 'email-1',
        oldValue: null,
        newValue: null,
        ipAddress: null,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        user: null,
      },
    ];
    const prisma = {
      auditLog: { findMany: jest.fn().mockResolvedValue(rows) },
    };
    const result = await new AuditLogsService(prisma as never).list({
      limit: 2,
      action: 'SALE_LISTING_APPROVED',
      from: '2026-08-01',
      to: '2026-08-31',
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].oldValue).toEqual({ status: 'PENDING_REVIEW' });
    expect(result.items[0].newValue).toEqual({ status: 'APPROVED' });
    expect(result.nextCursor).toEqual(expect.any(String));
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 }),
    );
  });

  it('rejects malformed cursors', async () => {
    const service = new AuditLogsService({} as never);
    await expect(
      service.list({ limit: 25, cursor: 'broken' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
