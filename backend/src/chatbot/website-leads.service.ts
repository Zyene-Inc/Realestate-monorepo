import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListingType,
  PublishStatus,
  Role,
  WebsiteLeadIntent,
  WebsiteLeadSource,
  WebsiteLeadStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateWebsiteContactLeadDto,
  CreateWebsiteLeadDto,
} from './dto/website-lead.dto';
import {
  RENTAL_LEAD_INTENTS,
  websiteLeadAccessScope,
} from './website-lead-access';

type RequestFingerprint = { ipAddress: string; userAgent: string };
type CursorPage = { cursor?: string; limit?: number };

const DEFAULT_PAGE_SIZE = 25;
const AVAILABLE_PROPERTY_REQUIRED_INTENTS = new Set<WebsiteLeadIntent>([
  WebsiteLeadIntent.RENTAL_TOUR,
  WebsiteLeadIntent.RENTAL_APPLICATION,
]);

@Injectable()
export class WebsiteLeadsService {
  constructor(private readonly prisma: PrismaService) {}

  private pageSize(limit?: number) {
    return Math.min(Math.max(limit ?? DEFAULT_PAGE_SIZE, 1), 100);
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private validAccessToken(token: string | undefined) {
    return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
  }

  private visitorDayHash(fingerprint: RequestFingerprint, secret: string) {
    const utcDay = new Date().toISOString().slice(0, 10);
    return this.hash(
      `${secret}:${utcDay}:${fingerprint.ipAddress}:${fingerprint.userAgent}`,
    );
  }

  private moveInDate(value?: string) {
    if (!value) return undefined;
    const date = new Date(`${value}T00:00:00.000Z`);
    const now = new Date();
    const today = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    if (Number.isNaN(date.getTime()) || date.getTime() < today) {
      throw new BadRequestException('Move-in date cannot be in the past');
    }
    return date;
  }

  async createFromChatbot(
    body: CreateWebsiteLeadDto,
    accessToken?: string,
    fingerprint?: RequestFingerprint,
    fingerprintSecret?: string,
  ) {
    if (body.website?.trim()) {
      throw new BadRequestException('Invalid submission');
    }

    const token = this.validAccessToken(accessToken);
    let conversationId: string | undefined;
    if (token) {
      const conversation = await this.prisma.chatConversation.findFirst({
        where: {
          accessTokenHash: this.hash(token),
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      conversationId = conversation?.id;
    }

    const visitorDayHash =
      fingerprint && fingerprintSecret
        ? this.visitorDayHash(fingerprint, fingerprintSecret)
        : undefined;
    const lead = await this.prisma.websiteLead.create({
      data: {
        email: body.email.trim().toLowerCase(),
        phone: body.phone?.trim() || null,
        message: body.message.trim(),
        source: WebsiteLeadSource.CHATBOT,
        status: WebsiteLeadStatus.NEW,
        conversationId,
        visitorDayHash,
      },
      select: { id: true, status: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'PUBLIC_CHATBOT_LEAD_CREATED',
        resource: 'website_lead',
        resourceId: lead.id,
        newValue: JSON.stringify({
          source: WebsiteLeadSource.CHATBOT,
          conversationLinked: Boolean(conversationId),
        }),
      },
    });
    return lead;
  }

  async createFromContact(
    body: CreateWebsiteContactLeadDto,
    fingerprint?: RequestFingerprint,
    fingerprintSecret?: string,
  ) {
    if (body.website?.trim()) {
      throw new BadRequestException('Invalid submission');
    }
    if (RENTAL_LEAD_INTENTS.has(body.intent) && !body.moveInDate) {
      throw new BadRequestException('Preferred move-in date is required');
    }
    const moveInDate = this.moveInDate(body.moveInDate);

    let property: { id: string; status: string } | null = null;
    if (body.propertyId) {
      property = await this.prisma.property.findFirst({
        where: {
          id: body.propertyId,
          listingType: ListingType.RENT,
          publishStatus: PublishStatus.PUBLISHED,
        },
        select: { id: true, status: true },
      });
      if (!property) {
        throw new BadRequestException('Rental property is not available');
      }
    }

    if (AVAILABLE_PROPERTY_REQUIRED_INTENTS.has(body.intent) && !property) {
      throw new BadRequestException(
        'A published rental property is required for this request',
      );
    }
    if (
      property?.status.toLowerCase() === 'rented' &&
      AVAILABLE_PROPERTY_REQUIRED_INTENTS.has(body.intent)
    ) {
      throw new BadRequestException('Rental property is not available');
    }

    let unitId: string | undefined;
    if (body.unitId) {
      if (!property) {
        throw new BadRequestException('Rental unit requires a property');
      }
      const unit = await this.prisma.unit.findFirst({
        where: {
          id: body.unitId,
          propertyId: property.id,
          status: 'vacant',
        },
        select: { id: true },
      });
      if (!unit) {
        throw new BadRequestException(
          'Rental unit is not available for this property',
        );
      }
      unitId = unit.id;
    }

    const visitorDayHash =
      fingerprint && fingerprintSecret
        ? this.visitorDayHash(fingerprint, fingerprintSecret)
        : undefined;
    return this.prisma.$transaction(async (tx) => {
      const lead = await tx.websiteLead.create({
        data: {
          name: body.name.trim(),
          email: body.email.trim().toLowerCase(),
          phone: body.phone?.trim() || null,
          message: body.message.trim(),
          source: WebsiteLeadSource.CONTACT_FORM,
          intent: body.intent,
          status: WebsiteLeadStatus.NEW,
          propertyId: property?.id,
          unitId,
          moveInDate,
          visitorDayHash,
        },
        select: { id: true, status: true },
      });
      await tx.auditLog.create({
        data: {
          action: 'PUBLIC_WEBSITE_CONTACT_LEAD_CREATED',
          resource: 'website_lead',
          resourceId: lead.id,
          newValue: JSON.stringify({
            source: WebsiteLeadSource.CONTACT_FORM,
            intent: body.intent,
            propertyId: property?.id ?? null,
            unitId: unitId ?? null,
            moveInDate: moveInDate?.toISOString().slice(0, 10) ?? null,
          }),
        },
      });
      return lead;
    });
  }

  async listForAdmin(page: CursorPage = {}, role: Role = Role.SUPER_ADMIN) {
    const limit = this.pageSize(page.limit);
    const rows = await this.prisma.websiteLead.findMany({
      where: websiteLeadAccessScope(role),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
      include: {
        property: { select: { id: true, name: true, address: true } },
        unit: { select: { id: true, unitNumber: true } },
        assignedTo: { select: { id: true, email: true, role: true } },
      },
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items,
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  }

  async getNewCount(role: Role = Role.SUPER_ADMIN) {
    const count = await this.prisma.websiteLead.count({
      where: {
        status: WebsiteLeadStatus.NEW,
        ...websiteLeadAccessScope(role),
      },
    });
    return { count };
  }

  async getForAdmin(id: string, role: Role = Role.SUPER_ADMIN) {
    const lead = await this.prisma.websiteLead.findFirst({
      where: { id, ...websiteLeadAccessScope(role) },
      include: {
        property: { select: { id: true, name: true, address: true } },
        unit: { select: { id: true, unitNumber: true } },
        assignedTo: { select: { id: true, email: true, role: true } },
        _count: { select: { notes: true } },
        conversation: {
          select: {
            id: true,
            createdAt: true,
            lastMessageAt: true,
            messages: {
              select: { id: true, role: true, content: true, createdAt: true },
              orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
              take: 30,
            },
          },
        },
      },
    });
    if (!lead) throw new NotFoundException('Website lead not found');
    return lead;
  }

  async deleteForAdmin(
    id: string,
    actorUserId: string,
    role: Role = Role.SUPER_ADMIN,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.websiteLead.findFirst({
        where: { id, ...websiteLeadAccessScope(role) },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Website lead not found');

      const lead = await tx.websiteLead.delete({
        where: { id },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          userId: actorUserId,
          action: 'WEBSITE_LEAD_DELETED',
          resource: 'website_lead',
          resourceId: lead.id,
        },
      });
      return lead;
    });
  }
}
