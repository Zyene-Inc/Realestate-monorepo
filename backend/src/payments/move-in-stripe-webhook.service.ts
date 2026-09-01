import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  StripeCheckoutStatus,
  StripeWebhookEventStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StripeEvent } from '../stripe/stripe-client.service';
import {
  cents,
  lockMoveInCharges,
  MoveInPaymentContext,
  moveInPaymentId,
  moveInPaymentInclude,
  stripeNumber,
  stripeValue,
} from './move-in-payment.context';
import { MoveInPaymentNotificationsService } from './move-in-payment-notifications.service';
import {
  OPEN_MOVE_IN_CHARGE_STATUSES,
  moveInChargeStatus,
} from './move-in-charge.policy';

@Injectable()
export class MoveInStripeWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: MoveInPaymentNotificationsService,
  ) {}

  canHandle(event: StripeEvent) {
    return Boolean(moveInPaymentId(event.data.object));
  }

  async process(event: StripeEvent) {
    const paymentId = moveInPaymentId(event.data.object);
    if (!paymentId) {
      throw new BadRequestException('Move-in payment metadata is missing');
    }
    try {
      await this.prisma.stripeWebhookEvent.create({
        data: {
          stripeEventId: event.id,
          type: event.type,
          livemode: event.livemode,
          paymentId,
          payload: JSON.stringify(event),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { received: true, duplicate: true };
      }
      throw error;
    }
    try {
      const handled = await this.routeEvent(event, paymentId);
      await this.prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: {
          status: handled
            ? StripeWebhookEventStatus.PROCESSED
            : StripeWebhookEventStatus.IGNORED,
          processedAt: new Date(),
        },
      });
      return { received: true, duplicate: false };
    } catch (error) {
      await this.prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: {
          status: StripeWebhookEventStatus.FAILED,
          processingError: (error instanceof Error
            ? error.message
            : String(error)
          ).slice(0, 4000),
        },
      });
      throw error;
    }
  }

  private routeEvent(event: StripeEvent, paymentId: string) {
    if (
      (event.type === 'checkout.session.completed' &&
        stripeValue(event.data.object, 'payment_status') === 'paid') ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      return this.settleCheckout(event.data.object);
    }
    if (event.type === 'checkout.session.async_payment_failed') {
      return this.updateCheckoutStatus(
        paymentId,
        event.data.object,
        StripeCheckoutStatus.FAILED,
        'TENANT_MOVE_IN_CHECKOUT_FAILED',
      );
    }
    if (event.type === 'checkout.session.expired') {
      return this.updateCheckoutStatus(
        paymentId,
        event.data.object,
        StripeCheckoutStatus.EXPIRED,
        'TENANT_MOVE_IN_CHECKOUT_EXPIRED',
      );
    }
    if (event.type === 'charge.succeeded') {
      return this.recordCharge(paymentId, event.data.object);
    }
    if (event.type === 'charge.refunded') {
      return this.recordRefund(paymentId, event.data.object);
    }
    if (event.type === 'charge.dispute.created') {
      return this.recordDispute(paymentId, event.data.object);
    }
    return Promise.resolve(false);
  }

  private async settleCheckout(session: Record<string, unknown>) {
    const paymentId = moveInPaymentId(session)!;
    const sessionId = stripeValue(session, 'id');
    const amountCents = stripeNumber(session, 'amount_total');
    if (!sessionId || amountCents === undefined) {
      throw new BadRequestException('Stripe Checkout payment data is missing');
    }
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: moveInPaymentInclude,
    });
    if (
      !payment ||
      payment.purpose !== PaymentPurpose.MOVE_IN ||
      payment.stripeCheckoutSessionId !== sessionId
    ) {
      throw new BadRequestException(
        'Stripe Checkout session does not match a move-in payment',
      );
    }
    if (amountCents !== cents(payment.totalAmount)) {
      throw new BadRequestException(
        'Stripe Checkout amount does not match the move-in balance',
      );
    }
    const chargeIds = payment.allocations.map(
      (allocation) => allocation.moveInChargeId,
    );
    const settled = await this.prisma.$transaction(async (tx) => {
      await lockMoveInCharges(tx, chargeIds);
      const changed = await tx.payment.updateMany({
        where: {
          id: payment.id,
          stripeCheckoutSessionId: sessionId,
          stripeCheckoutStatus: { not: StripeCheckoutStatus.COMPLETE },
        },
        data: {
          status: PaymentStatus.PAID,
          paidAmount: payment.totalAmount,
          balanceDue: 0,
          paidAt: new Date(),
          paymentMethod: 'stripe_checkout',
          stripeCheckoutStatus: StripeCheckoutStatus.COMPLETE,
          stripePaymentIntentId: stripeValue(session, 'payment_intent'),
          stripeLastEventAt: new Date(),
        },
      });
      if (changed.count !== 1) return null;
      for (const allocation of payment.allocations) {
        const charge = await tx.moveInCharge.findUniqueOrThrow({
          where: { id: allocation.moveInChargeId },
        });
        if (
          !OPEN_MOVE_IN_CHARGE_STATUSES.includes(charge.status) ||
          charge.balanceDue.lt(allocation.amount)
        ) {
          throw new ConflictException(
            `Move-in charge ${charge.label} changed before payment confirmation`,
          );
        }
        const paidAmount = charge.paidAmount.plus(allocation.amount);
        await tx.moveInCharge.update({
          where: { id: charge.id },
          data: {
            paidAmount,
            balanceDue: charge.balanceDue.minus(allocation.amount),
            status: moveInChargeStatus({
              amount: charge.amount,
              paidAmount,
              refundedAmount: charge.refundedAmount,
              waivedAmount: charge.waivedAmount,
            }),
          },
        });
      }
      await tx.auditLog.create({
        data: {
          action: 'TENANT_MOVE_IN_PAYMENT_CONFIRMED_BY_STRIPE',
          resource: 'payment',
          resourceId: payment.id,
          newValue: JSON.stringify({ sessionId, amountCents, chargeIds }),
        },
      });
      return tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
        include: moveInPaymentInclude,
      });
    });
    if (!settled) return false;
    await this.notifications.paymentRecorded(
      settled,
      `stripe-checkout-${sessionId}`,
    );
    return true;
  }

  private async updateCheckoutStatus(
    paymentId: string,
    session: Record<string, unknown>,
    status: StripeCheckoutStatus,
    action: string,
  ) {
    const sessionId = stripeValue(session, 'id');
    if (!sessionId) return false;
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.payment.updateMany({
        where: {
          id: paymentId,
          purpose: PaymentPurpose.MOVE_IN,
          stripeCheckoutSessionId: sessionId,
          stripeCheckoutStatus: StripeCheckoutStatus.OPEN,
        },
        data: { stripeCheckoutStatus: status, stripeLastEventAt: new Date() },
      });
      if (changed.count === 1) {
        await tx.auditLog.create({
          data: { action, resource: 'payment', resourceId: paymentId },
        });
      }
      return changed.count === 1;
    });
  }

  private async recordCharge(
    paymentId: string,
    record: Record<string, unknown>,
  ) {
    const changed = await this.prisma.payment.updateMany({
      where: { id: paymentId, purpose: PaymentPurpose.MOVE_IN },
      data: {
        stripeChargeId: stripeValue(record, 'id'),
        stripeTransferId: stripeValue(record, 'transfer'),
        stripeLastEventAt: new Date(),
      },
    });
    return changed.count === 1;
  }

  private async recordRefund(
    paymentId: string,
    record: Record<string, unknown>,
  ) {
    const cumulativeCents = stripeNumber(record, 'amount_refunded');
    if (cumulativeCents === undefined) return false;
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: moveInPaymentInclude,
    });
    if (!payment || payment.purpose !== PaymentPurpose.MOVE_IN) return false;
    const cumulative = new Prisma.Decimal((cumulativeCents / 100).toFixed(2));
    const currentRefunded = new Prisma.Decimal(
      payment.refundedAmount.toFixed(2),
    );
    const delta = cumulative.minus(currentRefunded);
    if (delta.lte(0)) return true;
    if (cumulative.gt(payment.paidAmount)) {
      throw new BadRequestException('Stripe refund exceeds recorded payment');
    }
    await this.applyRefund(payment, cumulative, delta, record);
    return true;
  }

  private async applyRefund(
    payment: MoveInPaymentContext,
    cumulative: Prisma.Decimal,
    delta: Prisma.Decimal,
    record: Record<string, unknown>,
  ) {
    const chargeIds = payment.allocations.map((item) => item.moveInChargeId);
    await this.prisma.$transaction(async (tx) => {
      await lockMoveInCharges(tx, chargeIds);
      let remaining = delta;
      for (const allocation of [...payment.allocations].reverse()) {
        if (remaining.lte(0)) break;
        const refundable = allocation.amount.minus(allocation.refundedAmount);
        const applied = refundable.lt(remaining) ? refundable : remaining;
        if (applied.lte(0)) continue;
        const charge = await tx.moveInCharge.findUniqueOrThrow({
          where: { id: allocation.moveInChargeId },
        });
        const refundedAmount = charge.refundedAmount.plus(applied);
        await tx.paymentAllocation.update({
          where: { id: allocation.id },
          data: { refundedAmount: { increment: applied } },
        });
        await tx.moveInCharge.update({
          where: { id: charge.id },
          data: {
            refundedAmount,
            balanceDue: charge.balanceDue.plus(applied),
            status: moveInChargeStatus({
              amount: charge.amount,
              paidAmount: charge.paidAmount,
              refundedAmount,
              waivedAmount: charge.waivedAmount,
            }),
          },
        });
        remaining = remaining.minus(applied);
      }
      if (remaining.gt(0)) {
        throw new ConflictException('Refund could not be fully allocated');
      }
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          refundedAmount: Number(cumulative),
          status: cumulative.eq(payment.paidAmount)
            ? PaymentStatus.REFUNDED
            : PaymentStatus.PAID,
          stripeLastEventAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'STRIPE_MOVE_IN_PAYMENT_REFUND_RECORDED',
          resource: 'payment',
          resourceId: payment.id,
          newValue: JSON.stringify({
            chargeId: stripeValue(record, 'id'),
            cumulativeRefunded: cumulative.toFixed(2),
            refundDelta: delta.toFixed(2),
          }),
        },
      });
    });
  }

  private async recordDispute(
    paymentId: string,
    record: Record<string, unknown>,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, purpose: PaymentPurpose.MOVE_IN },
      select: { id: true },
    });
    if (!payment) return false;
    await this.prisma.auditLog.create({
      data: {
        action: 'STRIPE_MOVE_IN_PAYMENT_DISPUTE_OPENED',
        resource: 'payment',
        resourceId: paymentId,
        newValue: JSON.stringify({ chargeId: stripeValue(record, 'id') }),
      },
    });
    return true;
  }
}
