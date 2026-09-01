import { BadRequestException, Injectable } from '@nestjs/common';
import { OwnerExpenseEntryType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OwnerExpenseListQueryDto } from './dto/maintenance.dto';

type ExpenseCursor = { occurredAt: string; id: string };

type ExpenseSourceRequest = {
  id: string;
  category: string;
  status: string;
  cost: Prisma.Decimal | null;
  completedAt: Date | null;
  propertyId: string;
  unitId: string;
  assignedVendorId: string | null;
  property: { ownerId: string | null };
};

@Injectable()
export class MaintenanceExpenseLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  private encodeCursor(occurredAt: Date, id: string) {
    return Buffer.from(
      JSON.stringify({ occurredAt: occurredAt.toISOString(), id }),
    ).toString('base64url');
  }

  private decodeCursor(cursor: string) {
    try {
      const parsed = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as Partial<ExpenseCursor>;
      const occurredAt = new Date(parsed.occurredAt ?? '');
      if (!parsed.id || Number.isNaN(occurredAt.getTime())) throw new Error();
      return { occurredAt, id: parsed.id };
    } catch {
      throw new BadRequestException('Invalid expense pagination cursor');
    }
  }

  async reconcile(
    tx: Prisma.TransactionClient,
    request: ExpenseSourceRequest,
    actorUserId: string,
  ) {
    const eligible = ['completed', 'tenant_confirmed'].includes(request.status);
    const target = eligible
      ? (request.cost ?? new Prisma.Decimal(0))
      : new Prisma.Decimal(0);
    const [aggregate, latest] = await Promise.all([
      tx.ownerExpenseLedgerEntry.aggregate({
        where: { maintenanceRequestId: request.id },
        _sum: { amount: true },
      }),
      tx.ownerExpenseLedgerEntry.findFirst({
        where: { maintenanceRequestId: request.id },
        select: { propertyOwnerId: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
    const current = aggregate._sum.amount ?? new Prisma.Decimal(0);
    const difference = target.minus(current).toDecimalPlaces(2);
    if (difference.isZero()) return null;

    const propertyOwnerId = latest?.propertyOwnerId ?? request.property.ownerId;
    if (!propertyOwnerId) {
      throw new BadRequestException(
        'Assign a property owner before posting this maintenance expense',
      );
    }
    const entryType =
      current.isZero() && difference.isPositive()
        ? OwnerExpenseEntryType.CHARGE
        : OwnerExpenseEntryType.ADJUSTMENT;
    const entry = await tx.ownerExpenseLedgerEntry.create({
      data: {
        propertyOwnerId,
        propertyId: request.propertyId,
        unitId: request.unitId,
        maintenanceRequestId: request.id,
        vendorId: request.assignedVendorId,
        entryType,
        amount: difference,
        description:
          entryType === OwnerExpenseEntryType.CHARGE
            ? `Maintenance cost: ${request.category}`
            : target.isZero()
              ? `Maintenance cost reversal: ${request.category}`
              : `Maintenance cost adjustment: ${request.category}`,
        occurredAt:
          entryType === OwnerExpenseEntryType.CHARGE
            ? (request.completedAt ?? new Date())
            : new Date(),
        postedByUserId: actorUserId,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: actorUserId,
        action:
          entryType === OwnerExpenseEntryType.CHARGE
            ? 'OWNER_MAINTENANCE_EXPENSE_POSTED'
            : 'OWNER_MAINTENANCE_EXPENSE_ADJUSTED',
        resource: 'owner_expense_ledger_entry',
        resourceId: entry.id,
        newValue: JSON.stringify({
          maintenanceRequestId: request.id,
          propertyOwnerId,
          amount: difference.toFixed(2),
          ledgerTotal: target.toFixed(2),
        }),
      },
    });
    return entry;
  }

  async list(query: OwnerExpenseListQueryDto) {
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined;
    const filters: Prisma.OwnerExpenseLedgerEntryWhereInput = {
      propertyOwnerId: query.propertyOwnerId,
      propertyId: query.propertyId,
    };
    const rows = await this.prisma.ownerExpenseLedgerEntry.findMany({
      where: {
        ...filters,
        ...(cursor
          ? {
              OR: [
                { occurredAt: { lt: cursor.occurredAt } },
                { occurredAt: cursor.occurredAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        entryType: true,
        amount: true,
        description: true,
        occurredAt: true,
        createdAt: true,
        propertyOwner: {
          select: { id: true, ownerName: true, companyName: true },
        },
        property: { select: { id: true, name: true, address: true } },
        unit: { select: { id: true, unitNumber: true } },
        vendor: { select: { id: true, name: true, companyName: true } },
        maintenanceRequest: {
          select: { id: true, category: true, status: true },
        },
        postedBy: { select: { id: true, email: true } },
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const aggregate = await this.prisma.ownerExpenseLedgerEntry.aggregate({
      where: filters,
      _sum: { amount: true },
      _count: { _all: true },
    });
    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);
    return {
      summary: {
        total: (aggregate._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
        entryCount: aggregate._count._all,
      },
      items: page.map((entry) => ({
        ...entry,
        amount: entry.amount.toFixed(2),
      })),
      nextCursor:
        hasMore && last ? this.encodeCursor(last.occurredAt, last.id) : null,
    };
  }
}
