import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AgentAccountStatus,
  AnnouncementAudience,
  Prisma,
  Role,
} from '@prisma/client';
import type { RequiredAuthenticatedRequest } from '../auth/authenticated-request';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './dto/announcement.dto';

const announcementInclude = {
  property: { select: { id: true, name: true } },
  unit: { select: { id: true, unitNumber: true } },
  _count: { select: { acknowledgements: true } },
} satisfies Prisma.AnnouncementInclude;

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly notifications: NotificationsService,
  ) {}

  listForAdmin(role: Role) {
    return this.prisma.announcement.findMany({
      where: this.adminAudienceFilter(role),
      include: announcementInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 200,
    });
  }

  async listForTenant(userId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { userId },
      select: { unitId: true, unit: { select: { propertyId: true } } },
    });
    if (!tenant?.unitId || !tenant.unit) return [];

    const rows = await this.prisma.announcement.findMany({
      where: {
        audience: AnnouncementAudience.TENANT,
        OR: [
          { propertyId: null, unitId: null },
          { propertyId: tenant.unit.propertyId, unitId: null },
          { unitId: tenant.unitId },
        ],
      },
      include: {
        ...announcementInclude,
        acknowledgements: {
          where: { userId },
          select: { acknowledgedAt: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return rows.map(({ acknowledgements, ...announcement }) => ({
      ...announcement,
      acknowledgedAt: acknowledgements[0]?.acknowledgedAt ?? null,
    }));
  }

  async listForAgent(userId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { userId },
      select: { accountStatus: true },
    });
    if (agent?.accountStatus !== AgentAccountStatus.APPROVED) return [];
    const rows = await this.prisma.announcement.findMany({
      where: { audience: AnnouncementAudience.AGENT },
      include: {
        ...announcementInclude,
        acknowledgements: {
          where: { userId },
          select: { acknowledgedAt: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return rows.map(({ acknowledgements, ...announcement }) => ({
      ...announcement,
      acknowledgedAt: acknowledgements[0]?.acknowledgedAt ?? null,
    }));
  }

  async create(
    actor: RequiredAuthenticatedRequest['user'],
    data: CreateAnnouncementDto,
  ) {
    this.assertAdminCanManageAudience(actor.role, data.audience);
    const scope = await this.resolveScope(data, data.audience);
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.announcement.create({
        data: {
          title: data.title,
          content: data.content,
          audience: data.audience,
          requiresAcknowledgement: data.requiresAcknowledgement,
          ...scope,
        },
        include: announcementInclude,
      });
      const recipients = await this.recipientUserIds(tx, created);
      await this.notifications.createForUsers(tx, recipients, {
        title: created.title,
        message: created.content.slice(0, 500),
        href:
          created.audience === AnnouncementAudience.TENANT
            ? '/tenant/announcements'
            : '/agent/announcements',
      });
      await tx.auditLog.create({
        data: {
          userId: actor.sub,
          action: 'ANNOUNCEMENT_CREATED',
          resource: 'announcement',
          resourceId: created.id,
          newValue: JSON.stringify({
            audience: created.audience,
            requiresAcknowledgement: created.requiresAcknowledgement,
          }),
        },
      });
      return created;
    });
  }

  async update(
    actor: RequiredAuthenticatedRequest['user'],
    id: string,
    data: UpdateAnnouncementDto,
  ) {
    const existing = await this.prisma.announcement.findUnique({
      where: { id },
      include: announcementInclude,
    });
    if (!existing) throw new NotFoundException('Announcement not found');
    this.assertAdminCanManageAudience(actor.role, existing.audience);

    const announcement = await this.prisma.announcement.update({
      where: { id },
      data: { title: data.title, content: data.content },
      include: announcementInclude,
    });
    await this.auditLogs.log({
      userId: actor.sub,
      action: 'ANNOUNCEMENT_UPDATED',
      resource: 'announcement',
      resourceId: announcement.id,
      oldValue: existing,
      newValue: announcement,
    });
    return announcement;
  }

  async remove(actor: RequiredAuthenticatedRequest['user'], id: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: announcementInclude,
    });
    if (!announcement) throw new NotFoundException('Announcement not found');
    this.assertAdminCanManageAudience(actor.role, announcement.audience);

    await this.prisma.announcement.delete({ where: { id } });
    await this.auditLogs.log({
      userId: actor.sub,
      action: 'ANNOUNCEMENT_DELETED',
      resource: 'announcement',
      resourceId: id,
      oldValue: announcement,
    });
    return { id };
  }

  async acknowledgeTenant(userId: string, announcementId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { userId },
      select: { unitId: true, unit: { select: { propertyId: true } } },
    });
    if (!tenant?.unitId || !tenant.unit) {
      throw new NotFoundException('Announcement not found');
    }
    const announcement = await this.prisma.announcement.findFirst({
      where: {
        id: announcementId,
        audience: AnnouncementAudience.TENANT,
        requiresAcknowledgement: true,
        OR: [
          { propertyId: null, unitId: null },
          { propertyId: tenant.unit.propertyId, unitId: null },
          { unitId: tenant.unitId },
        ],
      },
      select: { id: true },
    });
    if (!announcement) throw new NotFoundException('Announcement not found');
    return this.acknowledge(userId, announcement.id);
  }

  async acknowledgeAgent(userId: string, announcementId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { userId },
      select: { accountStatus: true },
    });
    if (agent?.accountStatus !== AgentAccountStatus.APPROVED) {
      throw new NotFoundException('Announcement not found');
    }
    const announcement = await this.prisma.announcement.findFirst({
      where: {
        id: announcementId,
        audience: AnnouncementAudience.AGENT,
        requiresAcknowledgement: true,
      },
      select: { id: true },
    });
    if (!announcement) throw new NotFoundException('Announcement not found');
    return this.acknowledge(userId, announcement.id);
  }

  private async acknowledge(userId: string, announcementId: string) {
    return this.prisma.$transaction(async (tx) => {
      const acknowledgement = await tx.announcementAcknowledgement.upsert({
        where: {
          announcementId_userId: { announcementId, userId },
        },
        create: { announcementId, userId },
        update: {},
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ANNOUNCEMENT_ACKNOWLEDGED',
          resource: 'announcement',
          resourceId: announcementId,
        },
      });
      return { announcementId, acknowledgedAt: acknowledgement.acknowledgedAt };
    });
  }

  private async resolveScope(
    data: CreateAnnouncementDto,
    audience: AnnouncementAudience,
  ) {
    if (audience === AnnouncementAudience.AGENT) {
      if (data.propertyId || data.unitId) {
        throw new BadRequestException(
          'Agent-wide notices cannot be scoped to a rental property or unit',
        );
      }
      return { propertyId: null, unitId: null };
    }
    if (data.unitId) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: data.unitId },
        select: {
          propertyId: true,
          property: { select: { listingType: true } },
        },
      });
      if (!unit || unit.property.listingType !== 'RENT') {
        throw new BadRequestException(
          'Choose a rental unit for this announcement',
        );
      }
      if (data.propertyId && data.propertyId !== unit.propertyId) {
        throw new BadRequestException(
          'The selected unit does not belong to that property',
        );
      }
      return { propertyId: unit.propertyId, unitId: data.unitId };
    }

    if (!data.propertyId) return { propertyId: null, unitId: null };
    const property = await this.prisma.property.findUnique({
      where: { id: data.propertyId },
      select: { id: true, listingType: true },
    });
    if (!property || property.listingType !== 'RENT') {
      throw new BadRequestException(
        'Choose a rental property for this announcement',
      );
    }
    return { propertyId: property.id, unitId: null };
  }

  private recipientUserIds(
    tx: Prisma.TransactionClient,
    announcement: {
      audience: AnnouncementAudience;
      propertyId: string | null;
      unitId: string | null;
    },
  ) {
    if (announcement.audience === AnnouncementAudience.AGENT) {
      return tx.agent
        .findMany({
          where: { accountStatus: AgentAccountStatus.APPROVED },
          select: { userId: true },
        })
        .then((agents) => agents.map((agent) => agent.userId));
    }
    return tx.tenant
      .findMany({
        where: {
          userId: { not: null },
          OR: announcement.unitId
            ? [{ unitId: announcement.unitId }]
            : announcement.propertyId
              ? [{ unit: { propertyId: announcement.propertyId } }]
              : [{ unitId: { not: null } }],
        },
        select: { userId: true },
      })
      .then((tenants) =>
        tenants.flatMap((tenant) => (tenant.userId ? [tenant.userId] : [])),
      );
  }

  private adminAudienceFilter(role: Role) {
    this.assertAdminRole(role);
    if (role === Role.SUPER_ADMIN) return undefined;
    return {
      audience:
        role === Role.TENANT_ADMIN
          ? AnnouncementAudience.TENANT
          : AnnouncementAudience.AGENT,
    };
  }

  private assertAdminCanManageAudience(
    role: Role,
    audience: AnnouncementAudience,
  ) {
    this.assertAdminRole(role);
    if (
      role !== Role.SUPER_ADMIN &&
      ((role === Role.TENANT_ADMIN &&
        audience !== AnnouncementAudience.TENANT) ||
        (role === Role.SALES_ADMIN && audience !== AnnouncementAudience.AGENT))
    ) {
      throw new ForbiddenException('This role cannot manage that announcement');
    }
  }

  private assertAdminRole(role: Role) {
    if (
      role !== Role.SUPER_ADMIN &&
      role !== Role.TENANT_ADMIN &&
      role !== Role.SALES_ADMIN
    ) {
      throw new ForbiddenException('This role cannot manage announcements');
    }
  }
}
