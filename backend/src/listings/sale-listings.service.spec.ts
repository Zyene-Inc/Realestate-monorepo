import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AgentAccountStatus,
  ListingStatus,
  ListingType,
  Role,
  UserStatus,
} from '@prisma/client';
import { SaleListingsService } from './sale-listings.service';

describe('SaleListingsService', () => {
  const agent = {
    id: 'agent-1',
    userId: 'user-1',
    accountStatus: AgentAccountStatus.APPROVED,
    companyName: 'Johnson Partner Realty',
  };
  const listing = {
    id: 'listing-1',
    agentId: agent.id,
    listingType: ListingType.SALE,
    listingStatus: ListingStatus.DRAFT,
    name: 'Oak Street Home',
    address: '100 Oak Street',
    city: 'Kansas City',
    state: 'MO',
    zip: '64101',
    propertyType: 'Single Family',
    description: 'A complete sale listing.',
    price: { lessThanOrEqualTo: jest.fn().mockReturnValue(false) },
    photos: ['https://example.com/home.webp'],
    documents: [],
    amenities: [],
    status: 'active',
    submittedAt: null,
    reviewedAt: null,
    reviewedByUserId: null,
    rejectionReason: null,
    agent: {
      companyName: agent.companyName,
      contactName: 'Jordan Agent',
      email: 'agent@example.com',
    },
  };

  function serviceWith(prisma: object, emails: object = {}) {
    return new SaleListingsService(
      prisma as never,
      { get: jest.fn() } as never,
      emails as never,
    );
  }

  function firstArgument(mock: { mock: { calls: unknown[][] } }): unknown {
    return mock.mock.calls[0]?.[0];
  }

  function ownedPrisma(current = listing) {
    return {
      agent: { findUnique: jest.fn().mockResolvedValue(agent) },
      property: { findFirst: jest.fn().mockResolvedValue(current) },
    };
  }

  it('requires an existing approved agent account', async () => {
    const missing = serviceWith({
      agent: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    await expect(missing.listForAgent('user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    const pending = serviceWith({
      agent: {
        findUnique: jest.fn().mockResolvedValue({
          ...agent,
          accountStatus: AgentAccountStatus.PENDING,
        }),
      },
    });
    await expect(pending.listForAgent('user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lists only sale listings owned by the approved agent', async () => {
    const prisma = {
      agent: { findUnique: jest.fn().mockResolvedValue(agent) },
      property: { findMany: jest.fn().mockResolvedValue([listing]) },
    };
    await expect(serviceWith(prisma).listForAgent('user-1')).resolves.toEqual([
      listing,
    ]);
    expect(prisma.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { agentId: agent.id, listingType: ListingType.SALE },
        orderBy: { updatedAt: 'desc' },
      }),
    );
  });

  it('creates a trimmed draft and audit event atomically', async () => {
    const created = { ...listing, id: 'listing-created' };
    const tx = {
      property: { create: jest.fn().mockResolvedValue(created) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      agent: { findUnique: jest.fn().mockResolvedValue(agent) },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const data = {
      name: '  Oak Street Home  ',
      address: '  100 Oak Street ',
      city: ' Kansas City ',
      state: ' MO ',
      zip: ' 64101 ',
      propertyType: ' Single Family ',
      description: ' Complete listing ',
      price: 350000,
      amenities: ['Garage'],
    };

    await expect(
      serviceWith(prisma).createDraft('user-1', data),
    ).resolves.toEqual(created);
    expect(firstArgument(tx.property.create)).toMatchObject({
      data: {
        listingType: ListingType.SALE,
        listingStatus: ListingStatus.DRAFT,
        agentId: agent.id,
        name: 'Oak Street Home',
        address: '100 Oak Street',
      },
    });
    expect(firstArgument(tx.auditLog.create)).toMatchObject({
      data: {
        userId: 'user-1',
        action: 'SALE_LISTING_CREATED',
        resourceId: created.id,
      },
    });
  });

  it('blocks empty and pending-review edits', async () => {
    await expect(
      serviceWith(ownedPrisma()).updateDraft('user-1', listing.id, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      serviceWith(
        ownedPrisma({
          ...listing,
          listingStatus: ListingStatus.PENDING_REVIEW,
        }),
      ).updateDraft('user-1', listing.id, { name: 'Changed' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns approved edits to review and notifies reviewers', async () => {
    const approved = { ...listing, listingStatus: ListingStatus.APPROVED };
    const updated = {
      ...approved,
      name: 'Updated home',
      listingStatus: ListingStatus.PENDING_REVIEW,
    };
    const tx = {
      property: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updated),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const emails = { sendListingSubmitted: jest.fn().mockResolvedValue({}) };
    const prisma = {
      ...ownedPrisma(approved),
      user: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ email: 'reviewer@example.com' }]),
      },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };

    await expect(
      serviceWith(prisma, emails).updateDraft('user-1', listing.id, {
        name: ' Updated home ',
      }),
    ).resolves.toEqual(updated);
    expect(firstArgument(tx.property.updateMany)).toMatchObject({
      data: {
        name: 'Updated home',
        listingStatus: ListingStatus.PENDING_REVIEW,
        reviewedByUserId: null,
      },
    });
    expect(emails.sendListingSubmitted).toHaveBeenCalledWith(
      'reviewer@example.com',
      updated.name,
      agent.companyName,
      updated.id,
      true,
    );
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        role: { in: [Role.SUPER_ADMIN, Role.SALES_ADMIN] },
        status: UserStatus.ACTIVE,
      },
      select: { email: true },
    });
  });

  it.each([
    [{ description: '  ' }, 'description'],
    [{ price: null }, 'price'],
    [{ photos: [] }, 'photo'],
  ])('validates submit prerequisites: %s', async (changes, expected) => {
    await expect(
      serviceWith(ownedPrisma({ ...listing, ...changes })).submit(
        'user-1',
        listing.id,
      ),
    ).rejects.toThrow(expected);
  });

  it('submits a complete draft exactly once and records its transition', async () => {
    const submitted = {
      ...listing,
      listingStatus: ListingStatus.PENDING_REVIEW,
    };
    const tx = {
      property: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(submitted),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const emails = { sendListingSubmitted: jest.fn().mockResolvedValue({}) };
    const prisma = {
      ...ownedPrisma(),
      user: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };

    await expect(
      serviceWith(prisma, emails).submit('user-1', listing.id),
    ).resolves.toEqual(submitted);
    expect(firstArgument(tx.auditLog.create)).toMatchObject({
      data: {
        action: 'SALE_LISTING_SUBMITTED',
        resourceId: listing.id,
      },
    });
  });

  it('changes approved public availability atomically and no-ops duplicates', async () => {
    const approved = { ...listing, listingStatus: ListingStatus.APPROVED };
    const prismaNoop = ownedPrisma(approved);
    await expect(
      serviceWith(prismaNoop).updateAvailability(
        'user-1',
        listing.id,
        'active',
      ),
    ).resolves.toEqual(approved);

    const sold = { ...approved, status: 'sold' };
    const tx = {
      property: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(sold),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      ...ownedPrisma(approved),
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    await expect(
      serviceWith(prisma).updateAvailability('user-1', listing.id, 'sold'),
    ).resolves.toEqual(sold);
    expect(firstArgument(tx.auditLog.create)).toMatchObject({
      data: { action: 'SALE_LISTING_MARKED_SOLD' },
    });
  });

  it('returns parsed sale-listing audit history in chronological order', async () => {
    const prisma = {
      property: { findFirst: jest.fn().mockResolvedValue(listing) },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'audit-1',
            action: 'SALE_LISTING_CREATED',
            oldValue: null,
            newValue: '{"listingStatus":"DRAFT"}',
            createdAt: new Date('2026-08-01T00:00:00Z'),
            user: { email: 'agent@example.com', role: Role.AGENT },
          },
          {
            id: 'audit-2',
            action: 'SALE_LISTING_UPDATED',
            oldValue: 'legacy-value',
            newValue: null,
            createdAt: new Date('2026-08-02T00:00:00Z'),
            user: null,
          },
        ]),
      },
    };
    await expect(
      serviceWith(prisma).getAuditHistory(listing.id),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'audit-1',
        oldValue: null,
        newValue: { listingStatus: 'DRAFT' },
      }),
      expect.objectContaining({ id: 'audit-2', oldValue: 'legacy-value' }),
    ]);
    expect(firstArgument(prisma.auditLog.findMany)).toMatchObject({
      where: { resourceId: listing.id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  });

  it.each([
    [ListingStatus.APPROVED, 'SALE_LISTING_APPROVED', 'sendListingApproved'],
    [ListingStatus.REJECTED, 'SALE_LISTING_REJECTED', 'sendListingRejected'],
  ] as const)(
    'performs the %s review transition and sends the matching email',
    async (status, action, emailMethod) => {
      const current = {
        ...listing,
        listingStatus: ListingStatus.PENDING_REVIEW,
      };
      const updated = {
        ...current,
        listingStatus: status,
        rejectionReason: status === ListingStatus.REJECTED ? 'Fix price' : null,
      };
      const tx = {
        property: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: jest.fn().mockResolvedValue(updated),
        },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      };
      const prisma = {
        property: { findFirst: jest.fn().mockResolvedValue(current) },
        $transaction: jest.fn(
          async (callback: (client: typeof tx) => Promise<unknown>) =>
            callback(tx),
        ),
      };
      const emails = {
        sendListingApproved: jest.fn().mockResolvedValue({}),
        sendListingRejected: jest.fn().mockResolvedValue({}),
      };
      const service = serviceWith(prisma, emails);

      if (status === ListingStatus.APPROVED) {
        await service.approve('reviewer-1', listing.id);
      } else {
        await service.reject('reviewer-1', listing.id, ' Fix price ');
      }

      expect(firstArgument(tx.auditLog.create)).toMatchObject({
        data: { action },
      });
      expect(emails[emailMethod]).toHaveBeenCalled();
    },
  );

  it('rejects stale concurrent workflow transitions', async () => {
    const pending = {
      ...listing,
      listingStatus: ListingStatus.PENDING_REVIEW,
    };
    const tx = {
      property: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const prisma = {
      property: { findFirst: jest.fn().mockResolvedValue(pending) },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    await expect(
      serviceWith(prisma).approve('reviewer-1', listing.id),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps public queries restricted to approved sale listings', async () => {
    const prisma = {
      property: {
        findMany: jest.fn().mockResolvedValue([listing]),
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(listing)
          .mockResolvedValueOnce(null),
      },
    };
    const service = serviceWith(prisma);
    await expect(service.listPublic()).resolves.toEqual([listing]);
    await expect(service.getPublic(listing.id)).resolves.toEqual(listing);
    await expect(service.getPublic('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          listingType: ListingType.SALE,
          listingStatus: ListingStatus.APPROVED,
        },
      }),
    );
  });
});
