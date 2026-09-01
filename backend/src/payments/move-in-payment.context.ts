import { MoveInChargeStatus, PaymentPurpose, Prisma } from '@prisma/client';
import { ConflictException } from '@nestjs/common';
import { OPEN_MOVE_IN_CHARGE_STATUSES } from './move-in-charge.policy';

export const chargePaymentInclude = {
  tenant: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  lease: { select: { id: true, status: true } },
  unit: {
    select: {
      id: true,
      unitNumber: true,
      property: {
        select: {
          id: true,
          name: true,
          owner: {
            select: {
              id: true,
              ownerName: true,
              companyName: true,
              contactEmail: true,
              stripeConnectedAccountId: true,
              payoutStatus: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.MoveInChargeInclude;

export const moveInPaymentInclude = {
  tenant: true,
  unit: {
    select: {
      unitNumber: true,
      property: {
        select: {
          name: true,
          owner: {
            select: {
              id: true,
              ownerName: true,
              companyName: true,
              contactEmail: true,
              stripeConnectedAccountId: true,
              payoutStatus: true,
            },
          },
        },
      },
    },
  },
  allocations: {
    include: { moveInCharge: true },
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
  },
} satisfies Prisma.PaymentInclude;

export type ChargeContext = Prisma.MoveInChargeGetPayload<{
  include: typeof chargePaymentInclude;
}>;
export type MoveInPaymentContext = Prisma.PaymentGetPayload<{
  include: typeof moveInPaymentInclude;
}>;

export function cents(amount: Prisma.Decimal | number) {
  return Math.round(Number(amount) * 100);
}

export function stripeValue(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

export function stripeNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

export function moveInPaymentId(record: Record<string, unknown>) {
  const metadata = record.metadata;
  return metadata && typeof metadata === 'object'
    ? stripeValue(metadata as Record<string, unknown>, 'move_in_payment_id')
    : undefined;
}

export function lockMoveInCharges(tx: Prisma.TransactionClient, ids: string[]) {
  return tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "MoveInCharge" WHERE "id" IN (${Prisma.join(
      [...ids].sort(),
    )}) ORDER BY "id" FOR UPDATE`,
  );
}

export function earliestDueDate(charges: ChargeContext[]) {
  return new Date(
    Math.min(...charges.map((charge) => charge.dueDate.getTime())),
  );
}

export function assertFreshBalances(
  charges: Array<{
    id: string;
    label: string;
    status: MoveInChargeStatus;
    balanceDue: Prisma.Decimal;
  }>,
  amountById: Map<string, Prisma.Decimal>,
) {
  if (charges.length !== amountById.size) {
    throw new ConflictException('Move-in charges changed; refresh and retry');
  }
  for (const charge of charges) {
    const amount = amountById.get(charge.id);
    if (
      !amount ||
      !OPEN_MOVE_IN_CHARGE_STATUSES.includes(charge.status) ||
      amount.gt(charge.balanceDue)
    ) {
      throw new ConflictException(`${charge.label} changed; refresh and retry`);
    }
  }
}

export function serializeMoveInPayment(payment: MoveInPaymentContext) {
  if (payment.purpose !== PaymentPurpose.MOVE_IN) return payment;
  return {
    ...payment,
    managementCommissionAmount:
      payment.managementCommissionAmount === null
        ? null
        : Number(payment.managementCommissionAmount),
    ownerProceedsAmount:
      payment.ownerProceedsAmount === null
        ? null
        : Number(payment.ownerProceedsAmount),
    allocations: payment.allocations.map((allocation) => ({
      ...allocation,
      amount: Number(allocation.amount),
      refundedAmount: Number(allocation.refundedAmount),
      moveInCharge: {
        ...allocation.moveInCharge,
        amount: Number(allocation.moveInCharge.amount),
        paidAmount: Number(allocation.moveInCharge.paidAmount),
        refundedAmount: Number(allocation.moveInCharge.refundedAmount),
        waivedAmount: Number(allocation.moveInCharge.waivedAmount),
        balanceDue: Number(allocation.moveInCharge.balanceDue),
        commissionRate:
          allocation.moveInCharge.commissionRate === null
            ? null
            : Number(allocation.moveInCharge.commissionRate),
      },
    })),
  };
}
