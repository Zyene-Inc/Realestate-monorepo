import { BadRequestException } from '@nestjs/common';
import {
  ListingType,
  PublishStatus,
  Role,
  WebsiteLeadIntent,
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
      property: {
        findFirst: jest.fn(),
      },
      unit: {
        findFirst: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      websiteLead: {
        create: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      websiteLeadNote: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
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
    const anyString = expect.any(String) as unknown as string;
    const expectedLeadData = expect.objectContaining({
      email: 'buyer@example.com',
      phone: '555-0100',
      message: 'Please call me about rentals.',
      source: WebsiteLeadSource.CHATBOT,
      status: WebsiteLeadStatus.NEW,
      conversationId: undefined,
      visitorDayHash: anyString,
    }) as unknown as object;
    expect(prisma.websiteLead.create).toHaveBeenCalledWith({
      data: expectedLeadData,
      select: { id: true, status: true },
    });
    const expectedAuditData = expect.objectContaining({
      action: 'PUBLIC_CHATBOT_LEAD_CREATED',
      resource: 'website_lead',
      resourceId: 'lead-1',
    }) as unknown as object;
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expectedAuditData,
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
    const expectedLeadData = expect.objectContaining({
      conversationId: 'conv-1',
    }) as unknown as object;
    expect(prisma.websiteLead.create).toHaveBeenCalledWith({
      data: expectedLeadData,
      select: { id: true, status: true },
    });
  });

  it('creates a contact-form CRM lead linked to its rental and unit', async () => {
    const prisma = prismaMock();
    prisma.property.findFirst.mockResolvedValue({
      id: 'property-1',
      status: 'active',
    });
    prisma.unit.findFirst.mockResolvedValue({ id: 'unit-1' });
    prisma.websiteLead.create.mockResolvedValue({
      id: 'lead-contact-1',
      status: WebsiteLeadStatus.NEW,
    });
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-contact-1' });
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) =>
        Promise.resolve(callback(prisma)),
    );
    const service = new WebsiteLeadsService(prisma as never);

    const result = await service.createFromContact(
      {
        name: 'Taylor Renter',
        email: 'Taylor@Example.com',
        phone: '555-0199',
        message: 'I would like to tour this property next week.',
        intent: WebsiteLeadIntent.RENTAL_TOUR,
        propertyId: 'property-1',
        unitId: 'unit-1',
        moveInDate: '2099-09-01',
      },
      { ipAddress: '127.0.0.1', userAgent: 'jest' },
      fingerprintSecret,
    );

    expect(result).toEqual({
      id: 'lead-contact-1',
      status: WebsiteLeadStatus.NEW,
    });
    expect(prisma.property.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'property-1',
        listingType: ListingType.RENT,
        publishStatus: PublishStatus.PUBLISHED,
      },
      select: { id: true, status: true },
    });
    expect(prisma.unit.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'unit-1',
        propertyId: 'property-1',
        status: 'vacant',
      },
      select: { id: true },
    });
    const expectedContactLeadData = expect.objectContaining({
      name: 'Taylor Renter',
      email: 'taylor@example.com',
      source: WebsiteLeadSource.CONTACT_FORM,
      intent: WebsiteLeadIntent.RENTAL_TOUR,
      status: WebsiteLeadStatus.NEW,
      propertyId: 'property-1',
      unitId: 'unit-1',
      moveInDate: new Date('2099-09-01T00:00:00.000Z'),
    }) as unknown as object;
    expect(prisma.websiteLead.create).toHaveBeenCalledWith({
      data: expectedContactLeadData,
      select: { id: true, status: true },
    });
    const expectedContactAuditData = expect.objectContaining({
      action: 'PUBLIC_WEBSITE_CONTACT_LEAD_CREATED',
      resourceId: 'lead-contact-1',
    }) as unknown as object;
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expectedContactAuditData,
    });
  });

  it('requires a published property for tour and application requests', async () => {
    const prisma = prismaMock();
    const service = new WebsiteLeadsService(prisma as never);

    await expect(
      service.createFromContact({
        name: 'Taylor Renter',
        email: 'taylor@example.com',
        message: 'Please send application details.',
        intent: WebsiteLeadIntent.RENTAL_APPLICATION,
        moveInDate: '2099-09-01',
      }),
    ).rejects.toThrow('A published rental property is required');

    expect(prisma.websiteLead.create).not.toHaveBeenCalled();
  });

  it('rejects a unit that does not belong to the selected rental', async () => {
    const prisma = prismaMock();
    prisma.property.findFirst.mockResolvedValue({
      id: 'property-1',
      status: 'active',
    });
    prisma.unit.findFirst.mockResolvedValue(null);
    const service = new WebsiteLeadsService(prisma as never);

    await expect(
      service.createFromContact({
        name: 'Taylor Renter',
        email: 'taylor@example.com',
        message: 'I would like to tour this unit.',
        intent: WebsiteLeadIntent.RENTAL_TOUR,
        propertyId: 'property-1',
        unitId: 'unit-from-another-property',
        moveInDate: '2099-09-01',
      }),
    ).rejects.toThrow('Rental unit is not available for this property');

    expect(prisma.websiteLead.create).not.toHaveBeenCalled();
  });

  it('rejects rental leads without a future move-in date', async () => {
    const prisma = prismaMock();
    const service = new WebsiteLeadsService(prisma as never);

    await expect(
      service.createFromContact({
        name: 'Taylor Renter',
        email: 'taylor@example.com',
        message: 'I am interested in a rental.',
        intent: WebsiteLeadIntent.RENTAL_INQUIRY,
      }),
    ).rejects.toThrow('Preferred move-in date is required');

    await expect(
      service.createFromContact({
        name: 'Taylor Renter',
        email: 'taylor@example.com',
        message: 'I am interested in a rental.',
        intent: WebsiteLeadIntent.RENTAL_INQUIRY,
        moveInDate: '2000-01-01',
      }),
    ).rejects.toThrow('Move-in date cannot be in the past');
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

  it('counts new leads for the navigation badge', async () => {
    const prisma = prismaMock();
    prisma.websiteLead.count.mockResolvedValue(4);
    const service = new WebsiteLeadsService(prisma as never);

    await expect(service.getNewCount()).resolves.toEqual({ count: 4 });
    expect(prisma.websiteLead.count).toHaveBeenCalledWith({
      where: { status: WebsiteLeadStatus.NEW },
    });
  });

  it('scopes rental-admin lead lists and badges to rental requests', async () => {
    const prisma = prismaMock();
    prisma.websiteLead.findMany.mockResolvedValue([]);
    prisma.websiteLead.count.mockResolvedValue(2);
    const service = new WebsiteLeadsService(prisma as never);

    await service.listForAdmin({}, Role.TENANT_ADMIN);
    await service.getNewCount(Role.TENANT_ADMIN);

    const rentalScope = {
      intent: {
        in: [
          WebsiteLeadIntent.RENTAL_INQUIRY,
          WebsiteLeadIntent.RENTAL_TOUR,
          WebsiteLeadIntent.RENTAL_APPLICATION,
          WebsiteLeadIntent.SIMILAR_RENTAL,
        ],
      },
    };
    expect(prisma.websiteLead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: rentalScope }),
    );
    expect(prisma.websiteLead.count).toHaveBeenCalledWith({
      where: { status: WebsiteLeadStatus.NEW, ...rentalScope },
    });
  });

  it('deletes a lead and records the administrator who removed it', async () => {
    const prisma = prismaMock();
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) =>
        Promise.resolve(callback(prisma)),
    );
    prisma.websiteLead.findFirst.mockResolvedValue({ id: 'lead-5' });
    prisma.websiteLead.delete.mockResolvedValue({ id: 'lead-5' });
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-5' });
    const service = new WebsiteLeadsService(prisma as never);

    await expect(service.deleteForAdmin('lead-5', 'admin-1')).resolves.toEqual({
      id: 'lead-5',
    });
    expect(prisma.websiteLead.delete).toHaveBeenCalledWith({
      where: { id: 'lead-5' },
      select: { id: true },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'admin-1',
        action: 'WEBSITE_LEAD_DELETED',
        resource: 'website_lead',
        resourceId: 'lead-5',
      },
    });
  });
});
