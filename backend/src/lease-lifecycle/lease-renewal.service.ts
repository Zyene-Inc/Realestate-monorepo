import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ESignatureDocumentType,
  ESignatureTargetType,
  LeaseRenewalStatus,
  NoticeToVacateStatus,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ESignaturesService } from '../e-signatures/e-signatures.service';
import { VerdocsService } from '../e-signatures/verdocs.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRenewalDto } from './dto/lease-lifecycle.dto';
import { LeaseLifecycleNotificationsService } from './lease-lifecycle-notifications.service';
import {
  LeaseLifecycleService,
  type LifecycleActor,
} from './lease-lifecycle.service';

const OPEN_RENEWAL_STATUSES: LeaseRenewalStatus[] = [
  LeaseRenewalStatus.DRAFT,
  LeaseRenewalStatus.SIGNING,
];
const CURRENT_LEASE_STATUSES = ['active', 'expiring', 'renewed'];
const OPEN_NOTICE_STATUSES: NoticeToVacateStatus[] = [
  NoticeToVacateStatus.SUBMITTED,
  NoticeToVacateStatus.ACKNOWLEDGED,
  NoticeToVacateStatus.MOVE_OUT_IN_PROGRESS,
];

@Injectable()
export class LeaseRenewalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: LeaseLifecycleNotificationsService,
    private readonly eSignatures: ESignaturesService,
    private readonly verdocs: VerdocsService,
    private readonly lifecycle: LeaseLifecycleService,
  ) {}

  async createRenewal(
    actor: LifecycleActor,
    leaseId: string,
    data: CreateRenewalDto,
  ) {
    const start = new Date(data.proposedStartDate);
    const end = new Date(data.proposedEndDate);
    const expires = new Date(data.offerExpiresAt);
    if (expires <= new Date() || expires >= start) {
      throw new BadRequestException(
        'The renewal response deadline must be before the proposed start date',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id"
        FROM "Lease"
        WHERE "id" = ${leaseId}
        FOR UPDATE
      `;
      const lease = await tx.lease.findUnique({
        where: { id: leaseId },
        include: {
          renewals: { where: { status: { in: OPEN_RENEWAL_STATUSES } } },
          vacateNotices: { where: { status: { in: OPEN_NOTICE_STATUSES } } },
        },
      });
      if (!lease) throw new NotFoundException('Lease not found');
      if (!CURRENT_LEASE_STATUSES.includes(lease.status)) {
        throw new ConflictException(
          'Only a current lease can receive a renewal offer',
        );
      }
      if (start <= lease.endDate || end <= start) {
        throw new BadRequestException(
          'Renewal dates must begin after the current lease and end after the new start date',
        );
      }
      if (lease.renewals.length > 0)
        throw new ConflictException('This lease already has an open renewal');
      if (lease.vacateNotices.length > 0)
        throw new ConflictException(
          'Cancel the active notice to vacate before creating a renewal offer',
        );
      const renewal = await tx.leaseRenewal.create({
        data: {
          leaseId,
          proposedStartDate: start,
          proposedEndDate: end,
          proposedMonthlyRent: new Prisma.Decimal(data.proposedMonthlyRent),
          proposedSecurityDeposit: new Prisma.Decimal(
            data.proposedSecurityDeposit,
          ),
          proposedRentDueDay: data.proposedRentDueDay,
          proposedGracePeriodDays: data.proposedGracePeriodDays,
          proposedLateFeeAmount: new Prisma.Decimal(data.proposedLateFeeAmount),
          offerExpiresAt: expires,
          internalNotes: data.internalNotes?.trim(),
          createdByUserId: actor.id,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: 'LEASE_RENEWAL_DRAFT_CREATED',
          resource: 'lease_renewal',
          resourceId: renewal.id,
          newValue: JSON.stringify({
            leaseId,
            proposedEndDate: data.proposedEndDate,
          }),
        },
      });
      return renewal;
    });
  }

  async cancelRenewal(actor: LifecycleActor, id: string) {
    const renewal = await this.prisma.leaseRenewal.findUnique({
      where: { id },
      include: { lease: { include: { vacateNotices: true } } },
    });
    if (!renewal) throw new NotFoundException('Renewal offer not found');
    if (!OPEN_RENEWAL_STATUSES.includes(renewal.status)) {
      throw new ConflictException('Only an open renewal offer can be canceled');
    }
    if (renewal.envelopeId)
      await this.eSignatures.cancel(actor, renewal.envelopeId);
    const hasOpenNotice = renewal.lease.vacateNotices.some((notice) =>
      OPEN_NOTICE_STATUSES.includes(notice.status),
    );
    await this.prisma.$transaction([
      this.prisma.leaseRenewal.update({
        where: { id },
        data: { status: LeaseRenewalStatus.CANCELED, canceledAt: new Date() },
      }),
      this.prisma.lease.update({
        where: { id: renewal.leaseId },
        data: { status: hasOpenNotice ? 'expiring' : 'active' },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: actor.id,
          action: 'LEASE_RENEWAL_CANCELED',
          resource: 'lease_renewal',
          resourceId: id,
        },
      }),
    ]);
    return this.lifecycle.getLease(renewal.leaseId);
  }

  async sendRenewal(actor: LifecycleActor, id: string) {
    const renewal = await this.prisma.leaseRenewal.findUnique({
      where: { id },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: { include: { property: true } },
          },
        },
      },
    });
    if (!renewal) throw new NotFoundException('Renewal offer not found');
    if (renewal.status !== LeaseRenewalStatus.DRAFT) {
      throw new ConflictException('Only a draft renewal can be sent');
    }
    if (renewal.offerExpiresAt <= new Date()) {
      throw new ConflictException(
        'This renewal response deadline has expired; create a new offer',
      );
    }
    const hasOpenNotice = await this.prisma.noticeToVacate.findFirst({
      where: {
        leaseId: renewal.leaseId,
        status: { in: OPEN_NOTICE_STATUSES },
      },
      select: { id: true },
    });
    if (hasOpenNotice) {
      throw new ConflictException(
        'Cancel the active notice to vacate before sending a renewal offer',
      );
    }
    const templateId = this.verdocs.templateIdFor(ESignatureDocumentType.LEASE);
    if (!templateId)
      throw new ConflictException(
        'The Verdocs lease template is not configured',
      );
    const template = await this.verdocs.template(templateId);
    const roles = (template.roles ?? []).filter((role) =>
      ['signer', 'approver'].includes(role.type),
    );
    if (roles.length !== 1)
      throw new ConflictException(
        'The lease template must have exactly one signing role',
      );
    const lease = renewal.lease;
    const envelope = await this.eSignatures.create(
      actor,
      {
        clientRequestId: randomUUID(),
        templateId,
        documentType: ESignatureDocumentType.LEASE,
        targetType: ESignatureTargetType.TENANT,
        targetId: lease.tenantId,
        leaseId: lease.id,
        recipientRoleName: roles[0].name,
        title: `Lease renewal: ${lease.unit.property.name}, unit ${lease.unit.unitNumber}`,
        expiresAt: renewal.offerExpiresAt.toISOString(),
      },
      {
        lease_tenant_name: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
        lease_property_address: lease.unit.property.address,
        lease_unit_number: lease.unit.unitNumber,
        lease_start_date: this.date(renewal.proposedStartDate),
        lease_end_date: this.date(renewal.proposedEndDate),
        lease_monthly_rent: renewal.proposedMonthlyRent.toFixed(2),
        lease_security_deposit: renewal.proposedSecurityDeposit.toFixed(2),
        lease_rent_due_day: String(renewal.proposedRentDueDay),
        lease_grace_period_days: String(renewal.proposedGracePeriodDays),
        lease_late_fee: renewal.proposedLateFeeAmount.toFixed(2),
      },
    );
    await this.prisma.$transaction([
      this.prisma.leaseRenewal.update({
        where: { id },
        data: {
          status: LeaseRenewalStatus.SIGNING,
          envelopeId: envelope.id,
          sentAt: new Date(),
        },
      }),
      this.prisma.lease.update({
        where: { id: lease.id },
        data: { status: 'expiring' },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: actor.id,
          action: 'LEASE_RENEWAL_SENT_FOR_SIGNATURE',
          resource: 'lease_renewal',
          resourceId: id,
          newValue: JSON.stringify({ envelopeId: envelope.id }),
        },
      }),
    ]);
    await this.notifications.renewalOffered(
      lease.tenant.email,
      {
        name: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
        propertyName: lease.unit.property.name,
        endDate: this.date(renewal.proposedEndDate),
        monthlyRent: renewal.proposedMonthlyRent.toFixed(2),
        responseDue: this.date(renewal.offerExpiresAt),
      },
      id,
    );
    return this.lifecycle.getLease(lease.id);
  }
  private date(value: Date) {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(value);
  }
}
