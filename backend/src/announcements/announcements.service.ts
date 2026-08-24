import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './dto/announcement.dto';

const announcementInclude = {
  property: { select: { id: true, name: true } },
  unit: { select: { id: true, unitNumber: true } },
} satisfies Prisma.AnnouncementInclude;

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listForAdmin() {
    return this.prisma.announcement.findMany({
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

    return this.prisma.announcement.findMany({
      where: {
        OR: [
          { propertyId: null, unitId: null },
          { propertyId: tenant.unit.propertyId, unitId: null },
          { unitId: tenant.unitId },
        ],
      },
      include: announcementInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
  }

  async create(actorUserId: string, data: CreateAnnouncementDto) {
    const scope = await this.resolveScope(data.propertyId, data.unitId);
    const announcement = await this.prisma.announcement.create({
      data: { title: data.title, content: data.content, ...scope },
      include: announcementInclude,
    });
    await this.auditLogs.log({
      userId: actorUserId,
      action: 'ANNOUNCEMENT_CREATED',
      resource: 'announcement',
      resourceId: announcement.id,
      newValue: announcement,
    });
    return announcement;
  }

  async update(actorUserId: string, id: string, data: UpdateAnnouncementDto) {
    const existing = await this.prisma.announcement.findUnique({
      where: { id },
      include: announcementInclude,
    });
    if (!existing) throw new NotFoundException('Announcement not found');

    const announcement = await this.prisma.announcement.update({
      where: { id },
      data: { title: data.title, content: data.content },
      include: announcementInclude,
    });
    await this.auditLogs.log({
      userId: actorUserId,
      action: 'ANNOUNCEMENT_UPDATED',
      resource: 'announcement',
      resourceId: announcement.id,
      oldValue: existing,
      newValue: announcement,
    });
    return announcement;
  }

  async remove(actorUserId: string, id: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: announcementInclude,
    });
    if (!announcement) throw new NotFoundException('Announcement not found');

    await this.prisma.announcement.delete({ where: { id } });
    await this.auditLogs.log({
      userId: actorUserId,
      action: 'ANNOUNCEMENT_DELETED',
      resource: 'announcement',
      resourceId: id,
      oldValue: announcement,
    });
    return { id };
  }

  private async resolveScope(propertyId?: string, unitId?: string) {
    if (unitId) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: unitId },
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
      if (propertyId && propertyId !== unit.propertyId) {
        throw new BadRequestException(
          'The selected unit does not belong to that property',
        );
      }
      return { propertyId: unit.propertyId, unitId };
    }

    if (!propertyId) return { propertyId: null, unitId: null };
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, listingType: true },
    });
    if (!property || property.listingType !== 'RENT') {
      throw new BadRequestException(
        'Choose a rental property for this announcement',
      );
    }
    return { propertyId: property.id, unitId: null };
  }
}
