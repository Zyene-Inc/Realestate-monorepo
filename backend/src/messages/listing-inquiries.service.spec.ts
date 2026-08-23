import { AgentAccountStatus, InquirySenderType } from '@prisma/client';
import { ListingInquiriesService } from './listing-inquiries.service';

describe('ListingInquiriesService', () => {
  const agent = {
    id: 'agent-1',
    userId: 'user-1',
    accountStatus: AgentAccountStatus.APPROVED,
    companyName: 'Johnson Partner Realty',
    contactName: 'Alex Agent',
    email: 'agent@example.com',
    phone: null,
  };
  const inquiry = {
    id: 'inquiry-1',
    agentId: agent.id,
    buyerAccessTokenHash: 'secret-hash',
    buyerName: 'Bailey Buyer',
    buyerEmail: 'buyer@example.com',
    buyerPhone: null,
    status: 'OPEN',
    agentLastReadAt: null,
    lastMessageAt: new Date('2026-08-22T12:00:00.000Z'),
    createdAt: new Date('2026-08-22T11:00:00.000Z'),
    updatedAt: new Date('2026-08-22T12:00:00.000Z'),
    propertyId: 'property-1',
    property: {
      id: 'property-1',
      name: '100 Main Street',
      address: '100 Main Street',
      city: 'Kansas City',
      state: 'MO',
    },
    agent,
  };

  function serviceWith(prisma: object) {
    return new ListingInquiriesService(prisma as never, {} as never);
  }

  it('does not write a read audit event when no unread message changed', async () => {
    const tx = {
      listingInquiryMessage: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      listingInquiry: {
        update: jest.fn().mockResolvedValue(inquiry),
      },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      agent: { findUnique: jest.fn().mockResolvedValue(agent) },
      listingInquiry: { findFirst: jest.fn().mockResolvedValue(inquiry) },
      listingInquiryMessage: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };

    await expect(
      serviceWith(prisma).markRead('user-1', inquiry.id),
    ).resolves.toEqual(
      expect.objectContaining({ id: inquiry.id, messages: [] }),
    );
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('writes exactly one named read event with the changed row count', async () => {
    const tx = {
      listingInquiryMessage: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      listingInquiry: {
        update: jest.fn().mockResolvedValue(inquiry),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      agent: { findUnique: jest.fn().mockResolvedValue(agent) },
      listingInquiry: { findFirst: jest.fn().mockResolvedValue(inquiry) },
      listingInquiryMessage: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };

    await serviceWith(prisma).markRead('user-1', inquiry.id);

    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        action: 'INQUIRY_MESSAGES_READ',
        resource: 'listing_inquiry',
        resourceId: inquiry.id,
        newValue: JSON.stringify({ count: 2 }),
      },
    });
  });

  it('bounds the agent inbox and returns a cursor without exposing token hashes', async () => {
    const rows = [
      {
        ...inquiry,
        id: 'inquiry-3',
        messages: [
          {
            id: 'message-3',
            inquiryId: 'inquiry-3',
            senderType: InquirySenderType.BUYER,
            body: 'Newest',
            readAt: null,
            createdAt: new Date('2026-08-22T13:00:00.000Z'),
          },
        ],
      },
      { ...inquiry, id: 'inquiry-2', messages: [] },
      { ...inquiry, id: 'inquiry-1', messages: [] },
    ];
    const prisma = {
      agent: { findUnique: jest.fn().mockResolvedValue(agent) },
      listingInquiry: { findMany: jest.fn().mockResolvedValue(rows) },
    };

    const page = await serviceWith(prisma).listForAgent('user-1', { limit: 2 });

    expect(prisma.listingInquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { agentId: agent.id },
        take: 3,
        orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBe('inquiry-2');
    expect(page.items[0]).not.toHaveProperty('buyerAccessTokenHash');
  });
});
