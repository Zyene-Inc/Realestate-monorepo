import { BadRequestException } from '@nestjs/common';
import {
  WebsiteLeadSource,
  WebsiteLeadStatus,
} from '@prisma/client';
import { WebsiteLeadsService } from './website-leads.service';

describe('WebsiteLeadsService', () => {
  const fingerprintSecret =
    'chatbot-test-fingerprint-secret-with-more-than-32-characters';

  function prismaMock() {
    return {
      chatConversation: {
        findFirst: jest.fn(),
      },
      websiteLead: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };
  }

  it('rejects honeypot submissions', async () => {
    const prisma = prismaMock();
    const service = new WebsiteLeadsService(prisma as never);

    await expect(
      service.createFromChatbot(
        {
          email: 'buyer@example.com',
          message: 'I want to book a tour.',
          website: 'spam',
        },
        undefined,
        { ipAddress: '127.0.0.1', userAgent: 'jest' },
        fingerprintSecret,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.websiteLead.create).not.toHaveBeenCalled();
  });

  it('creates a lead without a chat session cookie', async () => {
    const prisma = prismaMock();
    prisma.websiteLead.create.mockResolvedValue({
      id: 'lead-1',
      status: WebsiteLeadStatus.NEW,
    });
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
    const service = new WebsiteLeadsService(prisma as never);

    const result = await service.createFromChatbot(
      {
        email: 'Buyer@Example.com',
        phone: '555-0100',
        message: 'Please call me about rentals.',
      },
      undefined,
      { ipAddress: '127.0.0.1', userAgent: 'jest' },
      fingerprintSecret,
    );

    expect(result).toEqual({ id: 'lead-1', status: WebsiteLeadStatus.NEW });
    expect(prisma.chatConversation.findFirst).not.toHaveBeenCalled();
    expect(prisma.websiteLead.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'buyer@example.com',
        phone: '555-0100',
        message: 'Please call me about rentals.',
        source: WebsiteLeadSource.CHATBOT,
        status: WebsiteLeadStatus.NEW,
        conversationId: undefined,
        visitorDayHash: expect.any(String),
      }),
      select: { id: true, status: true },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'PUBLIC_CHATBOT_LEAD_CREATED',
        resource: 'website_lead',
        resourceId: 'lead-1',
      }),
    });
  });

  it('links a lead to an active conversation when the cookie token is valid', async () => {
    const prisma = prismaMock();
    prisma.chatConversation.findFirst.mockResolvedValue({ id: 'conv-1' });
    prisma.websiteLead.create.mockResolvedValue({
      id: 'lead-2',
      status: WebsiteLeadStatus.NEW,
    });
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-2' });
    const service = new WebsiteLeadsService(prisma as never);
    const token = 'a'.repeat(43);

    await service.createFromChatbot(
      {
        email: 'buyer@example.com',
        message: 'Schedule a showing this week.',
      },
      token,
      { ipAddress: '127.0.0.1', userAgent: 'jest' },
      fingerprintSecret,
    );

    expect(prisma.chatConversation.findFirst).toHaveBeenCalled();
    expect(prisma.websiteLead.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conversationId: 'conv-1',
      }),
      select: { id: true, status: true },
    });
  });

  it('lists leads with cursor pagination', async () => {
    const prisma = prismaMock();
    prisma.websiteLead.findMany.mockResolvedValue([
      { id: 'lead-3' },
      { id: 'lead-2' },
      { id: 'lead-1' },
    ]);
    const service = new WebsiteLeadsService(prisma as never);

    const page = await service.listForAdmin({ limit: 2 });

    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBe('lead-2');
    expect(prisma.websiteLead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 }),
    );
  });

  it('updates lead status and writes an audit log', async () => {
    const prisma = prismaMock();
    prisma.websiteLead.findUnique.mockResolvedValue({
      id: 'lead-4',
      status: WebsiteLeadStatus.NEW,
    });
    prisma.websiteLead.update.mockResolvedValue({
      id: 'lead-4',
      status: WebsiteLeadStatus.CONTACTED,
    });
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-4' });
    const service = new WebsiteLeadsService(prisma as never);

    const updated = await service.updateStatus(
      'lead-4',
      WebsiteLeadStatus.CONTACTED,
    );

    expect(updated.status).toBe(WebsiteLeadStatus.CONTACTED);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'WEBSITE_LEAD_STATUS_UPDATED',
        resourceId: 'lead-4',
      }),
    });
  });
});
