import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentPurpose, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RecordMoveInPaymentDto } from './dto/move-in-charge.dto';
import {
  ChargeContext,
  assertFreshBalances,
  chargePaymentInclude,
  earliestDueDate,
  lockMoveInCharges,
  moveInPaymentInclude,
  serializeMoveInPayment,
} from './move-in-payment.context';
import { MoveInPaymentNotificationsService } from './move-in-payment-notifications.service';
import {
  OPEN_MOVE_IN_CHARGE_STATUSES,
  moveInChargeStatus,
  paymentFingerprint,
  payoutSplit,
} from './move-in-charge.policy';

@Injectable()
export class MoveInPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: MoveInPaymentNotificationsService,
  ) {}

  async recordManual(userId: string, data: RecordMoveInPaymentDto) {
    const ids = data.allocations.map((item) => item.chargeId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'Each charge can appear only once in a payment',
      );
    }
    const charges = await this.loadCharges(ids);
    const context = this.assertAllocatable(charges, data.allocations);
    const fingerprint = paymentFingerprint({
      tenantId: context.tenant.id,
      leaseId: context.lease.id,
      allocations: data.allocations,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber,
      notes: data.notes,
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
          'This payment request ID was already used with different details',
        );
      }
      return serializeMoveInPayment(existing);
    }

    const allocationMap = new Map(
      data.allocations.map((item) => [
        item.chargeId,
        new Prisma.Decimal(item.amount.toFixed(2)),
      ]),
    );
    const split = payoutSplit(
      charges.map((charge) => ({
        amount: allocationMap.get(charge.id)!,
        moveInCharge: charge,
      })),
    );
    const total = [...allocationMap.values()].reduce(
      (sum, amount) => sum.plus(amount),
      new Prisma.Decimal(0),
    );
    let payment;
    try {
      payment = await this.prisma.$transaction(async (tx) => {
        await lockMoveInCharges(tx, ids);
        const fresh = await tx.moveInCharge.findMany({
          where: { id: { in: ids } },
          orderBy: { id: 'asc' },
        });
        assertFreshBalances(fresh, allocationMap);
        const created = await tx.payment.create({
          data: {
            tenantId: context.tenant.id,
            leaseId: context.lease.id,
            unitId: context.unit.id,
            propertyOwnerId: context.unit.property.owner?.id ?? null,
            purpose: PaymentPurpose.MOVE_IN,
            rentAmount: 0,
            lateFee: 0,
            totalAmount: Number(total),
            paidAmount: Number(total),
            balanceDue: 0,
            status: PaymentStatus.PAID,
            paymentMethod: data.paymentMethod,
            referenceNumber: data.referenceNumber?.trim() || null,
            notes: data.notes?.trim() || null,
            dueDate: earliestDueDate(charges),
            paidAt: new Date(),
            idempotencyKey: data.clientRequestId,
            recordRequestFingerprint: fingerprint,
            managementCommissionAmount: split.managementCommissionAmount,
            ownerProceedsAmount: split.ownerProceedsAmount,
            allocations: {
              create: data.allocations.map((item) => ({
                moveInChargeId: item.chargeId,
                amount: new Prisma.Decimal(item.amount.toFixed(2)),
              })),
            },
          },
          include: moveInPaymentInclude,
        });
        for (const charge of fresh) {
          const amount = allocationMap.get(charge.id)!;
          const paidAmount = charge.paidAmount.plus(amount);
          await tx.moveInCharge.update({
            where: { id: charge.id },
            data: {
              paidAmount,
              balanceDue: charge.balanceDue.minus(amount),
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
            userId,
            action: 'MOVE_IN_PAYMENT_RECORDED',
            resource: 'payment',
            resourceId: created.id,
            newValue: JSON.stringify({
              total: total.toFixed(2),
              allocations: data.allocations,
              paymentMethod: data.paymentMethod,
            }),
          },
        });
        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          data.referenceNumber
            ? 'That payment reference or request ID is already recorded'
            : 'That payment request is already recorded',
        );
      }
      throw error;
    }
    await this.notifications.paymentRecorded(payment, `manual-${payment.id}`);
    return serializeMoveInPayment(payment);
  }

  private async loadCharges(ids: string[]) {
    const charges = await this.prisma.moveInCharge.findMany({
      where: { id: { in: ids } },
      include: chargePaymentInclude,
      orderBy: { id: 'asc' },
    });
    if (charges.length !== ids.length) {
      throw new NotFoundException('One or more move-in charges were not found');
    }
    return charges;
  }

  private assertAllocatable(
    charges: ChargeContext[],
    allocations: Array<{ chargeId: string; amount: number }>,
  ) {
    if (!charges.length || charges.length !== allocations.length) {
      throw new NotFoundException('One or more move-in charges were not found');
    }
    const first = charges[0];
    const amountById = new Map(
      allocations.map((item) => [
        item.chargeId,
        new Prisma.Decimal(item.amount.toFixed(2)),
      ]),
    );
    for (const charge of charges) {
      if (
        charge.leaseId !== first.leaseId ||
        charge.tenantId !== first.tenantId ||
        charge.unitId !== first.unitId
      ) {
        throw new BadRequestException(
          'A payment can include charges from only one lease',
        );
      }
      const amount = amountById.get(charge.id);
      if (
        !amount ||
        !OPEN_MOVE_IN_CHARGE_STATUSES.includes(charge.status) ||
        amount.lte(0) ||
        amount.gt(charge.balanceDue)
      ) {
        throw new BadRequestException(
          `${charge.label} does not have the requested balance available`,
        );
      }
    }
    return first;
  }
}
