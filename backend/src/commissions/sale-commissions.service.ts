import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListingStatus,
  ListingType,
  Prisma,
  SaleCommissionEventType,
  SaleCommissionStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CorrectSaleCommissionDto,
  CreateSaleCommissionDto,
  EligibleSaleListingQueryDto,
  SaleCommissionListQueryDto,
  SaleCommissionReportQueryDto,
} from './dto/commission.dto';

const commissionInclude = {
  property: {
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      price: true,
      status: true,
    },
  },
  agent: {
    select: {
      id: true,
      companyName: true,
      contactName: true,
      email: true,
    },
  },
  recordedBy: { select: { id: true, email: true } },
  voidedBy: { select: { id: true, email: true } },
} satisfies Prisma.SaleCommissionInclude;

const commissionDetailInclude = {
  ...commissionInclude,
  events: {
    include: { actor: { select: { id: true, email: true } } },
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
  },
} satisfies Prisma.SaleCommissionInclude;

type LedgerCursor = { timestamp: string; id: string };

type MonthlyRevenueRow = {
  month: Date;
  commissionAmount: Prisma.Decimal;
  recordCount: bigint;
};

@Injectable()
export class SaleCommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  private money(value: string, label: string) {
    const amount = new Prisma.Decimal(value);
    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(`${label} must be greater than zero`);
    }
    return amount;
  }

  private optionalText(value: string | null | undefined) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private encodeCursor(date: Date, id: string) {
    return Buffer.from(
      JSON.stringify({
        timestamp: date.toISOString(),
        id,
      } satisfies LedgerCursor),
    ).toString('base64url');
  }

  private decodeCursor(cursor: string) {
    try {
      const parsed = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as Partial<LedgerCursor>;
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
      throw new BadRequestException('The report start must be before its end');
    }
    return Object.keys(range).length > 0 ? range : undefined;
  }

  private snapshot(commission: {
    salePrice: Prisma.Decimal | null;
    commissionAmount: Prisma.Decimal;
    receivedAt: Date;
    paymentMethod: string;
    referenceNumber: string | null;
    notes: string | null;
    status: SaleCommissionStatus;
  }): Prisma.InputJsonObject {
    return {
      salePrice: commission.salePrice?.toFixed(2) ?? null,
      commissionAmount: commission.commissionAmount.toFixed(2),
      receivedAt: commission.receivedAt.toISOString(),
      paymentMethod: commission.paymentMethod,
      referenceNumber: commission.referenceNumber,
      notes: commission.notes,
      status: commission.status,
    };
  }

  private requestFingerprint(data: CreateSaleCommissionDto) {
    return createHash('sha256')
      .update(
        JSON.stringify({
          propertyId: data.propertyId,
          salePrice: data.salePrice
            ? this.money(data.salePrice, 'Sale price').toFixed(2)
            : null,
          commissionAmount: this.money(
            data.commissionAmount,
            'Commission amount',
          ).toFixed(2),
          receivedAt: new Date(data.receivedAt).toISOString(),
          paymentMethod: data.paymentMethod,
          referenceNumber: this.optionalText(data.referenceNumber) ?? null,
          notes: this.optionalText(data.notes) ?? null,
        }),
      )
      .digest('hex');
  }

  async eligibleListings(query: EligibleSaleListingQueryDto) {
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined;
    const rows = await this.prisma.property.findMany({
      where: {
        listingType: ListingType.SALE,
        listingStatus: ListingStatus.APPROVED,
        status: 'sold',
        agentId: { not: null },
        ...(cursor
          ? {
              OR: [
                { updatedAt: { lt: cursor.timestamp } },
                { updatedAt: cursor.timestamp, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        price: true,
        updatedAt: true,
        agent: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        hasMore && last ? this.encodeCursor(last.updatedAt, last.id) : null,
    };
  }

  async list(query: SaleCommissionListQueryDto) {
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined;
    const receivedAt = this.dateRange(query.from, query.to);
    const where: Prisma.SaleCommissionWhereInput = {
      status: query.status,
      agentId: query.agentId,
      propertyId: query.propertyId,
      receivedAt,
      ...(cursor
        ? {
            OR: [
              { receivedAt: { lt: cursor.timestamp } },
              { receivedAt: cursor.timestamp, id: { lt: cursor.id } },
            ],
          }
        : {}),
    };
    const rows = await this.prisma.saleCommission.findMany({
      where,
      include: commissionInclude,
      orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        hasMore && last ? this.encodeCursor(last.receivedAt, last.id) : null,
    };
  }

  async get(id: string) {
    const record = await this.prisma.saleCommission.findUnique({
      where: { id },
      include: commissionDetailInclude,
    });
    if (!record) throw new NotFoundException('Sale commission not found');
    return record;
  }

  async create(userId: string, data: CreateSaleCommissionDto) {
    const requestFingerprint = this.requestFingerprint(data);
    const existing = await this.prisma.saleCommission.findUnique({
      where: { idempotencyKey: data.clientRequestId },
      include: commissionDetailInclude,
    });
    if (existing) {
      if (
        existing.requestFingerprint &&
        existing.requestFingerprint !== requestFingerprint
      ) {
        throw new ConflictException(
          'This commission request ID was already used with different details',
        );
      }
      return existing;
    }

    const salePrice = data.salePrice
      ? this.money(data.salePrice, 'Sale price')
      : null;
    const commissionAmount = this.money(
      data.commissionAmount,
      'Commission amount',
    );
    const referenceNumber = this.optionalText(data.referenceNumber) ?? null;
    const notes = this.optionalText(data.notes) ?? null;

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const property = await tx.property.findFirst({
            where: {
              id: data.propertyId,
              listingType: ListingType.SALE,
              listingStatus: ListingStatus.APPROVED,
              status: 'sold',
              agentId: { not: null },
            },
            select: { id: true, agentId: true },
          });
          if (!property?.agentId) {
            throw new ConflictException(
              'Commission can only be recorded for an approved sale listing marked sold',
            );
          }

          const created = await tx.saleCommission.create({
            data: {
              idempotencyKey: data.clientRequestId,
              requestFingerprint,
              propertyId: property.id,
              agentId: property.agentId,
              salePrice,
              commissionAmount,
              receivedAt: new Date(data.receivedAt),
              paymentMethod: data.paymentMethod,
              referenceNumber,
              notes,
              recordedByUserId: userId,
            },
            include: commissionInclude,
          });
          const snapshot = this.snapshot(created);
          await tx.saleCommissionEvent.create({
            data: {
              commissionId: created.id,
              actorUserId: userId,
              type: SaleCommissionEventType.CREATED,
              newValue: snapshot,
            },
          });
          await tx.auditLog.create({
            data: {
              userId,
              action: 'SALE_COMMISSION_CREATED',
              resource: 'sale_commission',
              resourceId: created.id,
              newValue: JSON.stringify({
                propertyId: created.propertyId,
                agentId: created.agentId,
                commissionAmount: created.commissionAmount.toFixed(2),
                paymentMethod: created.paymentMethod,
              }),
            },
          });
          return tx.saleCommission.findUniqueOrThrow({
            where: { id: created.id },
            include: commissionDetailInclude,
          });
        },
        { maxWait: 30_000, timeout: 30_000 },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicate = await this.prisma.saleCommission.findUniqueOrThrow({
          where: { idempotencyKey: data.clientRequestId },
          include: commissionDetailInclude,
        });
        if (
          duplicate.requestFingerprint &&
          duplicate.requestFingerprint !== requestFingerprint
        ) {
          throw new ConflictException(
            'This commission request ID was already used with different details',
          );
        }
        return duplicate;
      }
      throw error;
    }
  }

  async correct(userId: string, id: string, data: CorrectSaleCommissionDto) {
    const current = await this.prisma.saleCommission.findUnique({
      where: { id },
      include: commissionInclude,
    });
    if (!current) throw new NotFoundException('Sale commission not found');
    if (current.status === SaleCommissionStatus.VOIDED) {
      throw new ConflictException('A voided commission cannot be corrected');
    }

    const mutableFields = Object.keys(data).filter((key) => key !== 'reason');
    if (mutableFields.length === 0) {
      throw new BadRequestException('Add at least one field to correct');
    }

    const update: Prisma.SaleCommissionUpdateManyMutationInput = {
      salePrice:
        data.salePrice === undefined
          ? undefined
          : data.salePrice === null
            ? null
            : this.money(data.salePrice, 'Sale price'),
      commissionAmount:
        data.commissionAmount === undefined
          ? undefined
          : this.money(data.commissionAmount, 'Commission amount'),
      receivedAt:
        data.receivedAt === undefined ? undefined : new Date(data.receivedAt),
      paymentMethod: data.paymentMethod,
      referenceNumber: this.optionalText(data.referenceNumber),
      notes: this.optionalText(data.notes),
    };

    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.saleCommission.updateMany({
        where: {
          id,
          status: SaleCommissionStatus.ACTIVE,
          updatedAt: current.updatedAt,
        },
        data: update,
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          'Commission changed; refresh before correcting it',
        );
      }
      const corrected = await tx.saleCommission.findUniqueOrThrow({
        where: { id },
        include: commissionInclude,
      });
      const oldValue = this.snapshot(current);
      const newValue = this.snapshot(corrected);
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
        throw new BadRequestException(
          'The correction does not change the record',
        );
      }
      await tx.saleCommissionEvent.create({
        data: {
          commissionId: id,
          actorUserId: userId,
          type: SaleCommissionEventType.CORRECTED,
          oldValue,
          newValue,
          reason: data.reason.trim(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'SALE_COMMISSION_CORRECTED',
          resource: 'sale_commission',
          resourceId: id,
          oldValue: JSON.stringify(oldValue),
          newValue: JSON.stringify({ ...newValue, reason: data.reason.trim() }),
        },
      });
      return tx.saleCommission.findUniqueOrThrow({
        where: { id },
        include: commissionDetailInclude,
      });
    });
  }

  async voidCommission(userId: string, id: string, reason: string) {
    const current = await this.prisma.saleCommission.findUnique({
      where: { id },
      include: commissionInclude,
    });
    if (!current) throw new NotFoundException('Sale commission not found');
    if (current.status === SaleCommissionStatus.VOIDED) {
      throw new ConflictException('Sale commission is already voided');
    }
    const voidedAt = new Date();
    const cleanReason = reason.trim();

    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.saleCommission.updateMany({
        where: {
          id,
          status: SaleCommissionStatus.ACTIVE,
          updatedAt: current.updatedAt,
        },
        data: {
          status: SaleCommissionStatus.VOIDED,
          voidedAt,
          voidReason: cleanReason,
          voidedByUserId: userId,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          'Commission changed; refresh before voiding it',
        );
      }
      const voided = await tx.saleCommission.findUniqueOrThrow({
        where: { id },
        include: commissionInclude,
      });
      const oldValue = this.snapshot(current);
      const newValue = this.snapshot(voided);
      await tx.saleCommissionEvent.create({
        data: {
          commissionId: id,
          actorUserId: userId,
          type: SaleCommissionEventType.VOIDED,
          oldValue,
          newValue,
          reason: cleanReason,
        },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'SALE_COMMISSION_VOIDED',
          resource: 'sale_commission',
          resourceId: id,
          oldValue: JSON.stringify(oldValue),
          newValue: JSON.stringify({ ...newValue, reason: cleanReason }),
        },
      });
      return tx.saleCommission.findUniqueOrThrow({
        where: { id },
        include: commissionDetailInclude,
      });
    });
  }

  async report(query: SaleCommissionReportQueryDto) {
    const now = new Date();
    const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const defaultTo = now;
    const range = this.dateRange(
      query.from ?? defaultFrom.toISOString(),
      query.to ?? defaultTo.toISOString(),
    )!;
    const rangeStart = range.gte as Date;
    const rangeEnd = range.lt as Date;
    if (rangeEnd.getTime() - rangeStart.getTime() > 366 * 5 * 86400000) {
      throw new BadRequestException(
        'Revenue reports are limited to five years',
      );
    }

    const activeRangeWhere: Prisma.SaleCommissionWhereInput = {
      status: SaleCommissionStatus.ACTIVE,
      receivedAt: range,
    };
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

    const [
      rangeTotals,
      lifetimeTotals,
      monthTotals,
      yearTotals,
      voidedCount,
      agentGroups,
      paymentGroups,
      monthly,
    ] = await Promise.all([
      this.prisma.saleCommission.aggregate({
        where: activeRangeWhere,
        _sum: { commissionAmount: true, salePrice: true },
        _avg: { commissionAmount: true },
        _count: { _all: true },
      }),
      this.prisma.saleCommission.aggregate({
        where: { status: SaleCommissionStatus.ACTIVE },
        _sum: { commissionAmount: true },
        _count: { _all: true },
      }),
      this.prisma.saleCommission.aggregate({
        where: {
          status: SaleCommissionStatus.ACTIVE,
          receivedAt: { gte: monthStart, lt: now },
        },
        _sum: { commissionAmount: true },
      }),
      this.prisma.saleCommission.aggregate({
        where: {
          status: SaleCommissionStatus.ACTIVE,
          receivedAt: { gte: yearStart, lt: now },
        },
        _sum: { commissionAmount: true },
      }),
      this.prisma.saleCommission.count({
        where: { status: SaleCommissionStatus.VOIDED, receivedAt: range },
      }),
      this.prisma.saleCommission.groupBy({
        by: ['agentId'],
        where: activeRangeWhere,
        _sum: { commissionAmount: true },
        _count: { _all: true },
      }),
      this.prisma.saleCommission.groupBy({
        by: ['paymentMethod'],
        where: activeRangeWhere,
        _sum: { commissionAmount: true },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<MonthlyRevenueRow[]>(Prisma.sql`
        SELECT
          date_trunc('month', "receivedAt") AS "month",
          SUM("commissionAmount") AS "commissionAmount",
          COUNT(*) AS "recordCount"
        FROM "SaleCommission"
        WHERE "status" = CAST(${SaleCommissionStatus.ACTIVE} AS "SaleCommissionStatus")
          AND "receivedAt" >= ${rangeStart}
          AND "receivedAt" < ${rangeEnd}
        GROUP BY date_trunc('month', "receivedAt")
        ORDER BY "month" ASC
      `),
    ]);

    const agents = await this.prisma.agent.findMany({
      where: { id: { in: agentGroups.map((group) => group.agentId) } },
      select: { id: true, companyName: true, contactName: true },
    });
    const agentMap = new Map(agents.map((agent) => [agent.id, agent]));

    return {
      range: { from: rangeStart.toISOString(), to: rangeEnd.toISOString() },
      summary: {
        commissionAmount:
          rangeTotals._sum.commissionAmount?.toFixed(2) ?? '0.00',
        salePrice: rangeTotals._sum.salePrice?.toFixed(2) ?? '0.00',
        averageCommission:
          rangeTotals._avg.commissionAmount?.toFixed(2) ?? '0.00',
        recordCount: rangeTotals._count._all,
        voidedCount,
        lifetimeCommission:
          lifetimeTotals._sum.commissionAmount?.toFixed(2) ?? '0.00',
        lifetimeRecordCount: lifetimeTotals._count._all,
        monthToDate: monthTotals._sum.commissionAmount?.toFixed(2) ?? '0.00',
        yearToDate: yearTotals._sum.commissionAmount?.toFixed(2) ?? '0.00',
      },
      byAgent: agentGroups
        .map((group) => ({
          agent: agentMap.get(group.agentId),
          commissionAmount: group._sum.commissionAmount?.toFixed(2) ?? '0.00',
          recordCount: group._count._all,
        }))
        .sort(
          (left, right) =>
            Number(right.commissionAmount) - Number(left.commissionAmount),
        ),
      byPaymentMethod: paymentGroups
        .map((group) => ({
          paymentMethod: group.paymentMethod,
          commissionAmount: group._sum.commissionAmount?.toFixed(2) ?? '0.00',
          recordCount: group._count._all,
        }))
        .sort(
          (left, right) =>
            Number(right.commissionAmount) - Number(left.commissionAmount),
        ),
      monthly: monthly.map((row) => ({
        month: row.month.toISOString(),
        commissionAmount: row.commissionAmount.toFixed(2),
        recordCount: Number(row.recordCount),
      })),
    };
  }
}
