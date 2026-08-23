import { createHash } from 'node:crypto';
import { PaymentStatus } from '@prisma/client';

type RecordablePayment = {
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
};

export type PaymentRecordInput = {
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
};

export function resolvedPaymentStatus(data: {
  totalAmount: number;
  paidAmount?: number;
  status?: PaymentStatus;
}) {
  const paidAmount = data.paidAmount ?? 0;
  if (data.status === PaymentStatus.WAIVED) return PaymentStatus.WAIVED;
  if (paidAmount >= data.totalAmount) return PaymentStatus.PAID;
  if (data.status === PaymentStatus.OVERDUE) return PaymentStatus.OVERDUE;
  if (paidAmount > 0) return PaymentStatus.PARTIAL;
  return data.status ?? PaymentStatus.PENDING;
}

export function isSamePaymentRecordRequest(
  payment: RecordablePayment,
  data: PaymentRecordInput,
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
    payment.status === resolvedPaymentStatus(data) &&
    payment.notes === (data.notes ?? null)
  );
}

export function paymentRecordFingerprint(data: PaymentRecordInput) {
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
        status: resolvedPaymentStatus(data),
        notes: data.notes ?? null,
      }),
    )
    .digest('hex');
}
