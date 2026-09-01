import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeaseRenewalStatus,
  MoveOutInspectionStatus,
  NoticeToVacateSource,
  NoticeToVacateStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { LeaseLifecycleNotificationsService } from './lease-lifecycle-notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateVacateNoticeDto,
  LifecycleListQueryDto,
  ScheduleMoveOutInspectionDto,
} from './dto/lease-lifecycle.dto';

const CURRENT_LEASE_STATUSES = ['active', 'expiring', 'renewed'];
const OPEN_RENEWAL_STATUSES: LeaseRenewalStatus[] = [
  LeaseRenewalStatus.DRAFT,
  LeaseRenewalStatus.SIGNING,
];
const OPEN_NOTICE_STATUSES: NoticeToVacateStatus[] = [
  NoticeToVacateStatus.SUBMITTED,
  NoticeToVacateStatus.ACKNOWLEDGED,
  NoticeToVacateStatus.MOVE_OUT_IN_PROGRESS,
];
const defaultMoveOutItems = [
  ['Entry', 'Doors and locks'],
  ['Living areas', 'Walls and ceilings'],
  ['Living areas', 'Floors and carpet'],
  ['Kitchen', 'Appliances'],
  ['Kitchen', 'Cabinets and counters'],
  ['Bathrooms', 'Fixtures and surfaces'],
  ['Bedrooms', 'Walls, floors, and closets'],
  ['Safety', 'Smoke and carbon monoxide devices'],
  ['Exterior', 'Patio, yard, or balcony'],
] as const;

