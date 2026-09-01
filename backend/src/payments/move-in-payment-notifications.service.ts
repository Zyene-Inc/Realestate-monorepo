import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailsService } from '../emails/emails.service';
import { OPEN_MOVE_IN_CHARGE_STATUSES } from './move-in-charge.policy';
import type { MoveInPaymentContext } from './move-in-payment.context';

@Injectable()
export class MoveInPaymentNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: EmailsService,
  ) {}

  async paymentRecorded(payment: MoveInPaymentContext, eventKey: string) {
    const remaining = await this.prisma.moveInCharge.aggregate({
      where: {
        tenantId: payment.tenantId,
        leaseId: payment.leaseId,
        status: { in: OPEN_MOVE_IN_CHARGE_STATUSES },
      },
      _sum: { balanceDue: true },
    });
    await this.emails.sendMoveInPaymentRecorded(
      payment.tenant.email,
      {
        name: `${payment.tenant.firstName} ${payment.tenant.lastName}`,
        propertyName: payment.unit.property.name,
        amount: payment.paidAmount - payment.refundedAmount,
        balanceDue: Number(remaining._sum.balanceDue ?? 0),
      },
      eventKey,
    );
    const owner = payment.unit.property.owner;
    if (owner && payment.ownerProceedsAmount?.gt(0)) {
      await this.emails.sendOwnerPayout(
        owner.contactEmail,
        {
          name: owner.ownerName ?? owner.companyName ?? 'Property owner',
          amount: payment.ownerProceedsAmount.toFixed(2),
          propertyName: payment.unit.property.name,
        },
        `${eventKey}-owner`,
      );
    }
  }
}
