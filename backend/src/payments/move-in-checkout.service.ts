import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  PropertyOwnerPayoutStatus,
  StripeCheckoutStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StripeClient } from '../stripe/stripe-client.service';
import { StartMoveInCheckoutDto } from './dto/move-in-charge.dto';
import {
  assertFreshBalances,
  cents,
  chargePaymentInclude,
  earliestDueDate,
  lockMoveInCharges,
  moveInPaymentInclude,
} from './move-in-payment.context';
import {
  OPEN_MOVE_IN_CHARGE_STATUSES,
  paymentFingerprint,
  payoutSplit,
} from './move-in-charge.policy';

@Injectable()
export class MoveInCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeClient,
  ) {}

  async start(userId: string, data: StartMoveInCheckoutDto) {
    const ids = [...new Set(data.chargeIds)].sort();
    if (ids.length !== data.chargeIds.length) {
      throw new BadRequestException('Select each move-in charge only once');
    }
    const charges = await this.prisma.moveInCharge.findMany({
      where: { id: { in: ids }, tenant: { userId } },
      include: chargePaymentInclude,
      orderBy: { id: 'asc' },
    });
    if (charges.length !== ids.length || !charges.length) {
      throw new BadRequestException(
        'One or more selected charges are unavailable',
      );
    }
    const first = charges[0];
    for (const charge of charges) {
      if (
        charge.leaseId !== first.leaseId ||
        charge.tenantId !== first.tenantId ||
        charge.unitId !== first.unitId ||
        !OPEN_MOVE_IN_CHARGE_STATUSES.includes(charge.status) ||
        charge.balanceDue.lte(0)
      ) {
        throw new BadRequestException(
          'Select open charges from one current lease',
        );
      }
    }
    const allocations = charges.map((charge) => ({
      chargeId: charge.id,
      amount: Number(charge.balanceDue),
    }));
    const fingerprint = paymentFingerprint({
      tenantId: first.tenant.id,
      leaseId: first.lease.id,
      allocations,
    });
    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey: data.clientRequestId },
      include: moveInPaymentInclude,
    });
    if (existing) {
      if (
        existing.purpose !== PaymentPurpose.MOVE_IN ||
        existing.recordRequestFingerprint !== fingerprint
      ) {
        throw new ConflictException(
          'This checkout request ID was already used with different charges',
        );
      }
      if (
        existing.stripeCheckoutStatus === StripeCheckoutStatus.OPEN &&
        existing.stripeCheckoutUrl &&
        existing.stripeCheckoutExpiresAt &&
        existing.stripeCheckoutExpiresAt > new Date()
      ) {
        return {
          url: existing.stripeCheckoutUrl,
          expiresAt: existing.stripeCheckoutExpiresAt,
          reused: true,
        };
      }
      throw new ConflictException(
        'This checkout attempt is no longer reusable. Start a new checkout.',
      );
    }

    const decimalAllocations = charges.map((charge) => ({
      amount: charge.balanceDue,
      moveInCharge: charge,
    }));
    const total = decimalAllocations.reduce(
      (sum, item) => sum.plus(item.amount),
      new Prisma.Decimal(0),
    );
    const split = payoutSplit(decimalAllocations);
    const owner = first.unit.property.owner;
    if (
      split.ownerProceedsAmount.gt(0) &&
      (!owner?.stripeConnectedAccountId ||
        owner.payoutStatus !== PropertyOwnerPayoutStatus.ACTIVE)
    ) {
      throw new BadRequestException(
        'Online payment is unavailable until the property owner completes payout onboarding.',
      );
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      await lockMoveInCharges(tx, ids);
      const fresh = await tx.moveInCharge.findMany({
        where: { id: { in: ids } },
        orderBy: { id: 'asc' },
      });
      assertFreshBalances(
        fresh,
        new Map(charges.map((charge) => [charge.id, charge.balanceDue])),
      );
      const active = await tx.paymentAllocation.count({
        where: {
          moveInChargeId: { in: ids },
          payment: {
            stripeCheckoutStatus: {
              in: [StripeCheckoutStatus.NOT_STARTED, StripeCheckoutStatus.OPEN],
            },
          },
        },
      });
      if (active > 0) {
        throw new ConflictException(
          'One of these charges already has an active checkout',
        );
      }
      const created = await tx.payment.create({
        data: {
          tenantId: first.tenant.id,
          leaseId: first.lease.id,
          unitId: first.unit.id,
          propertyOwnerId: owner?.id ?? null,
          purpose: PaymentPurpose.MOVE_IN,
          rentAmount: 0,
          lateFee: 0,
          totalAmount: Number(total),
          paidAmount: 0,
          balanceDue: Number(total),
          status: PaymentStatus.PENDING,
          dueDate: earliestDueDate(charges),
          idempotencyKey: data.clientRequestId,
          recordRequestFingerprint: fingerprint,
          managementCommissionAmount: split.managementCommissionAmount,
          ownerProceedsAmount: split.ownerProceedsAmount,
          allocations: {
            create: charges.map((charge) => ({
              moveInChargeId: charge.id,
              amount: charge.balanceDue,
            })),
          },
        },
        include: moveInPaymentInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'TENANT_MOVE_IN_CHECKOUT_RESERVED',
          resource: 'payment',
          resourceId: created.id,
          newValue: JSON.stringify({ chargeIds: ids, total: total.toFixed(2) }),
        },
      });
      return created;
    });

    const tenantUrl = process.env.TENANT_PORTAL_URL || 'http://localhost:3000';
    const successUrl = new URL('/tenant/pay-rent', tenantUrl);
    successUrl.searchParams.set('move_in_checkout', 'success');
    successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
    const cancelUrl = new URL('/tenant/pay-rent', tenantUrl);
    cancelUrl.searchParams.set('move_in_checkout', 'cancelled');
    let session;
    try {
      session = await this.stripe.createMoveInCheckoutSession({
        paymentId: payment.id,
        tenantEmail: payment.tenant.email,
        lineItems: payment.allocations.map((allocation) => ({
          name: `${allocation.moveInCharge.label} — ${payment.unit.property.name}`,
          amountCents: cents(allocation.amount),
        })),
        managementAmountCents: cents(split.managementCommissionAmount),
        destinationAccountId: split.ownerProceedsAmount.gt(0)
          ? (owner?.stripeConnectedAccountId ?? undefined)
          : undefined,
        successUrl: successUrl.toString(),
        cancelUrl: cancelUrl.toString(),
        idempotencyKey: `move-in-checkout-${payment.id}`,
      });
    } catch (error) {
      await this.prisma.payment.updateMany({
        where: {
          id: payment.id,
          stripeCheckoutStatus: StripeCheckoutStatus.NOT_STARTED,
        },
        data: { stripeCheckoutStatus: StripeCheckoutStatus.FAILED },
      });
      throw error;
    }
    const changed = await this.prisma.payment.updateMany({
      where: {
        id: payment.id,
        stripeCheckoutStatus: StripeCheckoutStatus.NOT_STARTED,
      },
      data: {
        stripeCheckoutSessionId: session.id,
        stripeCheckoutUrl: session.url,
        stripeCheckoutStatus: StripeCheckoutStatus.OPEN,
        stripeCheckoutExpiresAt: new Date(session.expires_at * 1000),
      },
    });
    if (changed.count !== 1) {
      throw new ConflictException('Checkout changed; refresh and retry');
    }
    return {
      url: session.url,
      expiresAt: new Date(session.expires_at * 1000),
      reused: false,
    };
  }
}
