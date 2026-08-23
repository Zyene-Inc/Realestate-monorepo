import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

type AuditCursor = { timestamp: string; id: string };

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  private encodeCursor(date: Date, id: string) {
    return Buffer.from(
      JSON.stringify({
        timestamp: date.toISOString(),
        id,
      } satisfies AuditCursor),
    ).toString('base64url');
  }

  private decodeCursor(cursor: string) {
    try {
      const parsed = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as Partial<AuditCursor>;
      const timestamp = new Date(parsed.timestamp ?? '');
      if (!parsed.id || Number.isNaN(timestamp.getTime())) throw new Error();
      return { timestamp, id: parsed.id };
    } catch {
      throw new BadRequestException('Invalid pagination cursor');
    }
  }

  private dateRange(from?: string, to?: string) {
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = new Date(from);
    if (to) {
      const upper = new Date(to);
      if (/^\d{4}-\d{2}-\d{2}$/.test(to))
        upper.setUTCDate(upper.getUTCDate() + 1);
      range.lt = upper;
    }
    if (range.gte && range.lt && range.gte >= range.lt) {
      throw new BadRequestException('The audit start must be before its end');
    }
    return Object.keys(range).length > 0 ? range : undefined;
  }

  private parseValue(value: string | null): unknown {
    if (!value) return null;
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed === 'string') {
        try {
          return JSON.parse(parsed) as unknown;
        } catch {
          return parsed;
        }
      }
      return parsed;
    } catch {
      return value;
    }
  }

  async list(query: AuditLogQueryDto) {
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined;
    const rows = await this.prisma.auditLog.findMany({
      where: {
        action: query.action,
        resource: query.resource,
        userId: query.actorUserId,
        createdAt: this.dateRange(query.from, query.to),
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.timestamp } },
                { createdAt: cursor.timestamp, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      include: { user: { select: { id: true, email: true, role: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const hasMore = rows.length > query.limit;
    const items = (hasMore ? rows.slice(0, query.limit) : rows).map((row) => ({
      ...row,
      oldValue: this.parseValue(row.oldValue),
      newValue: this.parseValue(row.newValue),
    }));
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        hasMore && last ? this.encodeCursor(last.createdAt, last.id) : null,
    };
  }

  async log(data: {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        oldValue: data.oldValue ? JSON.stringify(data.oldValue) : null,
        newValue: data.newValue ? JSON.stringify(data.newValue) : null,
        ipAddress: data.ipAddress,
      },
    });
  }
}
