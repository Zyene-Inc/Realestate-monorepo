import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AgentAccountStatus,
  InquirySenderType,
  InquiryStatus,
  ListingStatus,
  ListingType,
  Prisma,
} from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { EmailsService } from '../emails/emails.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingInquiryDto } from './dto/listing-inquiry.dto';

const DEFAULT_INQUIRY_PAGE_SIZE = 25;
const DEFAULT_MESSAGE_PAGE_SIZE = 50;
const BUYER_INQUIRY_ACCESS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function buyerInquiryCookieName(inquiryId: string) {
  return `jr_inquiry_${inquiryId}`;
}

type CursorPage = { cursor?: string; limit?: number };

const inquiryBaseInclude = {
  property: {
    select: { id: true, name: true, address: true, city: true, state: true },
  },
  agent: {
    select: {
      id: true,
      companyName: true,
      contactName: true,
      email: true,
      phone: true,
    },
  },
} satisfies Prisma.ListingInquiryInclude;

const inquiryListInclude = {
  ...inquiryBaseInclude,
  messages: {
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    take: 1,
  },
} satisfies Prisma.ListingInquiryInclude;

type InquiryWithBase = Prisma.ListingInquiryGetPayload<{
  include: typeof inquiryBaseInclude;
}>;

@Injectable()
export class ListingInquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: EmailsService,
  ) {}

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private withoutToken<T extends { buyerAccessTokenHash: string }>(value: T) {
    const { buyerAccessTokenHash: _secret, ...safe } = value;
    void _secret;
    return safe;
  }

  private pageSize(requested: number | undefined, fallback: number) {
    return Math.min(Math.max(requested ?? fallback, 1), 100);
  }

  private async withMessagePage<T extends InquiryWithBase>(
    inquiry: T,
    page: CursorPage = {},
  ) {
    const limit = this.pageSize(page.limit, DEFAULT_MESSAGE_PAGE_SIZE);
    const rows = await this.prisma.listingInquiryMessage.findMany({
      where: { inquiryId: inquiry.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const currentPage = hasMore ? rows.slice(0, limit) : rows;
    return {
      ...this.withoutToken(inquiry),
      messages: currentPage.reverse(),
      nextMessageCursor: hasMore
        ? (currentPage[currentPage.length - 1]?.id ?? null)
        : null,
    };
  }

  private async approvedAgent(userId: string) {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new NotFoundException('Agent profile not found');
    if (agent.accountStatus !== AgentAccountStatus.APPROVED) {
      throw new ForbiddenException('Only approved agents can access inquiries');
    }
    return agent;
  }

  async create(propertyId: string, data: CreateListingInquiryDto) {
    if (data.website) throw new BadRequestException('Unable to submit inquiry');
    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        listingType: ListingType.SALE,
        listingStatus: ListingStatus.APPROVED,
        status: 'active',
        agent: { accountStatus: AgentAccountStatus.APPROVED },
      },
      include: { agent: true },
    });
    if (!property?.agent) {
      throw new NotFoundException('Approved sale listing not found');
    }

    const accessToken = randomBytes(32).toString('base64url');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + BUYER_INQUIRY_ACCESS_TTL_MS);
    const inquiry = await this.prisma.$transaction(async (tx) => {
      const created = await tx.listingInquiry.create({
        data: {
          propertyId: property.id,
          agentId: property.agent!.id,
          buyerName: data.buyerName.trim(),
          buyerEmail: data.buyerEmail.trim().toLowerCase(),
          buyerPhone: data.buyerPhone?.trim() || null,
          buyerAccessTokenHash: this.hashToken(accessToken),
          buyerAccessTokenExpiresAt: expiresAt,
          lastMessageAt: now,
        },
        include: inquiryBaseInclude,
      });
      const message = await tx.listingInquiryMessage.create({
        data: {
          inquiryId: created.id,
          senderType: InquirySenderType.BUYER,
          body: data.message.trim(),
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'LISTING_INQUIRY_CREATED',
          resource: 'listing_inquiry',
          resourceId: created.id,
          newValue: JSON.stringify({
            propertyId: property.id,
            agentId: property.agent!.id,
            buyerEmail: created.buyerEmail,
          }),
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'INQUIRY_BUYER_MESSAGE_SENT',
          resource: 'listing_inquiry',
          resourceId: created.id,
          newValue: JSON.stringify({ messageId: message.id }),
        },
      });
      return created;
    });

    await this.emails.sendBuyerInquiryToAgent(
      property.agent.email,
      property.agent.contactName,
      property.name,
      inquiry.buyerName,
      inquiry.id,
    );
    return {
      inquiry: await this.withMessagePage(inquiry),
      accessToken,
      expiresAt,
    };
  }

  private async buyerInquiry(inquiryId: string, accessToken?: string) {
    if (!accessToken) throw new NotFoundException('Inquiry not found');
    const inquiry = await this.prisma.listingInquiry.findFirst({
      where: {
        id: inquiryId,
        buyerAccessTokenHash: this.hashToken(accessToken),
        buyerAccessTokenExpiresAt: { gt: new Date() },
      },
      include: inquiryBaseInclude,
    });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    return inquiry;
  }

  async getForBuyer(
    inquiryId: string,
    accessToken: string | undefined,
    page: CursorPage = {},
  ) {
    const inquiry = await this.buyerInquiry(inquiryId, accessToken);
    await this.prisma.$transaction(async (tx) => {
      const marked = await tx.listingInquiryMessage.updateMany({
        where: {
          inquiryId,
          senderType: InquirySenderType.AGENT,
          readAt: null,
        },
        data: { readAt: new Date() },
      });
      if (marked.count > 0) {
        await tx.auditLog.create({
          data: {
            action: 'INQUIRY_BUYER_MESSAGES_READ',
            resource: 'listing_inquiry',
            resourceId: inquiry.id,
            newValue: JSON.stringify({ count: marked.count }),
          },
        });
      }
    });
    return this.withMessagePage(inquiry, page);
  }

  async buyerReply(
    inquiryId: string,
    accessToken: string | undefined,
    body: string,
  ) {
    const current = await this.buyerInquiry(inquiryId, accessToken);
    if (current.status !== InquiryStatus.OPEN) {
      throw new BadRequestException('This inquiry is closed');
    }
    const { inquiry: updated, messageId } = await this.addMessage(
      current,
      InquirySenderType.BUYER,
      body,
    );
    await this.emails.sendBuyerReplyToAgent(
      updated.agent.email,
      updated.agent.contactName,
      updated.property.name,
      updated.buyerName,
      updated.id,
      messageId,
    );
    return this.withMessagePage(updated);
  }

  async listForAgent(userId: string, page: CursorPage = {}) {
    const agent = await this.approvedAgent(userId);
    const limit = this.pageSize(page.limit, DEFAULT_INQUIRY_PAGE_SIZE);
    const rows = await this.prisma.listingInquiry.findMany({
      where: { agentId: agent.id },
      include: inquiryListInclude,
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: items.map((item) => this.withoutToken(item)),
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  }

  async getForAgent(userId: string, inquiryId: string, page: CursorPage = {}) {
    const agent = await this.approvedAgent(userId);
    const inquiry = await this.prisma.listingInquiry.findFirst({
      where: { id: inquiryId, agentId: agent.id },
      include: inquiryBaseInclude,
    });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    return this.withMessagePage(inquiry, page);
  }

  async markRead(userId: string, inquiryId: string, page: CursorPage = {}) {
    const agent = await this.approvedAgent(userId);
    const current = await this.prisma.listingInquiry.findFirst({
      where: { id: inquiryId, agentId: agent.id },
    });
    if (!current) throw new NotFoundException('Inquiry not found');
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const marked = await tx.listingInquiryMessage.updateMany({
        where: {
          inquiryId,
          senderType: InquirySenderType.BUYER,
          readAt: null,
        },
        data: { readAt: now },
      });
      const saved = await tx.listingInquiry.update({
        where: { id: inquiryId },
        data: { agentLastReadAt: now },
        include: inquiryBaseInclude,
      });
      if (marked.count > 0) {
        await tx.auditLog.create({
          data: {
            userId,
            action: 'INQUIRY_MESSAGES_READ',
            resource: 'listing_inquiry',
            resourceId: inquiryId,
            newValue: JSON.stringify({ count: marked.count }),
          },
        });
      }
      return saved;
    });
    return this.withMessagePage(updated, page);
  }

  async agentReply(userId: string, inquiryId: string, body: string) {
    const agent = await this.approvedAgent(userId);
    const current = await this.prisma.listingInquiry.findFirst({
      where: { id: inquiryId, agentId: agent.id },
      include: inquiryBaseInclude,
    });
    if (!current) throw new NotFoundException('Inquiry not found');
    if (current.status !== InquiryStatus.OPEN) {
      throw new BadRequestException('This inquiry is closed');
    }
    const { inquiry: updated, messageId } = await this.addMessage(
      current,
      InquirySenderType.AGENT,
      body,
      userId,
    );
    await this.emails.sendAgentReplyToBuyer(
      updated.buyerEmail,
      updated.buyerName,
      updated.property.name,
      updated.agent.contactName,
      messageId,
    );
    return this.withMessagePage(updated);
  }

  private async addMessage(
    current: InquiryWithBase,
    senderType: InquirySenderType,
    rawBody: string,
    userId?: string,
  ) {
    const body = rawBody.trim();
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.listingInquiryMessage.create({
        data: { inquiryId: current.id, senderType, body },
      });
      const updated = await tx.listingInquiry.update({
        where: { id: current.id },
        data: { lastMessageAt: now },
        include: inquiryBaseInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action:
            senderType === InquirySenderType.AGENT
              ? 'INQUIRY_AGENT_MESSAGE_SENT'
              : 'INQUIRY_BUYER_MESSAGE_SENT',
          resource: 'listing_inquiry',
          resourceId: current.id,
          newValue: JSON.stringify({ messageId: message.id }),
        },
      });
      return { inquiry: updated, messageId: message.id };
    });
  }

  async updateStatus(userId: string, inquiryId: string, status: InquiryStatus) {
    const agent = await this.approvedAgent(userId);
    const current = await this.prisma.listingInquiry.findFirst({
      where: { id: inquiryId, agentId: agent.id },
    });
    if (!current) throw new NotFoundException('Inquiry not found');
    if (current.status === status) return this.getForAgent(userId, inquiryId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.listingInquiry.update({
        where: { id: inquiryId },
        data: { status },
        include: inquiryBaseInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'INQUIRY_STATUS_CHANGED',
          resource: 'listing_inquiry',
          resourceId: inquiryId,
          oldValue: JSON.stringify({ status: current.status }),
          newValue: JSON.stringify({ status }),
        },
      });
      return saved;
    });
    return this.withMessagePage(updated);
  }

  async listForOversight(page: CursorPage = {}) {
    const limit = this.pageSize(page.limit, DEFAULT_INQUIRY_PAGE_SIZE);
    const rows = await this.prisma.listingInquiry.findMany({
      include: inquiryListInclude,
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: items.map((item) => this.withoutToken(item)),
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  }

  async getForOversight(inquiryId: string, page: CursorPage = {}) {
    const inquiry = await this.prisma.listingInquiry.findUnique({
      where: { id: inquiryId },
      include: inquiryBaseInclude,
    });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    return this.withMessagePage(inquiry, page);
  }
}
