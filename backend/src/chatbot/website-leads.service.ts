import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WebsiteLeadSource, WebsiteLeadStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebsiteLeadDto } from './dto/website-lead.dto';

type RequestFingerprint = { ipAddress: string; userAgent: string };

type CursorPage = { cursor?: string; limit?: number };

const DEFAULT_PAGE_SIZE = 25;

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

  async listForAdmin(page: CursorPage = {}) {
    const limit = this.pageSize(page.limit);
    const rows = await this.prisma.websiteLead.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items,
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  }

  async getNewCount() {
    const count = await this.prisma.websiteLead.count({
      where: { status: WebsiteLeadStatus.NEW },
    });
    return { count };
  }

  async getForAdmin(id: string) {
    const lead = await this.prisma.websiteLead.findUnique({
      where: { id },
      include: {
        conversation: {
          select: {
            id: true,
            createdAt: true,
            lastMessageAt: true,
            messages: {
              select: { role: true, content: true, createdAt: true },
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

  async updateStatus(id: string, status: WebsiteLeadStatus) {
    const lead = await this.prisma.websiteLead.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!lead) throw new NotFoundException('Website lead not found');

    const updated = await this.prisma.websiteLead.update({
      where: { id },
      data: { status },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'WEBSITE_LEAD_STATUS_UPDATED',
        resource: 'website_lead',
        resourceId: id,
        oldValue: JSON.stringify({ status: lead.status }),
        newValue: JSON.stringify({ status }),
      },
    });

    return updated;
  }

  async deleteForAdmin(id: string, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.websiteLead.findUnique({
        where: { id },
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