const lifecycleInclude = {
  tenant: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  unit: {
    select: {
      id: true,
      unitNumber: true,
      status: true,
      property: { select: { id: true, name: true, address: true } },
    },
  },
  renewals: {
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    take: 5,
    include: {
      envelope: { select: { id: true, status: true, archivedAt: true } },
    },
  },
  vacateNotices: {
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    take: 5,
    include: {
      inspection: {
        include: {
          items: {
            orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
          },
          disposition: {
            include: {
              deductions: {
                orderBy: [
                  { createdAt: 'asc' as const },
                  { id: 'asc' as const },
                ],
              },
              ledgerEntries: {
                orderBy: [
                  { occurredAt: 'asc' as const },
                  { id: 'asc' as const },
                ],
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.LeaseInclude;

export type LifecycleActor = { id: string; role: Role; email: string };

@Injectable()
export class LeaseLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: LeaseLifecycleNotificationsService,
  ) {}

  async listAdmin(query: LifecycleListQueryDto) {
    return this.prisma.lease.findMany({
      where: { status: { in: [...CURRENT_LEASE_STATUSES, 'terminated'] } },
      include: lifecycleInclude,
      orderBy: [{ endDate: 'asc' }, { id: 'asc' }],
      take: query.limit,
    });
  }

  async getMine(userId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Tenant profile not found');
    return this.prisma.lease.findFirst({
      where: {
        tenantId: tenant.id,
        status: { in: [...CURRENT_LEASE_STATUSES, 'terminated'] },
      },
      include: lifecycleInclude,
      orderBy: [{ endDate: 'desc' }, { id: 'desc' }],
    });
  }

  async getLease(id: string) {
    const lease = await this.prisma.lease.findUnique({
      where: { id },
      include: lifecycleInclude,
    });
    if (!lease) throw new NotFoundException('Lease not found');
    return lease;
  }

  async createAdminNotice(
    actor: LifecycleActor,
    leaseId: string,
    data: CreateVacateNoticeDto,
  ) {
    return this.createNotice(
      actor.id,
      leaseId,
      data.source ?? NoticeToVacateSource.MANAGEMENT,
      data,
    );
  }

  async createTenantNotice(userId: string, data: CreateVacateNoticeDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Tenant profile not found');
    const lease = await this.prisma.lease.findFirst({
      where: { tenantId: tenant.id, status: { in: CURRENT_LEASE_STATUSES } },
      orderBy: { endDate: 'desc' },
    });
    if (!lease)
      throw new ConflictException('No current lease is available for notice');
    return this.createNotice(
      userId,
      lease.id,
      NoticeToVacateSource.TENANT,
      data,
    );
  }

  private async createNotice(
    actorUserId: string,
    leaseId: string,
    source: NoticeToVacateSource,
    data: CreateVacateNoticeDto,
  ) {
    const noticeDate = new Date(data.noticeDate);
    const moveOutDate = new Date(data.plannedMoveOutDate);
    if (moveOutDate < noticeDate)
      throw new BadRequestException(
        'Move-out date cannot precede the notice date',
      );
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id"
        FROM "Lease"
        WHERE "id" = ${leaseId}
        FOR UPDATE
      `;
      const lease = await tx.lease.findUnique({
        where: { id: leaseId },
        include: {
          tenant: true,
          unit: { include: { property: true } },
          vacateNotices: {
            where: { status: { in: OPEN_NOTICE_STATUSES } },
            select: { id: true },
          },
          renewals: {
            where: { status: { in: OPEN_RENEWAL_STATUSES } },
            select: { id: true },
          },
        },
      });
      if (!lease) throw new NotFoundException('Lease not found');
      if (!CURRENT_LEASE_STATUSES.includes(lease.status)) {
        throw new ConflictException('Only a current lease can receive notice');
      }
      if (lease.vacateNotices.length > 0) {
        throw new ConflictException(
          'This lease already has an active notice to vacate',
        );
      }
      if (lease.renewals.length > 0) {
        throw new ConflictException(
          'Cancel the open renewal offer before creating a notice to vacate',
        );
      }
      const created = await tx.noticeToVacate.create({
        data: {
          leaseId,
          tenantId: lease.tenantId,
          unitId: lease.unitId,
          source,
          noticeDate,
          plannedMoveOutDate: moveOutDate,
          reason: data.reason?.trim(),
          forwardingAddress: data.forwardingAddress.trim(),
          createdByUserId: actorUserId,
        },
      });
      await tx.lease.update({
        where: { id: leaseId },
        data: { status: 'expiring' },
      });
      await tx.auditLog.create({
        data: {
          userId: actorUserId,
          action: 'NOTICE_TO_VACATE_SUBMITTED',
          resource: 'notice_to_vacate',
          resourceId: created.id,
          newValue: JSON.stringify({
            leaseId,
            source,
            plannedMoveOutDate: data.plannedMoveOutDate,
          }),
        },
      });
      return { notice: created, lease };
    });
    await this.notifications.vacateNoticeReceived(
      result.lease.tenant.email,
      {
        name: `${result.lease.tenant.firstName} ${result.lease.tenant.lastName}`,
        propertyName: result.lease.unit.property.name,
        moveOutDate: this.date(moveOutDate),
      },
      result.notice.id,
    );
    return this.getLease(leaseId);
  }

  async cancelNotice(actor: LifecycleActor, id: string) {
    const notice = await this.prisma.noticeToVacate.findUnique({
      where: { id },
      include: { inspection: true, lease: { include: { renewals: true } } },
    });
    if (!notice) throw new NotFoundException('Notice to vacate not found');
    if (!OPEN_NOTICE_STATUSES.includes(notice.status)) {
      throw new ConflictException('Only an active notice can be canceled');
    }
    if (
      notice.inspection?.status === MoveOutInspectionStatus.COMPLETED ||
      notice.inspection?.status === MoveOutInspectionStatus.TENANT_ACKNOWLEDGED
    ) {
      throw new ConflictException(
        'A notice cannot be canceled after the final inspection',
      );
    }
    const hasOpenRenewal = notice.lease.renewals.some((renewal) =>
      OPEN_RENEWAL_STATUSES.includes(renewal.status),
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.noticeToVacate.update({
        where: { id },
        data: { status: NoticeToVacateStatus.CANCELED, canceledAt: new Date() },
      });
      if (notice.inspection) {
        await tx.moveOutInspection.update({
          where: { id: notice.inspection.id },
          data: { status: MoveOutInspectionStatus.CANCELED },
        });
      }
      await tx.lease.update({
        where: { id: notice.leaseId },
        data: { status: hasOpenRenewal ? 'expiring' : 'active' },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: 'NOTICE_TO_VACATE_CANCELED',
          resource: 'notice_to_vacate',
          resourceId: id,
        },
      });
    });
    return this.getLease(notice.leaseId);
  }

  async cancelTenantNotice(actor: LifecycleActor, id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { userId: actor.id },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Tenant profile not found');
    const notice = await this.prisma.noticeToVacate.findFirst({
      where: { id, tenantId: tenant.id, source: NoticeToVacateSource.TENANT },
      select: { id: true },
    });
    if (!notice) throw new NotFoundException('Notice to vacate not found');
    return this.cancelNotice(actor, id);
  }

  async acknowledgeNotice(
    actor: LifecycleActor,
    id: string,
    data: ScheduleMoveOutInspectionDto,
  ) {
    const notice = await this.prisma.noticeToVacate.findUnique({
      where: { id },
      include: {
        inspection: true,
        tenant: true,
        unit: { include: { property: true } },
      },
    });
    if (!notice) throw new NotFoundException('Notice to vacate not found');
    if (notice.status !== NoticeToVacateStatus.SUBMITTED) {
      throw new ConflictException(
        'Only a submitted notice can be acknowledged',
      );
    }
    const scheduledAt = new Date(data.scheduledAt);
    const inspection = await this.prisma.$transaction(async (tx) => {
      const created = await tx.moveOutInspection.create({
        data: {
          noticeId: id,
          leaseId: notice.leaseId,
          tenantId: notice.tenantId,
          unitId: notice.unitId,
          status: MoveOutInspectionStatus.SCHEDULED,
          scheduledAt,
          preparedByUserId: actor.id,
          items: {
            create: defaultMoveOutItems.map(([area, name], sortOrder) => ({
              area,
              name,
              sortOrder,
            })),
          },
        },
      });
      await tx.noticeToVacate.update({
        where: { id },
        data: {
          status: NoticeToVacateStatus.ACKNOWLEDGED,
          acknowledgedByUserId: actor.id,
          acknowledgedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: 'MOVE_OUT_INSPECTION_SCHEDULED',
          resource: 'move_out_inspection',
          resourceId: created.id,
          newValue: JSON.stringify({ noticeId: id, scheduledAt }),
        },
      });
      return created;
    });
    await this.notifications.moveOutInspectionScheduled(
      notice.tenant.email,
      {
        name: `${notice.tenant.firstName} ${notice.tenant.lastName}`,
        propertyName: notice.unit.property.name,
        scheduledAt: this.dateTime(scheduledAt),
      },
      inspection.id,
    );
    return this.getLease(notice.leaseId);
  }

  private date(value: Date) {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(value);
  }

  private dateTime(value: Date) {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'America/Chicago',
    }).format(value);
  }
}
