import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ChatMessageRole,
  ListingStatus,
  ListingType,
  PublishStatus,
  WebsiteLeadSource,
} from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ChatbotAiGateway,
  ChatbotGeneration,
  ChatbotModelMessage,
} from './chatbot-ai.gateway';
import {
  CHATBOT_AI_GATEWAY,
  CHATBOT_GLOBAL_DAILY_LIMIT,
  CHATBOT_GLOBAL_DAILY_LIMIT_MESSAGE,
  CHATBOT_HISTORY_LIMIT,
  CHATBOT_MODEL,
  CHATBOT_MODEL_HISTORY_LIMIT,
  CHATBOT_SESSION_TTL_MS,
  CHATBOT_SCOPE_REFUSAL_MESSAGE,
  CHATBOT_VISITOR_DAILY_LIMIT,
  CHATBOT_VISITOR_DAILY_LIMIT_MESSAGE,
} from './chatbot.constants';
import { buildChatbotInstructions } from './chatbot-instructions';
import {
  needsChatbotScopeRefusal,
  sanitizeAssistantOutput,
} from './chatbot-output.sanitizer';

const CHATBOT_ADVISORY_LOCK_ID = 1_278_226_431;

type RequestFingerprint = { ipAddress: string; userAgent: string };

type StartedReply = {
  conversationId: string;
  accessToken: string;
  expiresAt: Date;
  generation: ChatbotGeneration;
};

