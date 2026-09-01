import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MoveInChargeCategory,
  MoveInChargePayoutTreatment,
  MoveInChargeSource,
  MoveInChargeStatus,
  Prisma,
  StripeCheckoutStatus,
} from '@prisma/client';
import { EmailsService } from '../emails/emails.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdjustMoveInChargeDto,
  CreateMoveInChargesDto,
  ListMoveInChargesDto,
  MoveInChargeAdjustmentAction,
} from './dto/move-in-charge.dto';
import {
  MOVE_IN_CHARGE_LABELS,
  OPEN_MOVE_IN_CHARGE_STATUSES,
  adjustmentFingerprint,
  chargeFingerprint,
  serializeMoveInCharge,
  startOfUtcMonth,
} from './move-in-charge.policy';

const CHARGEABLE_LEASE_STATUSES = ['active', 'expiring', 'renewed'];

const moveInChargeInclude = {
  tenant: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  lease: {
    select: {
      id: true,
      startDate: true,
      endDate: true,
      monthlyRent: true,
      securityDeposit: true,
      status: true,
    },
  },
  unit: {
    select: {
      id: true,
      unitNumber: true,
      property: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          owner: {
            select: {
              id: true,
              ownerName: true,
              companyName: true,
              payoutStatus: true,
              commissionRate: true,
            },
          },
        },
      },
    },
  },
  allocations: {
    include: {
      payment: {
        select: {
          id: true,
          purpose: true,
          status: true,
          paidAmount: true,
          refundedAmount: true,
          paymentMethod: true,
          referenceNumber: true,
          paidAt: true,
          stripeCheckoutStatus: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    take: 25,
  },
} satisfies Prisma.MoveInChargeInclude;

type ChargeWithContext = Prisma.MoveInChargeGetPayload<{
  include: typeof moveInChargeInclude;
}>;

@Injectable()
export class MoveInChargesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: EmailsService,
  ) {}

  async findAll(query: ListMoveInChargesDto) {
    const charges = await this.prisma.moveInCharge.findMany({
      where: {
        leaseId: query.leaseId,
        tenantId: query.tenantId,
        status: query.status,
      },
      include: moveInChargeInclude,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take: 500,
    });
    return charges.map((charge) => serializeMoveInCharge(charge));
  }

  async findForUser(userId: string) {
    const charges = await this.prisma.moveInCharge.findMany({
      where: {
        tenant: { userId },
        status: { not: MoveInChargeStatus.VOID },
      },
      include: moveInChargeInclude,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take: 120,
    });
    return charges.map((charge) => serializeMoveInCharge(charge));
  }

  async create(userId: string, data: CreateMoveInChargesDto) {
    const requestIds = data.charges.map((charge) => charge.clientRequestId);
    if (new Set(requestIds).size !== requestIds.length) {
      throw new BadRequestException(
        'Each move-in charge must have a different request ID',
      );
    }
    const lease = await this.prisma.lease.findUnique({
      where: { id: data.leaseId },
      include: {
        tenant: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        unit: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
                owner: {
                  select: { id: true, commissionRate: true },
                },
              },
            },
          },
        },
      },
    });
    if (!lease || !CHARGEABLE_LEASE_STATUSES.includes(lease.status)) {
      throw new BadRequestException(
        'Move-in charges require a signed, current rental lease',
      );
    }

    const expected = new Map(
      data.charges.map((item) => [
        item.clientRequestId,
        chargeFingerprint(data.leaseId, item),
      ]),
    );
    const existing = await this.prisma.moveInCharge.findMany({
      where: { idempotencyKey: { in: requestIds } },
      include: moveInChargeInclude,
    });
    if (existing.length) {
      const reusable =
        existing.length === requestIds.length &&
        existing.every(
          (charge) =>
            charge.requestFingerprint === expected.get(charge.idempotencyKey),
        );
      if (!reusable) {
        throw new ConflictException(
          'A move-in charge request ID was already used with different details',
        );
      }
      return existing.map((charge) => serializeMoveInCharge(charge));
    }

    const duplicateProtectedCategories = data.charges.filter((charge) =>
      (
        [
          MoveInChargeCategory.FIRST_MONTH_RENT,
          MoveInChargeCategory.SECURITY_DEPOSIT,
        ] as MoveInChargeCategory[]
      ).includes(charge.category),
    );
    if (
      new Set(duplicateProtectedCategories.map((charge) => charge.category))
        .size !== duplicateProtectedCategories.length
    ) {
      throw new BadRequestException(
        'First-month rent and security deposit can be posted only once per request',
      );
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Lease" WHERE "id" = ${lease.id} FOR UPDATE`;
        for (const item of data.charges) {
          const payoutTreatment = this.protectedPayoutTreatment(
            item.category,
            item.payoutTreatment,
          );
          const amount = new Prisma.Decimal(item.amount.toFixed(2));
          const charge = await tx.moveInCharge.create({
            data: {
              tenantId: lease.tenantId,
              leaseId: lease.id,
              unitId: lease.unitId,
              propertyOwnerId: lease.unit.property.owner?.id ?? null,
              category: item.category,
              label: item.label?.trim() || MOVE_IN_CHARGE_LABELS[item.category],
              description: item.description?.trim() || null,
              amount,
              balanceDue: amount,
              payoutTreatment,
              commissionRate:
                payoutTreatment ===
                MoveInChargePayoutTreatment.OWNER_NET_OF_COMMISSION
                  ? lease.unit.property.owner?.commissionRate
                  : null,
              source: MoveInChargeSource.MANUAL,
              billingPeriod:
                item.category === MoveInChargeCategory.FIRST_MONTH_RENT
                  ? startOfUtcMonth(lease.startDate)
                  : null,
              dueDate: new Date(item.dueDate),
              idempotencyKey: item.clientRequestId,
              requestFingerprint: expected.get(item.clientRequestId),
              postedByUserId: userId,
            },
            include: moveInChargeInclude,
          });
          await tx.auditLog.create({
            data: {
              userId,
              action: 'MOVE_IN_CHARGE_POSTED',
              resource: 'move_in_charge',
              resourceId: charge.id,
              newValue: JSON.stringify({
                leaseId: lease.id,
                category: charge.category,
                amount: charge.amount,
                dueDate: charge.dueDate,
                payoutTreatment: charge.payoutTreatment,
              }),
            },
          });
        }
        return tx.moveInCharge.findMany({
          where: { idempotencyKey: { in: requestIds } },
          include: moveInChargeInclude,
          orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
        });
      });
      await this.emails.sendMoveInChargesPosted(
        lease.tenant.email,
        {
          name: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
          propertyName: lease.unit.property.name,
          amount: Number(
            created.reduce(
              (total, charge) => total.plus(charge.amount),
              new Prisma.Decimal(0),
            ),
          ),
        },
        `lease-${lease.id}-${created.map((charge) => charge.id).join('.')}`,
      );
      return created.map((charge) => serializeMoveInCharge(charge));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const raced = await this.prisma.moveInCharge.findMany({
          where: { idempotencyKey: { in: requestIds } },
          include: moveInChargeInclude,
          orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
        });
        if (
          raced.length === requestIds.length &&
          raced.every(
            (charge) =>
              charge.requestFingerprint === expected.get(charge.idempotencyKey),
          )
        ) {
          return raced.map((charge) => serializeMoveInCharge(charge));
        }
        throw new ConflictException(
          'First-month rent or the security deposit is already posted for this lease',
        );
      }
      throw error;
    }
  }

  async adjust(userId: string, chargeId: string, data: AdjustMoveInChargeDto) {
    const fingerprint = adjustmentFingerprint(chargeId, data);
    const current = await this.prisma.moveInCharge.findUnique({
      where: { id: chargeId },
      include: moveInChargeInclude,
    });
    if (!current) throw new NotFoundException('Move-in charge not found');
    if (current.lastAdjustmentRequestId === data.clientRequestId) {
      if (current.lastAdjustmentFingerprint !== fingerprint) {
        throw new ConflictException(
          'This adjustment request ID was already used with different details',
        );
      }
      return serializeMoveInCharge(current);
    }
    if (
      current.status === MoveInChargeStatus.VOID ||
      current.status === MoveInChargeStatus.WAIVED
    ) {
      throw new ConflictException('This move-in charge is already closed');
    }
    this.assertNoActiveCheckout(current);

    const grossReceived = current.paidAmount.minus(current.refundedAmount);
    if (
      data.action === MoveInChargeAdjustmentAction.UPDATE &&
      grossReceived.gt(0)
    ) {
      throw new ConflictException(
        'A charge with payment activity cannot be edited. Waive the remaining balance or post an audited correction.',
      );
    }
    if (
      data.action === MoveInChargeAdjustmentAction.VOID &&
      current.paidAmount.gt(0)
    ) {
      throw new ConflictException(
        'A charge with payment history cannot be voided',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "MoveInCharge" WHERE "id" = ${chargeId} FOR UPDATE`;
      const activeCheckouts = await tx.paymentAllocation.count({
        where: {
          moveInChargeId: chargeId,
          payment: {
            stripeCheckoutStatus: {
              in: [StripeCheckoutStatus.NOT_STARTED, StripeCheckoutStatus.OPEN],
            },
          },
        },
      });
      if (activeCheckouts > 0) {
        throw new ConflictException(
          'A one-time checkout is active for this charge. Wait for it to complete or expire before making changes.',
        );
      }
      let amount = current.amount;
      let waivedAmount = current.waivedAmount;
      let status = current.status;
      let waivedAt = current.waivedAt;
      let voidedAt = current.voidedAt;
      if (data.action === MoveInChargeAdjustmentAction.UPDATE) {
        amount = new Prisma.Decimal((data.amount ?? Number(amount)).toFixed(2));
        status = MoveInChargeStatus.OPEN;
      } else if (data.action === MoveInChargeAdjustmentAction.WAIVE) {
        waivedAmount = current.amount.minus(grossReceived);
        status = MoveInChargeStatus.WAIVED;
        waivedAt = new Date();
      } else {
        waivedAmount = current.amount;
        status = MoveInChargeStatus.VOID;
        voidedAt = new Date();
      }
      const balanceDue = amount
        .minus(grossReceived)
        .minus(waivedAmount)
        .toDecimalPlaces(2);
      const payoutTreatment = this.protectedPayoutTreatment(
        current.category,
        data.payoutTreatment ?? current.payoutTreatment,
      );
      const changed = await tx.moveInCharge.updateMany({
        where: { id: chargeId, updatedAt: current.updatedAt },
        data: {
          amount,
          balanceDue,
          waivedAmount,
          status,
          waivedAt,
          voidedAt,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          label: data.label?.trim(),
          description:
            data.description === undefined
              ? undefined
              : data.description.trim() || null,
          payoutTreatment,
          commissionRate:
            payoutTreatment ===
            MoveInChargePayoutTreatment.OWNER_NET_OF_COMMISSION
              ? (current.commissionRate ??
                current.unit.property.owner?.commissionRate)
              : null,
          lastAdjustmentRequestId: data.clientRequestId,
          lastAdjustmentFingerprint: fingerprint,
          adjustedByUserId: userId,
          adjustmentReason: data.reason.trim(),
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          'Move-in charge changed; refresh before updating it',
        );
      }
      const charge = await tx.moveInCharge.findUniqueOrThrow({
        where: { id: chargeId },
        include: moveInChargeInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: `MOVE_IN_CHARGE_${data.action}`,
          resource: 'move_in_charge',
          resourceId: chargeId,
          oldValue: JSON.stringify(current),
          newValue: JSON.stringify({ charge, reason: data.reason.trim() }),
        },
      });
      return charge;
    });
    return serializeMoveInCharge(updated);
  }

  private protectedPayoutTreatment(
    category: MoveInChargeCategory,
    requested: MoveInChargePayoutTreatment,
  ) {
    if (category === MoveInChargeCategory.FIRST_MONTH_RENT) {
      return MoveInChargePayoutTreatment.OWNER_NET_OF_COMMISSION;
    }
    if (category === MoveInChargeCategory.SECURITY_DEPOSIT) {
      return MoveInChargePayoutTreatment.OWNER_FULL;
    }
    return requested;
  }

  private assertNoActiveCheckout(charge: ChargeWithContext) {
    const active = charge.allocations.some((allocation) =>
      (
        [
          StripeCheckoutStatus.NOT_STARTED,
          StripeCheckoutStatus.OPEN,
        ] as StripeCheckoutStatus[]
      ).includes(allocation.payment.stripeCheckoutStatus),
    );
    if (active) {
      throw new ConflictException(
        'A one-time checkout is active for this charge. Wait for it to complete or expire before making changes.',
      );
    }
    if (!OPEN_MOVE_IN_CHARGE_STATUSES.includes(charge.status)) {
      throw new ConflictException('This move-in charge is already closed');
    }
  }
}
