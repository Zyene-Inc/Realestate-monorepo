import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AgentAccountStatus,
  ListingStatus,
  ListingType,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  PublishStatus,
  SaleCommissionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OwnerReportQueryDto, ReportQueryDto } from './dto/report-query.dto';

type OwnerCursor = { timestamp: string; id: string };

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private money(value: Prisma.Decimal | number | null | undefined) {
    if (value == null) return '0.00';
    return new Prisma.Decimal(value.toString()).toFixed(2);
  }

  private encodeCursor(date: Date, id: string) {
    return Buffer.from(
      JSON.stringify({
        timestamp: date.toISOString(),
        id,
      } satisfies OwnerCursor),
    ).toString('base64url');
  }

  private decodeCursor(cursor: string) {
    try {
      const parsed = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as Partial<OwnerCursor>;
      const timestamp = new Date(parsed.timestamp ?? '');
      if (!parsed.id || Number.isNaN(timestamp.getTime())) throw new Error();
      return { timestamp, id: parsed.id };
    } catch {
      throw new BadRequestException('Invalid pagination cursor');
    }
  }

  private reportRange(query: ReportQueryDto) {
    const now = new Date();
    const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const from = new Date(query.from ?? defaultFrom.toISOString());
    const to = new Date(query.to ?? now.toISOString());
    if (query.to && /^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
      to.setUTCDate(to.getUTCDate() + 1);
    }
    if (from >= to) {
      throw new BadRequestException('The report start must be before its end');
    }
    if (to.getTime() - from.getTime() > 366 * 5 * 86400000) {
      throw new BadRequestException('Reports are limited to five years');
    }
    return { from, to, filter: { gte: from, lt: to } };
  }

  async overview(query: ReportQueryDto) {
    const range = this.reportRange(query);
    const receivedWhere: Prisma.PaymentWhereInput = {
      purpose: PaymentPurpose.RENT,
      status: { in: [PaymentStatus.PAID, PaymentStatus.PARTIAL] },
      paidAmount: { gt: 0 },
      paidAt: range.filter,
    };
    const auditWhere: Prisma.AuditLogWhereInput = {
      createdAt: range.filter,
    };
    const [
      pendingAgents,
      pendingListings,
      pendingAgentItems,
      pendingListingItems,
      rentalProperties,
      publishedRentals,
      unassignedRentals,
      unitGroups,
      rentTotals,
      unassignedRentTotals,
      moveInTotals,
      maintenanceExpenseTotals,
      saleTotals,
      auditEventCount,
      auditActorGroups,
      systemAuditEventCount,
    ] = await Promise.all([
      this.prisma.agent.count({
        where: { accountStatus: AgentAccountStatus.PENDING },
      }),
      this.prisma.property.count({
        where: {
          listingType: ListingType.SALE,
          listingStatus: ListingStatus.PENDING_REVIEW,
        },
      }),
      this.prisma.agent.findMany({
        where: { accountStatus: AgentAccountStatus.PENDING },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 5,
      }),
      this.prisma.property.findMany({
        where: {
          listingType: ListingType.SALE,
          listingStatus: ListingStatus.PENDING_REVIEW,
        },
        select: {
          id: true,
          name: true,
          address: true,
          submittedAt: true,
          agent: { select: { companyName: true, contactName: true } },
        },
        orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
        take: 5,
      }),
      this.prisma.property.count({ where: { listingType: ListingType.RENT } }),
      this.prisma.property.count({
        where: {
          listingType: ListingType.RENT,
          publishStatus: PublishStatus.PUBLISHED,
        },
      }),
      this.prisma.property.count({
        where: { listingType: ListingType.RENT, ownerId: null },
      }),
      this.prisma.unit.groupBy({
        by: ['status'],
        where: { property: { listingType: ListingType.RENT } },
        _count: { _all: true },
      }),
      this.prisma.payment.aggregate({
        where: receivedWhere,
        _sum: {
          paidAmount: true,
          refundedAmount: true,
          managementCommissionAmount: true,
          ownerProceedsAmount: true,
        },
        _count: { _all: true },
      }),
      this.prisma.payment.aggregate({
        where: { ...receivedWhere, propertyOwnerId: null },
        _sum: { paidAmount: true },
        _count: { _all: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          ...receivedWhere,
          purpose: PaymentPurpose.MOVE_IN,
        },
        _sum: {
          paidAmount: true,
          refundedAmount: true,
          managementCommissionAmount: true,
          ownerProceedsAmount: true,
        },
        _count: { _all: true },
      }),
      this.prisma.ownerExpenseLedgerEntry.aggregate({
        where: { occurredAt: range.filter },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.saleCommission.aggregate({
        where: {
          status: SaleCommissionStatus.ACTIVE,
          receivedAt: range.filter,
        },
        _sum: { commissionAmount: true },
        _count: { _all: true },
      }),
      this.prisma.auditLog.count({ where: auditWhere }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { ...auditWhere, userId: { not: null } },
      }),
      this.prisma.auditLog.count({
        where: { ...auditWhere, userId: null },
      }),
    ]);

    const unitCounts = new Map(
      unitGroups.map((group) => [group.status, group._count._all]),
    );
    const totalUnits = unitGroups.reduce(
      (total, group) => total + group._count._all,
      0,
    );
    const occupiedUnits = unitCounts.get('occupied') ?? 0;
    const managementRevenue = this.money(
      rentTotals._sum.managementCommissionAmount,
    );
    const saleRevenue = this.money(saleTotals._sum.commissionAmount);

    return {
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      queues: {
        pendingAgents,
        pendingListings,
        agents: pendingAgentItems,
        listings: pendingListingItems,
      },
      rentals: {
        properties: rentalProperties,
        publishedProperties: publishedRentals,
        unassignedProperties: unassignedRentals,
        units: totalUnits,
        occupiedUnits,
        vacantUnits: unitCounts.get('vacant') ?? 0,
        maintenanceUnits: unitCounts.get('under maintenance') ?? 0,
        offMarketUnits: unitCounts.get('off market') ?? 0,
        occupancyRate:
          totalUnits === 0
            ? 0
            : Number(((occupiedUnits / totalUnits) * 100).toFixed(1)),
      },
      rentRevenue: {
        collected: new Prisma.Decimal(this.money(rentTotals._sum.paidAmount))
          .minus(this.money(rentTotals._sum.refundedAmount))
          .toFixed(2),
        managementCommission: managementRevenue,
        ownerProceeds: this.money(rentTotals._sum.ownerProceedsAmount),
        paymentCount: rentTotals._count._all,
        unassignedCollected: this.money(unassignedRentTotals._sum.paidAmount),
        unassignedPaymentCount: unassignedRentTotals._count._all,
        maintenanceExpenses: this.money(maintenanceExpenseTotals._sum.amount),
        maintenanceExpenseEntryCount: maintenanceExpenseTotals._count._all,
      },
      moveInRevenue: {
        collected: new Prisma.Decimal(this.money(moveInTotals._sum.paidAmount))
          .minus(this.money(moveInTotals._sum.refundedAmount))
          .toFixed(2),
        managementAmount: this.money(
          moveInTotals._sum.managementCommissionAmount,
        ),
        ownerProceeds: this.money(moveInTotals._sum.ownerProceedsAmount),
        paymentCount: moveInTotals._count._all,
      },
      saleRevenue: {
        commission: saleRevenue,
        receiptCount: saleTotals._count._all,
      },
      companyRevenue: {
        combined: new Prisma.Decimal(managementRevenue)
          .plus(this.money(moveInTotals._sum.managementCommissionAmount))
          .plus(saleRevenue)
          .toFixed(2),
      },
      compliance: {
        auditEventCount,
        actorCount: auditActorGroups.length,
        systemEventCount: systemAuditEventCount,
      },
    };
  }

  async owners(query: OwnerReportQueryDto) {
    const range = this.reportRange(query);
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined;
    const rows = await this.prisma.propertyOwner.findMany({
      where: cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.timestamp } },
              { createdAt: cursor.timestamp, id: { lt: cursor.id } },
            ],
          }
        : undefined,
      select: {
        id: true,
        ownerName: true,
        companyName: true,
        contactEmail: true,
        payoutStatus: true,
        commissionRate: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const hasMore = rows.length > query.limit;
    const owners = hasMore ? rows.slice(0, query.limit) : rows;
    const ownerIds = owners.map((owner) => owner.id);
    const [
      properties,
      paymentGroups,
      moveInPaymentGroups,
      maintenanceExpenseGroups,
    ] = ownerIds.length
      ? await Promise.all([
          this.prisma.property.findMany({
            where: { ownerId: { in: ownerIds }, listingType: ListingType.RENT },
            select: {
              ownerId: true,
              publishStatus: true,
              units: { select: { status: true } },
            },
          }),
          this.prisma.payment.groupBy({
            by: ['propertyOwnerId'],
            where: {
              propertyOwnerId: { in: ownerIds },
              purpose: PaymentPurpose.RENT,
              status: { in: [PaymentStatus.PAID, PaymentStatus.PARTIAL] },
              paidAmount: { gt: 0 },
              paidAt: range.filter,
            },
            _sum: {
              paidAmount: true,
              refundedAmount: true,
              managementCommissionAmount: true,
              ownerProceedsAmount: true,
            },
            _count: { _all: true },
          }),
          this.prisma.payment.groupBy({
            by: ['propertyOwnerId'],
            where: {
              propertyOwnerId: { in: ownerIds },
              purpose: PaymentPurpose.MOVE_IN,
              status: { in: [PaymentStatus.PAID, PaymentStatus.PARTIAL] },
              paidAmount: { gt: 0 },
              paidAt: range.filter,
            },
            _sum: {
              paidAmount: true,
              refundedAmount: true,
              managementCommissionAmount: true,
              ownerProceedsAmount: true,
            },
            _count: { _all: true },
          }),
          this.prisma.ownerExpenseLedgerEntry.groupBy({
            by: ['propertyOwnerId'],
            where: {
              propertyOwnerId: { in: ownerIds },
              occurredAt: range.filter,
            },
            _sum: { amount: true },
            _count: { _all: true },
          }),
        ])
      : [[], [], [], []];
    const paymentsByOwner = new Map(
      paymentGroups.map((group) => [group.propertyOwnerId, group]),
    );
    const moveInPaymentsByOwner = new Map(
      moveInPaymentGroups.map((group) => [group.propertyOwnerId, group]),
    );
    const maintenanceExpensesByOwner = new Map(
      maintenanceExpenseGroups.map((group) => [group.propertyOwnerId, group]),
    );
    const items = owners.map((owner) => {
      const rentals = properties.filter(
        (property) => property.ownerId === owner.id,
      );
      const units = rentals.flatMap((property) => property.units);
      const payment = paymentsByOwner.get(owner.id);
      const moveInPayment = moveInPaymentsByOwner.get(owner.id);
      const maintenanceExpense = maintenanceExpensesByOwner.get(owner.id);
      const ownerProceeds = this.money(payment?._sum.ownerProceedsAmount);
      const moveInOwnerProceeds = this.money(
        moveInPayment?._sum.ownerProceedsAmount,
      );
      const maintenanceExpenses = this.money(maintenanceExpense?._sum.amount);
      return {
        ...owner,
        commissionRate: owner.commissionRate.toFixed(2),
        propertyCount: rentals.length,
        publishedPropertyCount: rentals.filter(
          (property) => property.publishStatus === PublishStatus.PUBLISHED,
        ).length,
        unitCount: units.length,
        occupiedUnitCount: units.filter((unit) => unit.status === 'occupied')
          .length,
        rentCollected: new Prisma.Decimal(this.money(payment?._sum.paidAmount))
          .minus(this.money(payment?._sum.refundedAmount))
          .toFixed(2),
        managementCommission: this.money(
          payment?._sum.managementCommissionAmount,
        ),
        ownerProceeds,
        paymentCount: payment?._count._all ?? 0,
        moveInCollected: new Prisma.Decimal(
          this.money(moveInPayment?._sum.paidAmount),
        )
          .minus(this.money(moveInPayment?._sum.refundedAmount))
          .toFixed(2),
        moveInOwnerProceeds,
        moveInPaymentCount: moveInPayment?._count._all ?? 0,
        maintenanceExpenses,
        maintenanceExpenseEntryCount: maintenanceExpense?._count._all ?? 0,
        netOwnerPosition: new Prisma.Decimal(ownerProceeds)
          .plus(moveInOwnerProceeds)
          .minus(maintenanceExpenses)
          .toFixed(2),
      };
    });
    const last = items.at(-1);
    return {
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      items,
      nextCursor:
        hasMore && last ? this.encodeCursor(last.createdAt, last.id) : null,
    };
  }
}