@Injectable()
export class ChatbotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(CHATBOT_AI_GATEWAY)
    private readonly ai: ChatbotAiGateway,
  ) {}

  status() {
    return { available: this.ai.isEnabled(), model: CHATBOT_MODEL };
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private validAccessToken(token: string | undefined) {
    return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
  }

  private visitorDayHash(fingerprint: RequestFingerprint) {
    const secret = this.config
      .get<string>('CHATBOT_FINGERPRINT_SECRET')
      ?.trim();
    if (!secret) {
      throw new ServiceUnavailableException('Public chatbot is not configured');
    }
    const utcDay = new Date().toISOString().slice(0, 10);
    return this.hash(
      `${secret}:${utcDay}:${fingerprint.ipAddress}:${fingerprint.userAgent}`,
    );
  }

  private sessionExpiry() {
    return new Date(Date.now() + CHATBOT_SESSION_TTL_MS);
  }

  private async visitorLeadGateCleared(
    tx: Prisma.TransactionClient,
    accessToken: string | undefined,
    visitorDayHash: string,
  ) {
    const token = this.validAccessToken(accessToken);
    if (token) {
      const linkedConversation = await tx.chatConversation.findFirst({
        where: {
          accessTokenHash: this.hash(token),
          expiresAt: { gt: new Date() },
          websiteLeads: { some: { source: WebsiteLeadSource.CHATBOT } },
        },
        select: { id: true },
      });
      if (linkedConversation) return true;
    }
    const lead = await tx.websiteLead.findFirst({
      where: {
        visitorDayHash,
        source: WebsiteLeadSource.CHATBOT,
      },
      select: { id: true },
    });
    return Boolean(lead);
  }

  private scopeRefusalGeneration(): ChatbotGeneration {
    return {
      textStream: (async function* () {
        await Promise.resolve();
        yield CHATBOT_SCOPE_REFUSAL_MESSAGE;
      })(),
      completion: Promise.resolve({
        text: CHATBOT_SCOPE_REFUSAL_MESSAGE,
        finishReason: 'scope_refusal',
      }),
    };
  }

  private sanitizedGeneration(
    generation: ChatbotGeneration,
  ): ChatbotGeneration {
    const completion = generation.completion.then((result) => ({
      ...result,
      text: sanitizeAssistantOutput(result.text),
    }));

    return {
      textStream: (async function* () {
        const result = await completion;
        if (result.text) yield result.text;
      })(),
      completion,
    };
  }

  async history(accessToken?: string) {
    const token = this.validAccessToken(accessToken);
    if (!token) return { items: [] };
    const conversation = await this.prisma.chatConversation.findFirst({
      where: {
        accessTokenHash: this.hash(token),
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!conversation) return { items: [] };

    const rows = await this.prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      select: { id: true, role: true, content: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: CHATBOT_HISTORY_LIMIT,
    });
    return { items: rows.reverse() };
  }

  private startOfUtcDay() {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  private async persistUserMessage(
    accessToken: string | undefined,
    content: string,
    visitorDayHash: string,
  ) {
    const validToken = this.validAccessToken(accessToken);
    const expiresAt = this.sessionExpiry();
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CHATBOT_ADVISORY_LOCK_ID})`;
      const since = this.startOfUtcDay();
      const [globalCount, visitorCount] = await Promise.all([
        tx.chatMessage.count({
          where: { role: ChatMessageRole.USER, createdAt: { gte: since } },
        }),
        tx.chatMessage.count({
          where: { visitorDayHash, createdAt: { gte: since } },
        }),
      ]);
      if (globalCount >= CHATBOT_GLOBAL_DAILY_LIMIT) {
        throw new HttpException(
          CHATBOT_GLOBAL_DAILY_LIMIT_MESSAGE,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      const leadGateCleared = await this.visitorLeadGateCleared(
        tx,
        validToken,
        visitorDayHash,
      );
      if (!leadGateCleared && visitorCount >= CHATBOT_VISITOR_DAILY_LIMIT) {
        throw new HttpException(
          CHATBOT_VISITOR_DAILY_LIMIT_MESSAGE,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      let token = validToken;
      let conversation = token
        ? await tx.chatConversation.findFirst({
            where: {
              accessTokenHash: this.hash(token),
              expiresAt: { gt: new Date() },
            },
          })
        : null;
      if (!conversation) {
        token = randomBytes(32).toString('base64url');
        conversation = await tx.chatConversation.create({
          data: { accessTokenHash: this.hash(token), expiresAt },
        });
      }

      await tx.chatMessage.create({
        data: {
          conversationId: conversation.id,
          role: ChatMessageRole.USER,
          content,
          visitorDayHash,
        },
      });
      await tx.chatConversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date(), expiresAt },
      });
      if (!token) throw new Error('Chat session token was not created');
      return { conversationId: conversation.id, accessToken: token, expiresAt };
    });
  }

  private async modelHistory(conversationId: string) {
    const rows = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      select: { role: true, content: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: CHATBOT_MODEL_HISTORY_LIMIT,
    });
    return rows.reverse().map(
      (message): ChatbotModelMessage => ({
        role: message.role === ChatMessageRole.USER ? 'user' : 'assistant',
        content: message.content,
      }),
    );
  }

  private async listingContext() {
    const [sales, rentals] = await Promise.all([
      this.prisma.property.findMany({
        where: {
          listingType: ListingType.SALE,
          listingStatus: ListingStatus.APPROVED,
        },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          propertyType: true,
          description: true,
          price: true,
          bedrooms: true,
          bathrooms: true,
          squareFeet: true,
          amenities: true,
          status: true,
        },
        orderBy: [{ reviewedAt: 'desc' }, { id: 'desc' }],
        take: 12,
      }),
      this.prisma.property.findMany({
        where: {
          listingType: ListingType.RENT,
          publishStatus: PublishStatus.PUBLISHED,
          status: { in: ['active', 'rented'] },
        },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          propertyType: true,
          description: true,
          rentAmount: true,
          bedrooms: true,
          bathrooms: true,
          squareFeet: true,
          amenities: true,
          status: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: 12,
      }),
    ]);
    const site =
      this.config.get<string>('PUBLIC_SITE_URL')?.trim().replace(/\/$/, '') ||
      'https://coachjohnsonrealty.com';
    return JSON.stringify({
      saleListings: sales.map((listing) => ({
        ...listing,
        description: listing.description?.slice(0, 320),
        price: listing.price?.toString(),
        amenities: listing.amenities.slice(0, 10),
        url: `${site}/properties/${listing.id}`,
      })),
      rentalListings: rentals.map((listing) => ({
        ...listing,
        description: listing.description?.slice(0, 320),
        rentAmount: listing.rentAmount?.toString(),
        amenities: listing.amenities.slice(0, 10),
        url: `${site}/rentals/${listing.id}`,
      })),
    });
  }

  async startReply(input: {
    accessToken?: string;
    message: string;
    fingerprint: RequestFingerprint;
    abortSignal?: AbortSignal;
  }): Promise<StartedReply> {
    if (!this.ai.isEnabled()) {
      throw new ServiceUnavailableException(
        'The assistant is temporarily unavailable. Please contact our team.',
      );
    }
    const message = input.message.trim();
    if (!message) throw new BadRequestException('Message is required');
    const visitorId = this.visitorDayHash(input.fingerprint);
    const session = await this.persistUserMessage(
      input.accessToken,
      message,
      visitorId,
    );
    if (needsChatbotScopeRefusal(message)) {
      return { ...session, generation: this.scopeRefusalGeneration() };
    }
    const [messages, listings] = await Promise.all([
      this.modelHistory(session.conversationId),
      this.listingContext(),
    ]);
    let generation: ChatbotGeneration;
    try {
      generation = this.sanitizedGeneration(
        await this.ai.generate({
          instructions: buildChatbotInstructions(listings),
          messages,
          visitorId,
          abortSignal: input.abortSignal,
        }),
      );
    } catch {
      await this.recordFailure(session.conversationId);
      throw new ServiceUnavailableException(
        'The assistant is temporarily unavailable. Please contact our team.',
      );
    }
    return { ...session, generation };
  }

  async completeReply(
    conversationId: string,
    completion: Awaited<ChatbotGeneration['completion']>,
  ) {
    const content = sanitizeAssistantOutput(completion.text);
    if (!content) throw new Error('The model returned an empty response');
    await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: {
          conversationId,
          role: ChatMessageRole.ASSISTANT,
          content,
          model: CHATBOT_MODEL,
          finishReason: completion.finishReason,
          inputTokens: completion.inputTokens,
          outputTokens: completion.outputTokens,
        },
      }),
      this.prisma.chatConversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          action: 'PUBLIC_CHATBOT_RESPONSE_COMPLETED',
          resource: 'chat_conversation',
          resourceId: conversationId,
          newValue: JSON.stringify({
            model: CHATBOT_MODEL,
            finishReason: completion.finishReason,
            inputTokens: completion.inputTokens,
            outputTokens: completion.outputTokens,
          }),
        },
      }),
    ]);
  }

  async recordFailure(conversationId: string, requestId?: string) {
    await this.prisma.auditLog.create({
      data: {
        action: 'PUBLIC_CHATBOT_RESPONSE_FAILED',
        resource: 'chat_conversation',
        resourceId: conversationId,
        newValue: JSON.stringify({ model: CHATBOT_MODEL, requestId }),
      },
    });
  }
}
