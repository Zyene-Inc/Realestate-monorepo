import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailsService } from '../emails/emails.service';
import {
  PaymentStatus,
  Prisma,
  PropertyOwnerPayoutStatus,
  StripeCheckoutStatus,
  StripeWebhookEventStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import {
  StripeClient,
  StripeEvent,
  StripeThinEvent,
} from '../stripe/stripe-client.service';

const paymentWithTenantInclude = {
  tenant: true,
} satisfies Prisma.PaymentInclude;
const paymentWithContextInclude = {
  tenant: true,
  unit: {
    select: {
      property: {
        select: {
          owner: { select: { id: true, commissionRate: true } },
        },
      },
    },
  },
} satisfies Prisma.PaymentInclude;

type PaymentWithTenant = Prisma.PaymentGetPayload<{
  include: typeof paymentWithTenantInclude;
}>;
type PaymentWithContext = Prisma.PaymentGetPayload<{
  include: typeof paymentWithContextInclude;
}>;

const paymentWithStripeContextInclude = {
  tenant: true,
  unit: {
    select: {
      property: {
        select: {
          name: true,
          owner: {
            select: {
              id: true,
              ownerName: true,
              companyName: true,
              contactEmail: true,
              commissionRate: true,
              stripeConnectedAccountId: true,
              payoutStatus: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.PaymentInclude;

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private emails: EmailsService,
    private readonly stripe?: StripeClient,
  ) {}

  private cents(amount: number) {
    return Math.round((amount + Number.EPSILON) * 100);
  }

  private fromCents(amount: number) {
    return amount / 100;
  }

  private splitPaidAmount(paidAmount: number, rate: Prisma.Decimal | null) {
    if (!rate) {
      return {
        ownerCommissionRate: null,
        managementCommissionAmount: null,
        ownerProceedsAmount: null,
      };
    }
    const gross = new Prisma.Decimal(paidAmount.toFixed(2));
    const managementCommissionAmount = gross
      .mul(rate)
      .div(100)
      .toDecimalPlaces(2);
    return {
      ownerCommissionRate: rate,
      managementCommissionAmount,
      ownerProceedsAmount: gross
        .minus(managementCommissionAmount)
        .toDecimalPlaces(2),
    };
  }

  private tenantName(tenant: { firstName: string; lastName: string }) {
    return `${tenant.firstName} ${tenant.lastName}`;
  }

  private dueDate(value: Date) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(value);
  }

  private resolvedStatus(data: {
    totalAmount: number;
    paidAmount?: number;
    status?: PaymentStatus;
  }) {
    const paidAmount = data.paidAmount ?? 0;
    if (paidAmount >= data.totalAmount) return PaymentStatus.PAID;
    if (paidAmount > 0) return PaymentStatus.PARTIAL;
    return data.status ?? PaymentStatus.PENDING;
  }

  private sameRecordRequest(
    payment: {
      tenantId: string;
      leaseId: string;
      unitId: string;
      rentAmount: number;
      lateFee: number;
      totalAmount: number;
      paidAmount: number;
      paymentMethod: string | null;
      referenceNumber: string | null;
      dueDate: Date;
      status: PaymentStatus;
      notes: string | null;
    },
    data: {
      tenantId: string;
      leaseId: string;
      unitId: string;
      rentAmount: number;
      lateFee?: number;
      totalAmount: number;
      paidAmount?: number;
      paymentMethod?: string;
      referenceNumber?: string;
      dueDate: Date;
      status?: PaymentStatus;
      notes?: string;
    },
  ) {
    return (
      payment.tenantId === data.tenantId &&
      payment.leaseId === data.leaseId &&
      payment.unitId === data.unitId &&
      payment.rentAmount === data.rentAmount &&
      payment.lateFee === (data.lateFee ?? 0) &&
      payment.totalAmount === data.totalAmount &&
      payment.paidAmount === (data.paidAmount ?? 0) &&
      payment.paymentMethod === (data.paymentMethod ?? null) &&
      payment.referenceNumber === (data.referenceNumber ?? null) &&
      payment.dueDate.getTime() === data.dueDate.getTime() &&
      payment.status === this.resolvedStatus(data) &&
      payment.notes === (data.notes ?? null)
    );
  }

  private recordFingerprint(data: {
    tenantId: string;
    leaseId: string;
    unitId: string;
    rentAmount: number;
    lateFee?: number;
    totalAmount: number;
    paidAmount?: number;
    paymentMethod?: string;
    referenceNumber?: string;
    dueDate: Date;
    status?: PaymentStatus;
    notes?: string;
  }) {
    return createHash('sha256')
      .update(
        JSON.stringify({
          tenantId: data.tenantId,
          leaseId: data.leaseId,
          unitId: data.unitId,
          rentAmount: data.rentAmount,
          lateFee: data.lateFee ?? 0,
          totalAmount: data.totalAmount,
          paidAmount: data.paidAmount ?? 0,
          paymentMethod: data.paymentMethod ?? null,
          referenceNumber: data.referenceNumber ?? null,
          dueDate: data.dueDate.toISOString(),
          status: this.resolvedStatus(data),
          notes: data.notes ?? null,
        }),
      )
      .digest('hex');
  }

  async findAll() {
    return this.prisma.payment.findMany({
      include: { tenant: true, lease: true, unit: true, propertyOwner: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByTenant(tenantId: string) {
    return this.prisma.payment.findMany({
      where: { tenantId },
      include: { lease: true, unit: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUser(userId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { userId } });
    if (!tenant) return [];
    return this.findByTenant(tenant.id);
  }

  async recordPayment(
    data: {
      clientRequestId: string;
      tenantId: string;
      leaseId: string;
      unitId: string;
      rentAmount: number;
      lateFee?: number;
      totalAmount: number;
      paidAmount?: number;
      paymentMethod?: string;
      referenceNumber?: string;
      dueDate: Date;
      status?: PaymentStatus;
      notes?: string;
    },
    userId?: string,
  ) {
    const requestFingerprint = this.recordFingerprint(data);
    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey: data.clientRequestId },
      include: paymentWithTenantInclude,
    });
    if (existing) {
      if (
        existing.recordRequestFingerprint
          ? existing.recordRequestFingerprint !== requestFingerprint
          : !this.sameRecordRequest(existing, data)
      ) {
        throw new ConflictException(
          'This payment request ID was already used with different details',
        );
      }
      return existing;
    }

    const paidAmount = data.paidAmount ?? 0;
    const balanceDue = Math.max(0, data.totalAmount - paidAmount);
    const status = this.resolvedStatus(data);
    const { clientRequestId, ...paymentData } = data;

    let result: { payment: PaymentWithTenant; created: boolean };
    try {
      result = await this.prisma.$transaction(
        async (tx) => {
          const [lease, unit] = await Promise.all([
            tx.lease.findFirst({
              where: {
                id: data.leaseId,
                tenantId: data.tenantId,
                unitId: data.unitId,
              },
              select: { id: true },
            }),
            tx.unit.findUnique({
              where: { id: data.unitId },
              select: {
                id: true,
                property: {
                  select: {
                    owner: { select: { id: true, commissionRate: true } },
                  },
                },
              },
            }),
          ]);
          if (!lease || !unit) {
            throw new BadRequestException(
              'The tenant, lease, and unit must belong to the same tenancy',
            );
          }
          const isReceived =
            paidAmount > 0 &&
            (status === PaymentStatus.PAID || status === PaymentStatus.PARTIAL);
          const owner = isReceived ? unit.property.owner : null;
          const split = this.splitPaidAmount(
            isReceived ? paidAmount : 0,
            owner?.commissionRate ?? null,
          );
          const created = await tx.payment.create({
            data: {
              ...paymentData,
              idempotencyKey: clientRequestId,
              recordRequestFingerprint: requestFingerprint,
              paidAmount,
              balanceDue,
              status,
              paidAt: isReceived ? new Date() : null,
              propertyOwnerId: owner?.id ?? null,
              ...split,
            },
            include: paymentWithTenantInclude,
          });
          await tx.auditLog.create({
            data: {
              userId,
              action: 'PAYMENT_RECORDED',
              resource: 'payment',
              resourceId: created.id,
              newValue: JSON.stringify(created),
            },
          });
          return { payment: created, created: true };
        },
        { maxWait: 30_000, timeout: 30_000 },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicate = await this.prisma.payment.findUnique({
          where: { idempotencyKey: clientRequestId },
          include: paymentWithTenantInclude,
        });
        if (
          duplicate &&
          (duplicate.recordRequestFingerprint
            ? duplicate.recordRequestFingerprint === requestFingerprint
            : this.sameRecordRequest(duplicate, data))
        ) {
          result = { payment: duplicate, created: false };
        } else if (data.referenceNumber) {
          const duplicateReference = await this.prisma.payment.findUnique({
            where: { referenceNumber: data.referenceNumber },
            select: { id: true },
          });
          if (duplicateReference) {
            throw new ConflictException(
              `Payment reference ${data.referenceNumber} is already recorded`,
            );
          }
          throw new ConflictException(
            'Payment request conflicts with an existing record',
          );
        } else {
          throw new ConflictException(
            'Payment request conflicts with an existing record',
          );
        }
      } else {
        throw error;
      }
    }

    const payment = result.payment;
    if (!result.created) return payment;

    const name = this.tenantName(payment.tenant);
    if (payment.status === PaymentStatus.OVERDUE) {
      await this.emails.sendLateNotice(
        payment.tenant.email,
        payment.rentAmount,
        payment.lateFee,
        payment.id,
        name,
      );
    } else if (payment.status === PaymentStatus.PENDING) {
      await this.emails.sendRentReminder(
        payment.tenant.email,
        payment.totalAmount,
        this.dueDate(payment.dueDate),
        payment.id,
        name,
      );
    } else {
      await this.emails.sendPaymentRecorded(
        payment.tenant.email,
        payment.paidAmount,
        payment.status,
        payment.id,
        payment.balanceDue,
        name,
        `${payment.id}-${payment.status}-${payment.updatedAt.toISOString()}`,
      );
    }
    return payment;
  }

  async updatePaymentStatus(
    paymentId: string,
    data: {
      clientRequestId: string;
      status: PaymentStatus;
      paidAmount?: number;
      paymentMethod?: string;
      referenceNumber?: string;
      notes?: string;
      receiptUrl?: string;
    },
    userId?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: paymentWithContextInclude,
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.lastStatusRequestId === data.clientRequestId) return payment;
    if (payment.stripeCheckoutStatus === StripeCheckoutStatus.OPEN) {
      throw new ConflictException(
        'A tenant-initiated online checkout is open for this payment. Wait for it to expire or complete before changing the payment manually.',
      );
    }

    const paidAmount =
      data.paidAmount !== undefined ? data.paidAmount : payment.paidAmount;
    const balanceDue = Math.max(0, payment.totalAmount - paidAmount);

    const isReceived =
      paidAmount > 0 &&
      (data.status === PaymentStatus.PAID ||
        data.status === PaymentStatus.PARTIAL);
    const ownerId = payment.paidAt
      ? payment.propertyOwnerId
      : isReceived
        ? (payment.unit.property.owner?.id ?? null)
        : null;
    const rate = payment.paidAt
      ? payment.ownerCommissionRate
      : isReceived
        ? (payment.unit.property.owner?.commissionRate ?? null)
        : null;
    const split = this.splitPaidAmount(isReceived ? paidAmount : 0, rate);

    const { clientRequestId, ...statusData } = data;
    let result:
      | { payment: PaymentWithContext; changed: true }
      | { changed: false };
    try {
      result = await this.prisma.$transaction(
        async (tx) => {
          const changed = await tx.payment.updateMany({
            where: { id: paymentId, updatedAt: payment.updatedAt },
            data: {
              ...statusData,
              lastStatusRequestId: clientRequestId,
              paidAmount,
              balanceDue,
              paidAt: isReceived
                ? (payment.paidAt ?? new Date())
                : payment.paidAt,
              propertyOwnerId: ownerId,
              ...split,
            },
          });
          if (changed.count !== 1) {
            return { changed: false as const };
          }
          const updated = await tx.payment.findUniqueOrThrow({
            where: { id: paymentId },
            include: paymentWithContextInclude,
          });
          await tx.auditLog.create({
            data: {
              userId,
              action: 'PAYMENT_UPDATED',
              resource: 'payment',
              resourceId: paymentId,
              oldValue: JSON.stringify(payment),
              newValue: JSON.stringify(updated),
            },
          });
          return { payment: updated, changed: true as const };
        },
        { maxWait: 30_000, timeout: 30_000 },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicate = await this.prisma.payment.findUnique({
          where: { lastStatusRequestId: clientRequestId },
          include: paymentWithContextInclude,
        });
        if (duplicate?.id === paymentId) {
          return duplicate;
        } else {
          throw new ConflictException(
            'This status request ID was already used for another payment',
          );
        }
      } else {
        throw error;
      }
    }

    if (!result.changed) {
      const concurrent = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: paymentWithContextInclude,
      });
      if (concurrent?.lastStatusRequestId === clientRequestId) {
        return concurrent;
      }
      throw new ConflictException(
        'Payment changed; refresh before updating it',
      );
    }
    const updatedPayment = result.payment;

    const name = this.tenantName(updatedPayment.tenant);
    if (updatedPayment.status === PaymentStatus.OVERDUE) {
      await this.emails.sendLateNotice(
        updatedPayment.tenant.email,
        updatedPayment.rentAmount,
        updatedPayment.lateFee,
        updatedPayment.id,
        name,
      );
    } else {
      await this.emails.sendPaymentRecorded(
        updatedPayment.tenant.email,
        updatedPayment.paidAmount,
        updatedPayment.status,
        updatedPayment.id,
        updatedPayment.balanceDue,
        name,
        `${updatedPayment.id}-${updatedPayment.status}-${updatedPayment.updatedAt.toISOString()}`,
      );
    }
    return updatedPayment;
  }

  async startTenantCheckout(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenant: { userId } },
      include: paymentWithStripeContextInclude,
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (
      !(
        [
          PaymentStatus.PENDING,
          PaymentStatus.OVERDUE,
          PaymentStatus.PARTIAL,
        ] as PaymentStatus[]
      ).includes(payment.status) ||
      payment.balanceDue <= 0
    ) {
      throw new BadRequestException('This payment does not have an amount due');
    }
    if (
      payment.stripeCheckoutStatus === StripeCheckoutStatus.OPEN &&
      payment.stripeCheckoutUrl &&
      payment.stripeCheckoutExpiresAt &&
      payment.stripeCheckoutExpiresAt > new Date()
    ) {
      return {
        url: payment.stripeCheckoutUrl,
        expiresAt: payment.stripeCheckoutExpiresAt,
        reused: true,
      };
    }

    const owner = payment.unit.property.owner;
    if (
      !owner?.stripeConnectedAccountId ||
      owner.payoutStatus !== PropertyOwnerPayoutStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Online payment is unavailable until the property owner completes payout onboarding.',
      );
    }
    const amountCents = this.cents(payment.balanceDue);
    const rate = payment.ownerCommissionRate ?? owner.commissionRate;
    const commissionCents = Math.round(
      (amountCents * Number(rate.toString())) / 100,
    );
    const tenantUrl = process.env.TENANT_PORTAL_URL || 'http://localhost:3000';
    const successUrl = new URL('/tenant/pay-rent', tenantUrl);
    successUrl.searchParams.set('checkout', 'success');
    successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
    const cancelUrl = new URL('/tenant/pay-rent', tenantUrl);
    cancelUrl.searchParams.set('checkout', 'cancelled');
    if (!this.stripe) {
      throw new BadRequestException(
        'Online rent payments are not configured yet',
      );
    }
    const session = await this.stripe.createCheckoutSession({
      paymentId: payment.id,
      tenantEmail: payment.tenant.email,
      propertyName: payment.unit.property.name,
      amountCents,
      commissionCents,
      destinationAccountId: owner.stripeConnectedAccountId,
      successUrl: successUrl.toString(),
      cancelUrl: cancelUrl.toString(),
      idempotencyKey: `rent-checkout-${payment.id}-${payment.updatedAt.getTime()}`,
    });
    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.payment.updateMany({
        where: { id: payment.id, updatedAt: payment.updatedAt },
        data: {
          propertyOwnerId: owner.id,
          ownerCommissionRate: rate,
          stripeCheckoutSessionId: session.id,
          stripeCheckoutUrl: session.url,
          stripeCheckoutStatus: StripeCheckoutStatus.OPEN,
          stripeCheckoutExpiresAt: new Date(session.expires_at * 1000),
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Payment changed; refresh and retry');
      }
      await tx.auditLog.create({
        data: {
          userId,
          action: 'TENANT_RENT_CHECKOUT_STARTED',
          resource: 'payment',
          resourceId: payment.id,
          newValue: JSON.stringify({
            stripeCheckoutSessionId: session.id,
            amountCents,
            commissionCents,
          }),
        },
      });
      return tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    });
    return {
      url: session.url,
      expiresAt: updated.stripeCheckoutExpiresAt,
      reused: false,
    };
  }

  private value(record: Record<string, unknown>, key: string) {
    const value = record[key];
    return typeof value === 'string' ? value : undefined;
  }

  private numberValue(record: Record<string, unknown>, key: string) {
    const value = record[key];
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }

  private metadata(record: Record<string, unknown>) {
    const metadata = record.metadata;
    return metadata && typeof metadata === 'object'
      ? (metadata as Record<string, unknown>)
      : {};
  }

  private async settleCheckout(session: Record<string, unknown>) {
    const paymentId = this.value(this.metadata(session), 'payment_id');
    const sessionId = this.value(session, 'id');
    const amountCents = this.numberValue(session, 'amount_total');
    if (!paymentId || !sessionId || amountCents === undefined) {
      throw new BadRequestException(
        'Stripe Checkout event is missing payment data',
      );
    }
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: paymentWithStripeContextInclude,
    });
    if (!payment || payment.stripeCheckoutSessionId !== sessionId) {
      throw new BadRequestException(
        'Stripe Checkout session does not match a rent payment',
      );
    }
    if (amountCents !== this.cents(payment.balanceDue)) {
      throw new BadRequestException(
        'Stripe Checkout amount does not match balance due',
      );
    }
    const owner = payment.unit.property.owner;
    const rate = payment.ownerCommissionRate ?? owner?.commissionRate;
    if (!owner || !rate) {
      throw new BadRequestException(
        'Rent payment is missing property owner data',
      );
    }
    const paidAmount = payment.paidAmount + this.fromCents(amountCents);
    const split = this.splitPaidAmount(paidAmount, rate);
    const paymentIntentId = this.value(session, 'payment_intent');
    const result = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.payment.updateMany({
        where: {
          id: payment.id,
          stripeCheckoutSessionId: sessionId,
          stripeCheckoutStatus: { not: StripeCheckoutStatus.COMPLETE },
        },
        data: {
          status: PaymentStatus.PAID,
          paidAmount,
          balanceDue: 0,
          paidAt: new Date(),
          paymentMethod: 'stripe_checkout',
          propertyOwnerId: owner.id,
          ...split,
          stripeCheckoutStatus: StripeCheckoutStatus.COMPLETE,
          stripePaymentIntentId: paymentIntentId,
          stripePaymentMethodType: this.value(session, 'payment_method_type'),
          stripeLastEventAt: new Date(),
        },
      });
      if (changed.count !== 1) return { settled: false as const };
      const settled = await tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
        include: paymentWithStripeContextInclude,
      });
      await tx.auditLog.create({
        data: {
          action: 'TENANT_RENT_PAYMENT_CONFIRMED_BY_STRIPE',
          resource: 'payment',
          resourceId: payment.id,
          newValue: JSON.stringify({
            stripeCheckoutSessionId: sessionId,
            stripePaymentIntentId: paymentIntentId,
            paidAmount,
            ownerProceedsAmount: settled.ownerProceedsAmount,
          }),
        },
      });
      return { settled: true as const, payment: settled };
    });
    if (!result.settled) return { paymentId, settled: false };

    const settled = result.payment;
    const tenantName = this.tenantName(settled.tenant);
    await this.emails.sendPaymentRecorded(
      settled.tenant.email,
      settled.paidAmount,
      settled.status,
      settled.id,
      settled.balanceDue,
      tenantName,
      `stripe-checkout-${sessionId}`,
    );
    if (settled.ownerProceedsAmount && settled.ownerProceedsAmount.gt(0)) {
      await this.emails.sendOwnerPayout(
        owner.contactEmail,
        {
          name: owner.ownerName ?? owner.companyName ?? 'Property owner',
          amount: settled.ownerProceedsAmount.toFixed(2),
          propertyName: settled.unit.property.name,
        },
        `stripe-owner-proceeds-${settled.id}`,
      );
    }
    return { paymentId, settled: true };
  }

  private async updateCheckoutFailure(
    session: Record<string, unknown>,
    status: StripeCheckoutStatus,
    action: string,
  ) {
    const paymentId = this.value(this.metadata(session), 'payment_id');
    const sessionId = this.value(session, 'id');
    if (!paymentId || !sessionId) return undefined;
    const result = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.payment.updateMany({
        where: {
          id: paymentId,
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
    return { paymentId, changed: result };
  }

  private async processCharge(record: Record<string, unknown>, type: string) {
    const paymentId = this.value(this.metadata(record), 'payment_id');
    if (!paymentId) return undefined;
    const chargeId = this.value(record, 'id');
    const transferId = this.value(record, 'transfer');
    if (type === 'charge.succeeded') {
      await this.prisma.payment.updateMany({
        where: { id: paymentId },
        data: {
          stripeChargeId: chargeId,
          stripeTransferId: transferId,
          stripeLastEventAt: new Date(),
        },
      });
      return { paymentId, action: 'charge_recorded' };
    }
    if (type === 'charge.refunded') {
      const amount = this.numberValue(record, 'amount');
      const refunded = this.numberValue(record, 'amount_refunded');
      if (amount !== undefined && refunded === amount) {
        await this.prisma.payment.updateMany({
          where: { id: paymentId, status: PaymentStatus.PAID },
          data: {
            status: PaymentStatus.REFUNDED,
            stripeLastEventAt: new Date(),
          },
        });
      }
      await this.prisma.auditLog.create({
        data: {
          action: 'STRIPE_RENT_PAYMENT_REFUND_RECORDED',
          resource: 'payment',
          resourceId: paymentId,
          newValue: JSON.stringify({ chargeId, amount, refunded }),
        },
      });
      return { paymentId, action: 'refund_recorded' };
    }
    if (type === 'charge.dispute.created') {
      await this.prisma.auditLog.create({
        data: {
          action: 'STRIPE_RENT_PAYMENT_DISPUTE_OPENED',
          resource: 'payment',
          resourceId: paymentId,
          newValue: JSON.stringify({ chargeId }),
        },
      });
      return { paymentId, action: 'dispute_recorded' };
    }
    return undefined;
  }

  private async processOwnerAccount(record: Record<string, unknown>) {
    const accountId = this.value(record, 'id');
    if (!accountId) return undefined;
    const configuration = record.configuration;
    const recipient =
      configuration && typeof configuration === 'object'
        ? (configuration as Record<string, unknown>).recipient
        : undefined;
    const capabilities =
      recipient && typeof recipient === 'object'
        ? (recipient as Record<string, unknown>).capabilities
        : undefined;
    const balance =
      capabilities && typeof capabilities === 'object'
        ? (capabilities as Record<string, unknown>).stripe_balance
        : undefined;
    const transfers =
      balance && typeof balance === 'object'
        ? (balance as Record<string, unknown>).stripe_transfers
        : undefined;
    const capabilityStatus =
      transfers && typeof transfers === 'object'
        ? this.value(transfers as Record<string, unknown>, 'status')
        : undefined;
    const status =
      capabilityStatus === 'active'
        ? PropertyOwnerPayoutStatus.ACTIVE
        : capabilityStatus === 'inactive' || !capabilityStatus
          ? PropertyOwnerPayoutStatus.PENDING_ONBOARDING
          : PropertyOwnerPayoutStatus.RESTRICTED;
    const owner = await this.prisma.propertyOwner.findUnique({
      where: { stripeConnectedAccountId: accountId },
    });
    if (!owner) return undefined;
    const becameActive =
      owner.payoutStatus !== PropertyOwnerPayoutStatus.ACTIVE &&
      status === PropertyOwnerPayoutStatus.ACTIVE;
    await this.prisma.$transaction(async (tx) => {
      await tx.propertyOwner.update({
        where: { id: owner.id },
        data: {
          payoutStatus: status,
          stripeAccountLastSyncedAt: new Date(),
          onboardedAt: becameActive ? new Date() : owner.onboardedAt,
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'PROPERTY_OWNER_STRIPE_CAPABILITY_UPDATED',
          resource: 'property_owner',
          resourceId: owner.id,
          newValue: JSON.stringify({ capabilityStatus, payoutStatus: status }),
        },
      });
    });
    if (becameActive) {
      await this.emails.sendOwnerStripeOnboardingCompleted(
        owner.contactEmail,
        { name: owner.ownerName ?? owner.companyName ?? 'Property owner' },
        owner.id,
      );
    }
    return { ownerId: owner.id };
  }

  async processStripeWebhook(event: StripeEvent) {
    const eventPayload = JSON.stringify(event);
    try {
      await this.prisma.stripeWebhookEvent.create({
        data: {
          stripeEventId: event.id,
          type: event.type,
          livemode: event.livemode,
          payload: eventPayload,
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
      let result: { paymentId?: string; ownerId?: string } | undefined;
      if (
        event.type === 'checkout.session.completed' &&
        this.value(event.data.object, 'payment_status') === 'paid'
      ) {
        result = await this.settleCheckout(event.data.object);
      } else if (event.type === 'checkout.session.async_payment_succeeded') {
        result = await this.settleCheckout(event.data.object);
      } else if (event.type === 'checkout.session.async_payment_failed') {
        result = await this.updateCheckoutFailure(
          event.data.object,
          StripeCheckoutStatus.FAILED,
          'TENANT_RENT_CHECKOUT_FAILED',
        );
      } else if (event.type === 'checkout.session.expired') {
        result = await this.updateCheckoutFailure(
          event.data.object,
          StripeCheckoutStatus.EXPIRED,
          'TENANT_RENT_CHECKOUT_EXPIRED',
        );
      } else if (
        [
          'charge.succeeded',
          'charge.refunded',
          'charge.dispute.created',
        ].includes(event.type)
      ) {
        result = await this.processCharge(event.data.object, event.type);
      } else if (
        event.type === 'v2.core.account[updated]' ||
        event.type === 'account.updated'
      ) {
        result = await this.processOwnerAccount(event.data.object);
      }
      await this.prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: {
          status: result
            ? StripeWebhookEventStatus.PROCESSED
            : StripeWebhookEventStatus.IGNORED,
          paymentId: result?.paymentId,
          processedAt: new Date(),
        },
      });
      return { received: true, duplicate: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: {
          status: StripeWebhookEventStatus.FAILED,
          processingError: message.slice(0, 4000),
        },
      });
      throw error;
    }
  }

  async processStripeConnectWebhook(event: StripeThinEvent) {
    const eventPayload = JSON.stringify(event);
    try {
      await this.prisma.stripeWebhookEvent.create({
        data: {
          stripeEventId: event.id,
          type: event.type,
          livemode: event.livemode,
          payload: eventPayload,
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
      let result: { ownerId?: string } | undefined;
      if (
        event.type ===
        'v2.core.account[configuration.recipient].capability_status_updated'
      ) {
        if (!this.stripe) {
          throw new BadRequestException('Stripe Connect is not configured yet');
        }
        const account = await this.stripe.retrieveConnectedAccount(
          event.related_object!.id!,
        );
        result = await this.processOwnerAccount(account);
      }
      await this.prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: {
          status: result
            ? StripeWebhookEventStatus.PROCESSED
            : StripeWebhookEventStatus.IGNORED,
          processedAt: new Date(),
        },
      });
      return { received: true, duplicate: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: {
          status: StripeWebhookEventStatus.FAILED,
          processingError: message.slice(0, 4000),
        },
      });
      throw error;
    }
  }

  async findOverdue() {
    return this.prisma.payment.findMany({
      where: {
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
        dueDate: { lt: new Date() },
      },
      include: { tenant: true },
    });
  }
}
