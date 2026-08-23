import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailsService } from '../emails/emails.service';
import { PaymentStatus, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';

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

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private emails: EmailsService,
  ) {}

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
      include: { tenant: true, lease: true, unit: true },
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
