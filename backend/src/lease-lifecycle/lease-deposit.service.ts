import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SecurityDepositDispositionStatus,
  SecurityDepositLedgerEntryType,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateDepositDeductionDto,
  IssueDepositReturnDto,
} from './dto/lease-lifecycle.dto';
import { LeaseLifecycleNotificationsService } from './lease-lifecycle-notifications.service';
import {
  LeaseLifecycleService,
  type LifecycleActor,
} from './lease-lifecycle.service';

@Injectable()
export class LeaseDepositService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: LeaseLifecycleNotificationsService,
    private readonly lifecycle: LeaseLifecycleService,
  ) {}

  async addDeduction(
    actor: LifecycleActor,
    id: string,
    data: CreateDepositDeductionDto,
  ) {
    const leaseId = await this.prisma.$transaction(async (tx) => {
      await this.lockDisposition(tx, id);
      const disposition = await tx.securityDepositDisposition.findUnique({
        where: { id },
        include: { deductions: true },
      });
      if (!disposition)
        throw new NotFoundException('Security deposit disposition not found');
      if (disposition.status !== SecurityDepositDispositionStatus.DRAFT)
        throw new ConflictException(
          'Deductions lock after the itemized statement is finalized',
        );
      const total = disposition.deductions.reduce(
        (sum, row) => sum.plus(row.amount),
        new Prisma.Decimal(data.amount),
      );
      if (total.greaterThan(disposition.amountHeld))
        throw new BadRequestException(
          'Deductions cannot exceed the verified security deposit held',
        );
      await tx.securityDepositDeduction.create({
        data: {
          dispositionId: id,
          category: data.category,
          description: data.description.trim(),
          amount: new Prisma.Decimal(data.amount),
        },
      });
      await tx.securityDepositDisposition.update({
        where: { id },
        data: {
          deductionsTotal: total,
          refundAmount: disposition.amountHeld.minus(total),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: 'SECURITY_DEPOSIT_DEDUCTION_ADDED',
          resource: 'security_deposit_disposition',
          resourceId: id,
          newValue: JSON.stringify({
            category: data.category,
            amount: data.amount,
          }),
        },
      });
      return disposition.leaseId;
    });
    return this.lifecycle.getLease(leaseId);
  }

  async removeDeduction(actor: LifecycleActor, id: string) {
    const leaseId = await this.prisma.$transaction(async (tx) => {
      const target = await tx.securityDepositDeduction.findUnique({
        where: { id },
        select: { dispositionId: true },
      });
      if (!target) throw new NotFoundException('Deposit deduction not found');
      await this.lockDisposition(tx, target.dispositionId);
      const deduction = await tx.securityDepositDeduction.findUnique({
        where: { id },
        include: { disposition: { include: { deductions: true } } },
      });
      if (!deduction)
        throw new NotFoundException('Deposit deduction not found');
      if (
        deduction.disposition.status !== SecurityDepositDispositionStatus.DRAFT
      )
        throw new ConflictException('A finalized deduction cannot be deleted');
      const total = deduction.disposition.deductions
        .filter((row) => row.id !== id)
        .reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0));
      await tx.securityDepositDeduction.delete({ where: { id } });
      await tx.securityDepositDisposition.update({
        where: { id: deduction.dispositionId },
        data: {
          deductionsTotal: total,
          refundAmount: deduction.disposition.amountHeld.minus(total),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: 'SECURITY_DEPOSIT_DEDUCTION_REMOVED',
          resource: 'security_deposit_disposition',
          resourceId: deduction.dispositionId,
          oldValue: JSON.stringify({
            deductionId: id,
            amount: deduction.amount.toFixed(2),
          }),
        },
      });
      return deduction.disposition.leaseId;
    });
    return this.lifecycle.getLease(leaseId);
  }

  async finalize(actor: LifecycleActor, id: string) {
    const disposition = await this.prisma.$transaction(async (tx) => {
      await this.lockDisposition(tx, id);
      const current = await tx.securityDepositDisposition.findUnique({
        where: { id },
        include: {
          deductions: true,
          tenant: true,
          unit: { include: { property: true } },
        },
      });
      if (!current)
        throw new NotFoundException('Security deposit disposition not found');
      if (current.status !== SecurityDepositDispositionStatus.DRAFT)
        throw new ConflictException(
          'The itemized statement is already finalized',
        );
      if (current.amountHeld.greaterThan(0))
        await tx.securityDepositLedgerEntry.create({
          data: this.ledger(
            current,
            SecurityDepositLedgerEntryType.OPENING_BALANCE,
            current.amountHeld,
            'Verified security deposit held at move-out',
            randomUUID(),
            actor.id,
          ),
        });
      for (const deduction of current.deductions) {
        await tx.securityDepositLedgerEntry.create({
          data: this.ledger(
            current,
            SecurityDepositLedgerEntryType.DEDUCTION,
            deduction.amount.negated(),
            `${deduction.category}: ${deduction.description}`,
            randomUUID(),
            actor.id,
          ),
        });
      }
      await tx.securityDepositDisposition.update({
        where: { id },
        data: {
          status: SecurityDepositDispositionStatus.ITEMIZED,
          itemizedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: 'SECURITY_DEPOSIT_ITEMIZATION_FINALIZED',
          resource: 'security_deposit_disposition',
          resourceId: id,
        },
      });
      return current;
    });
    await this.notifications.depositItemized(
      disposition.tenant.email,
      {
        name: `${disposition.tenant.firstName} ${disposition.tenant.lastName}`,
        propertyName: disposition.unit.property.name,
        deductions: disposition.deductionsTotal.toFixed(2),
        refund: disposition.refundAmount.toFixed(2),
        dueDate: this.date(disposition.dueDate),
      },
      id,
    );
    return this.lifecycle.getLease(disposition.leaseId);
  }

  async issue(actor: LifecycleActor, id: string, data: IssueDepositReturnDto) {
    const leaseId = await this.prisma.$transaction(async (tx) => {
      await this.lockDisposition(tx, id);
      const disposition = await tx.securityDepositDisposition.findUnique({
        where: { id },
      });
      if (!disposition)
        throw new NotFoundException('Security deposit disposition not found');
      if (disposition.issueRequestId === data.requestId)
        return disposition.leaseId;
      if (disposition.status !== SecurityDepositDispositionStatus.ITEMIZED)
        throw new ConflictException(
          'Finalize the itemized statement before issuing the return',
        );
      if (
        await tx.securityDepositDisposition.findUnique({
          where: { issueRequestId: data.requestId },
        })
      )
        throw new ConflictException(
          'This request ID was already used for another deposit return',
        );
      if (disposition.refundAmount.greaterThan(0))
        await tx.securityDepositLedgerEntry.create({
          data: this.ledger(
            disposition,
            SecurityDepositLedgerEntryType.REFUND,
            disposition.refundAmount.negated(),
            `Security deposit return issued by ${data.returnMethod}`,
            data.requestId,
            actor.id,
          ),
        });
      await tx.securityDepositDisposition.update({
        where: { id },
        data: {
          status: SecurityDepositDispositionStatus.ISSUED,
          returnMethod: data.returnMethod,
          returnReference: data.returnReference.trim(),
          issueRequestId: data.requestId,
          internalNotes: data.internalNotes?.trim(),
          issuedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: 'SECURITY_DEPOSIT_RETURN_ISSUED',
          resource: 'security_deposit_disposition',
          resourceId: id,
        },
      });
      return disposition.leaseId;
    });
    return this.lifecycle.getLease(leaseId);
  }

  async dispute(userId: string, id: string, reason: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Tenant profile not found');
    const disposition = await this.prisma.securityDepositDisposition.findFirst({
      where: { id, tenantId: tenant.id },
    });
    if (!disposition)
      throw new NotFoundException('Security deposit disposition not found');
    const disputableStatuses: SecurityDepositDispositionStatus[] = [
      SecurityDepositDispositionStatus.ITEMIZED,
      SecurityDepositDispositionStatus.ISSUED,
    ];
    if (!disputableStatuses.includes(disposition.status))
      throw new ConflictException(
        'This deposit statement is not open for a dispute',
      );
    await this.prisma.$transaction([
      this.prisma.securityDepositDisposition.update({
        where: { id },
        data: {
          status: SecurityDepositDispositionStatus.DISPUTED,
          disputedFromStatus: disposition.status,
          disputeReason: reason.trim(),
          disputedAt: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'SECURITY_DEPOSIT_DISPUTED',
          resource: 'security_deposit_disposition',
          resourceId: id,
        },
      }),
    ]);
    return this.lifecycle.getMine(userId);
  }

  async resolveDispute(actor: LifecycleActor, id: string, notes: string) {
    const disposition = await this.prisma.securityDepositDisposition.findUnique(
      { where: { id } },
    );
    if (!disposition)
      throw new NotFoundException('Security deposit disposition not found');
    if (
      disposition.status !== SecurityDepositDispositionStatus.DISPUTED ||
      !disposition.disputedFromStatus
    ) {
      throw new ConflictException(
        'This deposit return does not have an open dispute',
      );
    }
    await this.prisma.$transaction([
      this.prisma.securityDepositDisposition.update({
        where: { id },
        data: {
          status: disposition.disputedFromStatus,
          internalNotes: [
            disposition.internalNotes,
            `Dispute resolution: ${notes.trim()}`,
          ]
            .filter(Boolean)
            .join('\n'),
          disputedFromStatus: null,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: actor.id,
          action: 'SECURITY_DEPOSIT_DISPUTE_RESOLVED',
          resource: 'security_deposit_disposition',
          resourceId: id,
        },
      }),
    ]);
    return this.lifecycle.getLease(disposition.leaseId);
  }

  async markReturned(actor: LifecycleActor, id: string) {
    const disposition = await this.prisma.securityDepositDisposition.findUnique(
      {
        where: { id },
        include: { tenant: true, unit: { include: { property: true } } },
      },
    );
    if (!disposition)
      throw new NotFoundException('Security deposit disposition not found');
    if (
      disposition.status !== SecurityDepositDispositionStatus.ISSUED ||
      !disposition.proofStoragePath
    )
      throw new ConflictException(
        'Attach proof of return before marking the deposit complete',
      );
    await this.prisma.$transaction([
      this.prisma.securityDepositDisposition.update({
        where: { id },
        data: {
          status: SecurityDepositDispositionStatus.RETURNED,
          returnedAt: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: actor.id,
          action: 'SECURITY_DEPOSIT_RETURN_CONFIRMED',
          resource: 'security_deposit_disposition',
          resourceId: id,
        },
      }),
    ]);
    await this.notifications.depositReturned(
      disposition.tenant.email,
      {
        name: `${disposition.tenant.firstName} ${disposition.tenant.lastName}`,
        propertyName: disposition.unit.property.name,
        refund: disposition.refundAmount.toFixed(2),
        method: disposition.returnMethod,
        reference: disposition.returnReference,
      },
      id,
    );
    return this.lifecycle.getLease(disposition.leaseId);
  }

  private ledger(
    disposition: {
      id: string;
      leaseId: string;
      tenantId: string;
      unitId: string;
    },
    entryType: SecurityDepositLedgerEntryType,
    amount: Prisma.Decimal,
    description: string,
    idempotencyKey: string,
    postedByUserId: string,
  ) {
    return {
      dispositionId: disposition.id,
      leaseId: disposition.leaseId,
      tenantId: disposition.tenantId,
      unitId: disposition.unitId,
      entryType,
      amount,
      description,
      idempotencyKey,
      postedByUserId,
      occurredAt: new Date(),
    };
  }

  private async lockDisposition(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`
      SELECT "id"
      FROM "SecurityDepositDisposition"
      WHERE "id" = ${id}
      FOR UPDATE
    `;
  }

  private date(value: Date) {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(value);
  }
}
