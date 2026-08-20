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

const inquiryInclude = {
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
  messages: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.ListingInquiryInclude;

const inquiryListInclude = {
  property: inquiryInclude.property,
  agent: inquiryInclude.agent,
  messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
} satisfies Prisma.ListingInquiryInclude;

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
        agent: { accountStatus: AgentAccountStatus.APPROVED },
      },
      include: { agent: true },
    });
    if (!property?.agent) {
      throw new NotFoundException('Approved sale listing not found');
    }

    const accessToken = randomBytes(32).toString('base64url');
    const now = new Date();
    const inquiry = await this.prisma.$transaction(async (tx) => {
      const created = await tx.listingInquiry.create({
        data: {
          propertyId: property.id,
          agentId: property.agent!.id,
          buyerName: data.buyerName.trim(),
          buyerEmail: data.buyerEmail.trim().toLowerCase(),
          buyerPhone: data.buyerPhone?.trim() || null,
          buyerAccessTokenHash: this.hashToken(accessToken),
          lastMessageAt: now,
          messages: {
            create: {
              senderType: InquirySenderType.BUYER,
              body: data.message.trim(),
            },
          },
        },
        include: inquiryInclude,
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
          newValue: JSON.stringify({ messageId: created.messages[0].id }),
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
    return { inquiry: this.withoutToken(inquiry), accessToken };
  }

  private async buyerInquiry(inquiryId: string, accessToken: string) {
    const inquiry = await this.prisma.listingInquiry.findFirst({
      where: {
        id: inquiryId,
        buyerAccessTokenHash: this.hashToken(accessToken),
      },
      include: inquiryInclude,
    });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    return inquiry;
  }

  async getForBuyer(inquiryId: string, accessToken: string) {
    const inquiry = await this.buyerInquiry(inquiryId, accessToken);
    const unreadAgentMessages = inquiry.messages.filter(
      (message) =>
        message.senderType === InquirySenderType.AGENT && !message.readAt,
    );
    if (unreadAgentMessages.length === 0) return this.withoutToken(inquiry);
    return this.prisma.$transaction(async (tx) => {
      await tx.listingInquiryMessage.updateMany({
        where: {
          id: { in: unreadAgentMessages.map((message) => message.id) },
          readAt: null,
        },
        data: { readAt: new Date() },
      });
      const updated = await tx.listingInquiry.findUniqueOrThrow({
        where: { id: inquiry.id },
        include: inquiryInclude,
      });
      await tx.auditLog.create({
        data: {
          action: 'INQUIRY_BUYER_MESSAGES_READ',
          resource: 'listing_inquiry',
          resourceId: inquiry.id,
          newValue: JSON.stringify({ count: unreadAgentMessages.length }),
        },
      });
      return this.withoutToken(updated);
    });
  }

  async buyerReply(inquiryId: string, accessToken: string, body: string) {
    const current = await this.buyerInquiry(inquiryId, accessToken);
    if (current.status !== InquiryStatus.OPEN) {
      throw new BadRequestException('This inquiry is closed');
    }
    const updated = await this.addMessage(
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
    );
    return this.withoutToken(updated);
  }

  async listForAgent(userId: string) {
    const agent = await this.approvedAgent(userId);
    const inquiries = await this.prisma.listingInquiry.findMany({
      where: { agentId: agent.id },
      include: inquiryListInclude,
      orderBy: { lastMessageAt: 'desc' },
    });
    return inquiries.map((item) => this.withoutToken(item));
  }

  async getForAgent(userId: string, inquiryId: string) {
    const agent = await this.approvedAgent(userId);
    const inquiry = await this.prisma.listingInquiry.findFirst({
      where: { id: inquiryId, agentId: agent.id },
      include: inquiryInclude,
    });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    return this.withoutToken(inquiry);
  }

  async markRead(userId: string, inquiryId: string) {
    const agent = await this.approvedAgent(userId);
    const current = await this.prisma.listingInquiry.findFirst({
      where: { id: inquiryId, agentId: agent.id },
    });
    if (!current) throw new NotFoundException('Inquiry not found');
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      await tx.listingInquiryMessage.updateMany({
        where: {
          inquiryId,
          senderType: InquirySenderType.BUYER,
          readAt: null,
        },
        data: { readAt: now },
      });
      const updated = await tx.listingInquiry.update({
        where: { id: inquiryId },
        data: { agentLastReadAt: now },
        include: inquiryInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'INQUIRY_MESSAGES_READ',
          resource: 'listing_inquiry',
          resourceId: inquiryId,
        },
      });
      return this.withoutToken(updated);
    });
  }

  async agentReply(userId: string, inquiryId: string, body: string) {
    const agent = await this.approvedAgent(userId);
    const current = await this.prisma.listingInquiry.findFirst({
      where: { id: inquiryId, agentId: agent.id },
      include: inquiryInclude,
    });
    if (!current) throw new NotFoundException('Inquiry not found');
    if (current.status !== InquiryStatus.OPEN) {
      throw new BadRequestException('This inquiry is closed');
    }
    const updated = await this.addMessage(
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
    );
    return this.withoutToken(updated);
  }

  private async addMessage(
    current: Awaited<ReturnType<ListingInquiriesService['buyerInquiry']>>,
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
        include: inquiryInclude,
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
      return updated;
    });
  }

  async updateStatus(userId: string, inquiryId: string, status: InquiryStatus) {
    const agent = await this.approvedAgent(userId);
    const current = await this.prisma.listingInquiry.findFirst({
      where: { id: inquiryId, agentId: agent.id },
    });
    if (!current) throw new NotFoundException('Inquiry not found');
    if (current.status === status) return this.getForAgent(userId, inquiryId);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.listingInquiry.update({
        where: { id: inquiryId },
        data: { status },
        include: inquiryInclude,
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
      return this.withoutToken(updated);
    });
  }

  async listForOversight() {
    const inquiries = await this.prisma.listingInquiry.findMany({
      include: inquiryListInclude,
      orderBy: { lastMessageAt: 'desc' },
    });
    return inquiries.map((item) => this.withoutToken(item));
  }

  async getForOversight(inquiryId: string) {
    const inquiry = await this.prisma.listingInquiry.findUnique({
      where: { id: inquiryId },
      include: inquiryInclude,
    });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    return this.withoutToken(inquiry);
  }
}
