import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  PARTIAL = 'PARTIAL',
  WAIVED = 'WAIVED',
  REFUNDED = 'REFUNDED',
}

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

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

  async recordPayment(data: {
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
  }, userId?: string) {
    // Prevent duplicate entries by reference number
    if (data.referenceNumber) {
      const existing = await this.prisma.payment.findFirst({
        where: { referenceNumber: data.referenceNumber } as any,
      });
      if (existing) {
        throw new BadRequestException(`Payment with reference number ${data.referenceNumber} already exists`);
      }
    }

    const paidAmount = data.paidAmount || 0;
    const balanceDue = Math.max(0, data.totalAmount - paidAmount);
    
    // Determine status if not provided
    let status = data.status || PaymentStatus.PENDING;
    if (paidAmount >= data.totalAmount) {
      status = PaymentStatus.PAID;
    } else if (paidAmount > 0) {
      status = PaymentStatus.PARTIAL;
    }

    const payment = await this.prisma.payment.create({
      data: {
        ...data,
        paidAmount,
        balanceDue,
        status,
        paidAt: status === PaymentStatus.PAID ? new Date() : null,
      } as any,
    });

    await this.auditLogs.log({
      userId,
      action: 'PAYMENT_RECORDED',
      resource: 'payment',
      resourceId: payment.id,
      newValue: JSON.stringify(payment),
    });

    return payment;
  }

  async updatePaymentStatus(paymentId: string, data: {
    status: PaymentStatus;
    paidAmount?: number;
    paymentMethod?: string;
    referenceNumber?: string;
    notes?: string;
    receiptUrl?: string;
  }, userId?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } }) as any;
    if (!payment) throw new NotFoundException('Payment not found');

    const paidAmount = data.paidAmount !== undefined ? data.paidAmount : payment.paidAmount;
    const balanceDue = Math.max(0, payment.totalAmount - paidAmount);

    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        ...data,
        paidAmount,
        balanceDue,
        paidAt: data.status === PaymentStatus.PAID ? new Date() : payment.paidAt,
      } as any,
    });

    await this.auditLogs.log({
      userId,
      action: 'PAYMENT_UPDATED',
      resource: 'payment',
      resourceId: paymentId,
      oldValue: JSON.stringify(payment),
      newValue: JSON.stringify(updatedPayment),
    });

    return updatedPayment;
  }

  async findOverdue() {
    return this.prisma.payment.findMany({
      where: {
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
        dueDate: { lt: new Date() },
      } as any,
      include: { tenant: true },
    });
  }
}
