import { Injectable } from '@nestjs/common';
import {
  ListingType,
  MoveInChargeCategory,
  MoveInChargeStatus,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { EmailsService } from '../emails/emails.service';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_LEASE_STATUSES = ['active', 'expiring', 'renewed'];
const OPEN_PAYMENT_STATUSES = [
  PaymentStatus.PENDING,
  PaymentStatus.PARTIAL,
  PaymentStatus.OVERDUE,
];

const leaseWithTenantInclude = {
  tenant: true,
} satisfies Prisma.LeaseInclude;

const paymentWithBillingContextInclude = {
  tenant: true,
  lease: true,
} satisfies Prisma.PaymentInclude;

type BillingLease = Prisma.LeaseGetPayload<{
  include: typeof leaseWithTenantInclude;
}>;
type BillingPayment = Prisma.PaymentGetPayload<{
  include: typeof paymentWithBillingContextInclude;
}>;

export type RentalBillingRunResult = {
  billingPeriod: string;
  createdCharges: number;
  markedOverdue: number;
  lateFeesApplied: number;
};

@Injectable()
export class RentalBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: EmailsService,
  ) {}

  private startOfUtcMonth(value: Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
  }

  private nextUtcMonth(value: Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 1),
    );
  }

  private dueDate(billingPeriod: Date, dueDay: number, leaseStartDate: Date) {
    const configuredDueDate = new Date(
      Date.UTC(
        billingPeriod.getUTCFullYear(),
        billingPeriod.getUTCMonth(),
        dueDay,
      ),
    );
    const normalizedLeaseStartDate = new Date(
      Date.UTC(
        leaseStartDate.getUTCFullYear(),
        leaseStartDate.getUTCMonth(),
        leaseStartDate.getUTCDate(),
      ),
    );
    // A lease that starts after the normal monthly due day cannot be late
    // before its term begins. The initial charge remains a full monthly amount
    // because proration is a lease-specific staff decision, not an assumption.
    return normalizedLeaseStartDate > configuredDueDate
      ? normalizedLeaseStartDate
      : configuredDueDate;
  }

  private lateFeeAppliesAt(payment: BillingPayment) {
    // A five-day grace period for rent due on the first means the fee applies
    // at the start of the sixth. A zero-day grace period applies the next day.
    const graceDays = Math.max(1, payment.lease.gracePeriodDays);
    const due = payment.dueDate;
    return new Date(
      Date.UTC(
        due.getUTCFullYear(),
        due.getUTCMonth(),
        due.getUTCDate() + graceDays,
      ),
    );
  }

  private tenantName(tenant: { firstName: string; lastName: string }) {
    return `${tenant.firstName} ${tenant.lastName}`;
  }

  private formattedDueDate(value: Date) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(value);
  }

  async runDailyBillingCycle(
    actorUserId?: string,
    now = new Date(),
  ): Promise<RentalBillingRunResult> {
    await this.activateSignedRenewals(now, actorUserId);
    const billingPeriod = this.startOfUtcMonth(now);
    const nextBillingPeriod = this.nextUtcMonth(billingPeriod);
    const leases = await this.prisma.lease.findMany({
      where: {
        status: { in: ACTIVE_LEASE_STATUSES },
        startDate: { lt: nextBillingPeriod },
        endDate: { gte: billingPeriod },
        unit: { property: { listingType: ListingType.RENT } },
      },
      include: leaseWithTenantInclude,
    });

    const createdPayments: BillingPayment[] = [];
    for (const lease of leases) {
      const created = await this.createMonthlyCharge(
        lease,
        billingPeriod,
        nextBillingPeriod,
        actorUserId,
      );
      if (created) createdPayments.push(created);
    }

    await Promise.all(
      createdPayments.map((payment) =>
        this.emails.sendRentReminder(
          payment.tenant.email,
          payment.totalAmount,
          this.formattedDueDate(payment.dueDate),
          payment.id,
          this.tenantName(payment.tenant),
        ),
      ),
    );

    const overduePayments = await this.markEligiblePaymentsOverdue(
      now,
      actorUserId,
    );

    await Promise.all(
      overduePayments.map((payment) =>
        this.emails.sendLateNotice(
          payment.tenant.email,
          payment.rentAmount,
          payment.lateFee,
          payment.id,
          this.tenantName(payment.tenant),
        ),
      ),
    );

    return {
      billingPeriod: billingPeriod.toISOString().slice(0, 10),
      createdCharges: createdPayments.length,
      markedOverdue: overduePayments.length,
      lateFeesApplied: overduePayments.filter((payment) => payment.lateFee > 0)
        .length,
    };
  }

  private async activateSignedRenewals(now: Date, actorUserId?: string) {
    const renewals = await this.prisma.leaseRenewal.findMany({
      where: {
        status: 'SIGNED',
        activatedAt: null,
        proposedStartDate: { lte: now },
      },
      orderBy: [{ proposedStartDate: 'asc' }, { id: 'asc' }],
      take: 250,
    });
    for (const renewal of renewals) {
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.leaseRenewal.updateMany({
          where: { id: renewal.id, status: 'SIGNED', activatedAt: null },
          data: { activatedAt: now },
        });
        if (claimed.count !== 1) return;
        await tx.lease.update({
          where: { id: renewal.leaseId },
          data: {
            endDate: renewal.proposedEndDate,
            monthlyRent: renewal.proposedMonthlyRent.toNumber(),
            securityDeposit: renewal.proposedSecurityDeposit.toNumber(),
            rentDueDay: renewal.proposedRentDueDay,
            gracePeriodDays: renewal.proposedGracePeriodDays,
            lateFeeAmount: renewal.proposedLateFeeAmount.toNumber(),
            status: 'renewed',
          },
        });
        await tx.auditLog.create({
          data: {
            userId: actorUserId,
            action: 'LEASE_RENEWAL_TERMS_ACTIVATED',
            resource: 'lease_renewal',
            resourceId: renewal.id,
          },
        });
      });
    }
  }

  private async createMonthlyCharge(
    lease: BillingLease,
    billingPeriod: Date,
    nextBillingPeriod: Date,
    actorUserId?: string,
  ): Promise<BillingPayment | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // The second branch protects installations that have historical manual
        // payments recorded before billingPeriod was introduced.
        const existing = await tx.payment.findFirst({
          where: {
            leaseId: lease.id,
            purpose: PaymentPurpose.RENT,
            OR: [
              { billingPeriod },
              {
                billingPeriod: null,
                dueDate: { gte: billingPeriod, lt: nextBillingPeriod },
              },
            ],
          },
          select: { id: true },
        });
        if (existing) return null;
        const firstMonthCharge = await tx.moveInCharge.findFirst({
          where: {
            leaseId: lease.id,
            category: MoveInChargeCategory.FIRST_MONTH_RENT,
            billingPeriod,
            status: { not: MoveInChargeStatus.VOID },
          },
          select: { id: true },
        });
        if (firstMonthCharge) return null;

        const rentAmount = lease.monthlyRent;
        const payment = await tx.payment.create({
          data: {
            tenantId: lease.tenantId,
            leaseId: lease.id,
            unitId: lease.unitId,
            rentAmount,
            lateFee: 0,
            totalAmount: rentAmount,
            paidAmount: 0,
            balanceDue: rentAmount,
            dueDate: this.dueDate(
              billingPeriod,
              lease.rentDueDay,
              lease.startDate,
            ),
            billingPeriod,
            status: PaymentStatus.PENDING,
            purpose: PaymentPurpose.RENT,
            notes: 'Automatically generated monthly rent charge.',
          },
          include: paymentWithBillingContextInclude,
        });
        await tx.auditLog.create({
          data: {
            userId: actorUserId,
            action: 'RENT_PAYMENT_CYCLE_CREATED',
            resource: 'payment',
            resourceId: payment.id,
            newValue: JSON.stringify({
              leaseId: lease.id,
              billingPeriod: billingPeriod.toISOString().slice(0, 10),
              dueDate: payment.dueDate.toISOString(),
              totalAmount: payment.totalAmount,
            }),
          },
        });
        return payment;
      });
    } catch (error) {
      // The unique partial index handles concurrent Vercel invocations. A
      // duplicate means another job already made this month's charge.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return null;
      }
      throw error;
    }
  }

  private async markEligiblePaymentsOverdue(
    now: Date,
    actorUserId?: string,
  ): Promise<BillingPayment[]> {
    const candidates = await this.prisma.payment.findMany({
      where: {
        purpose: PaymentPurpose.RENT,
        status: { in: OPEN_PAYMENT_STATUSES },
        balanceDue: { gt: 0 },
        lease: { unit: { property: { listingType: ListingType.RENT } } },
      },
      include: paymentWithBillingContextInclude,
    });
    const changed: BillingPayment[] = [];

    for (const payment of candidates) {
      if (
        payment.status === PaymentStatus.OVERDUE ||
        now < this.lateFeeAppliesAt(payment)
      ) {
        continue;
      }
      const lateFee =
        payment.lateFee > 0 ? payment.lateFee : payment.lease.lateFeeAmount;
      const totalAmount = payment.rentAmount + lateFee;
      const balanceDue = Math.max(0, totalAmount - payment.paidAmount);
      const updated = await this.prisma.$transaction(async (tx) => {
        const result = await tx.payment.updateMany({
          where: {
            id: payment.id,
            updatedAt: payment.updatedAt,
            status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
          },
          data: {
            lateFee,
            totalAmount,
            balanceDue,
            status: PaymentStatus.OVERDUE,
          },
        });
        if (result.count !== 1) return null;
        const updatedPayment = await tx.payment.findUniqueOrThrow({
          where: { id: payment.id },
          include: paymentWithBillingContextInclude,
        });
        await tx.auditLog.create({
          data: {
            userId: actorUserId,
            action: 'RENT_PAYMENT_MARKED_OVERDUE',
            resource: 'payment',
            resourceId: payment.id,
            oldValue: JSON.stringify({
              status: payment.status,
              lateFee: payment.lateFee,
              totalAmount: payment.totalAmount,
              balanceDue: payment.balanceDue,
            }),
            newValue: JSON.stringify({
              status: updatedPayment.status,
              lateFee: updatedPayment.lateFee,
              totalAmount: updatedPayment.totalAmount,
              balanceDue: updatedPayment.balanceDue,
            }),
          },
        });
        return updatedPayment;
      });
      if (updated) changed.push(updated);
    }
    return changed;
  }
}
