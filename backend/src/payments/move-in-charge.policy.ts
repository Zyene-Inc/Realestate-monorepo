import {
  MoveInChargeCategory,
  MoveInChargePayoutTreatment,
  MoveInChargeSource,
  MoveInChargeStatus,
  Prisma,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import {
  AdjustMoveInChargeDto,
  CreateMoveInChargeItemDto,
} from './dto/move-in-charge.dto';

export const MOVE_IN_CHARGE_LABELS: Record<MoveInChargeCategory, string> = {
  FIRST_MONTH_RENT: 'First month rent',
  SECURITY_DEPOSIT: 'Security deposit',
  PET_FEE: 'Pet fee',
  UTILITY: 'Utility charge',
  MOVE_IN_FEE: 'Move-in fee',
  OTHER: 'Other move-in charge',
};

export const OPEN_MOVE_IN_CHARGE_STATUSES: MoveInChargeStatus[] = [
  MoveInChargeStatus.OPEN,
  MoveInChargeStatus.PARTIAL,
];

export function startOfUtcMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

export function chargeFingerprint(
  leaseId: string,
  item: CreateMoveInChargeItemDto,
) {
  return digest({
    leaseId,
    category: item.category,
    amount: item.amount.toFixed(2),
    dueDate: new Date(item.dueDate).toISOString().slice(0, 10),
    payoutTreatment: item.payoutTreatment,
    label: item.label?.trim() || MOVE_IN_CHARGE_LABELS[item.category],
    description: item.description?.trim() || null,
  });
}

export function adjustmentFingerprint(
  chargeId: string,
  data: AdjustMoveInChargeDto,
) {
  return digest({
    chargeId,
    action: data.action,
    reason: data.reason.trim(),
    amount: data.amount?.toFixed(2) ?? null,
    dueDate: data.dueDate
      ? new Date(data.dueDate).toISOString().slice(0, 10)
      : null,
    payoutTreatment: data.payoutTreatment ?? null,
    label: data.label?.trim() ?? null,
    description: data.description?.trim() ?? null,
  });
}

export function paymentFingerprint(input: {
  tenantId: string;
  leaseId: string;
  allocations: Array<{ chargeId: string; amount: number }>;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
}) {
  return digest({
    tenantId: input.tenantId,
    leaseId: input.leaseId,
    allocations: [...input.allocations]
      .sort((a, b) => a.chargeId.localeCompare(b.chargeId))
      .map((item) => ({
        chargeId: item.chargeId,
        amount: item.amount.toFixed(2),
      })),
    paymentMethod: input.paymentMethod ?? 'stripe_checkout',
    referenceNumber: input.referenceNumber?.trim() || null,
    notes: input.notes?.trim() || null,
  });
}

function digest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function moveInChargeStatus(values: {
  amount: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  refundedAmount: Prisma.Decimal;
  waivedAmount: Prisma.Decimal;
}) {
  const applied = values.paidAmount.minus(values.refundedAmount);
  const balance = values.amount.minus(applied).minus(values.waivedAmount);
  if (balance.lte(0)) {
    return values.waivedAmount.gt(0)
      ? MoveInChargeStatus.WAIVED
      : MoveInChargeStatus.PAID;
  }
  return applied.gt(0) ? MoveInChargeStatus.PARTIAL : MoveInChargeStatus.OPEN;
}

export function payoutSplit(
  allocations: Array<{
    amount: Prisma.Decimal;
    moveInCharge: {
      payoutTreatment: MoveInChargePayoutTreatment;
      commissionRate: Prisma.Decimal | null;
    };
  }>,
) {
  let management = new Prisma.Decimal(0);
  let owner = new Prisma.Decimal(0);
  for (const allocation of allocations) {
    const amount = allocation.amount.toDecimalPlaces(2);
    if (
      allocation.moveInCharge.payoutTreatment ===
      MoveInChargePayoutTreatment.JOHNSON_REALTY
    ) {
      management = management.plus(amount);
      continue;
    }
    if (
      allocation.moveInCharge.payoutTreatment ===
      MoveInChargePayoutTreatment.OWNER_FULL
    ) {
      owner = owner.plus(amount);
      continue;
    }
    const rate =
      allocation.moveInCharge.commissionRate ?? new Prisma.Decimal(0);
    const commission = amount.mul(rate).div(100).toDecimalPlaces(2);
    management = management.plus(commission);
    owner = owner.plus(amount.minus(commission));
  }
  return {
    managementCommissionAmount: management.toDecimalPlaces(2),
    ownerProceedsAmount: owner.toDecimalPlaces(2),
  };
}

export function standardMoveInChargeData(input: {
  tenantId: string;
  leaseId: string;
  unitId: string;
  startDate: Date;
  monthlyRent: number;
  securityDeposit: number;
  propertyOwnerId: string | null;
  commissionRate: Prisma.Decimal | null;
  postedByUserId: string;
}) {
  const dueDate = new Date(
    Date.UTC(
      input.startDate.getUTCFullYear(),
      input.startDate.getUTCMonth(),
      input.startDate.getUTCDate(),
    ),
  );
  const rows: Prisma.MoveInChargeCreateManyInput[] = [];
  if (input.monthlyRent > 0) {
    const amount = new Prisma.Decimal(input.monthlyRent.toFixed(2));
    rows.push({
      tenantId: input.tenantId,
      leaseId: input.leaseId,
      unitId: input.unitId,
      propertyOwnerId: input.propertyOwnerId,
      category: MoveInChargeCategory.FIRST_MONTH_RENT,
      label: MOVE_IN_CHARGE_LABELS.FIRST_MONTH_RENT,
      amount,
      balanceDue: amount,
      payoutTreatment: MoveInChargePayoutTreatment.OWNER_NET_OF_COMMISSION,
      commissionRate: input.commissionRate,
      source: MoveInChargeSource.LEASE_ACTIVATION,
      billingPeriod: startOfUtcMonth(dueDate),
      dueDate,
      postedByUserId: input.postedByUserId,
    });
  }
  if (input.securityDeposit > 0) {
    const amount = new Prisma.Decimal(input.securityDeposit.toFixed(2));
    rows.push({
      tenantId: input.tenantId,
      leaseId: input.leaseId,
      unitId: input.unitId,
      propertyOwnerId: input.propertyOwnerId,
      category: MoveInChargeCategory.SECURITY_DEPOSIT,
      label: MOVE_IN_CHARGE_LABELS.SECURITY_DEPOSIT,
      amount,
      balanceDue: amount,
      payoutTreatment: MoveInChargePayoutTreatment.OWNER_FULL,
      commissionRate: null,
      source: MoveInChargeSource.LEASE_ACTIVATION,
      dueDate,
      postedByUserId: input.postedByUserId,
    });
  }
  return rows;
}

export function serializeMoveInCharge<T extends Record<string, unknown>>(
  charge: T,
) {
  return {
    ...charge,
    amount: Number(charge.amount),
    paidAmount: Number(charge.paidAmount),
    waivedAmount: Number(charge.waivedAmount),
    refundedAmount: Number(charge.refundedAmount),
    balanceDue: Number(charge.balanceDue),
    commissionRate:
      charge.commissionRate === null || charge.commissionRate === undefined
        ? null
        : Number(charge.commissionRate),
  };
}
