import { ListingStatus, ListingType } from '@prisma/client';
import { SaleListingAssetsService } from './sale-listing-assets.service';

describe('SaleListingAssetsService', () => {
  const firstPhoto =
    'https://project.supabase.co/storage/v1/object/public/listing-media/agent-1/listing-1/photo/front.webp';
  const secondPhoto =
    'https://project.supabase.co/storage/v1/object/public/listing-media/agent-1/listing-1/photo/kitchen.webp';
  const listing = {
    id: 'listing-1',
    agentId: 'agent-1',
    listingType: ListingType.SALE,
    listingStatus: ListingStatus.DRAFT,
    photos: [firstPhoto, secondPhoto],
    documents: ['agent-1/listing-1/document/disclosure.pdf'],
    updatedAt: new Date('2026-08-24T12:00:00.000Z'),
    agent: { id: 'agent-1', companyName: 'Partner Realty' },
  };

  function serviceWith(prisma: object, current = listing) {
    const listings = {
      getForAgent: jest.fn().mockResolvedValue(current),
      getForReview: jest.fn().mockResolvedValue(current),
      notifyReviewers: jest.fn().mockResolvedValue(undefined),
    };
    return {
      service: new SaleListingAssetsService(
        prisma as never,
        { get: jest.fn() } as never,
        listings as never,
      ),
      listings,
    };
  }

  it('reorders photos atomically and records the new cover', async () => {
    const reordered = { ...listing, photos: [secondPhoto, firstPhoto] };
    const tx = {
      property: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(reordered),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };

    await expect(
      serviceWith(prisma).service.reorderPhotos('user-1', listing.id, {
        fromIndex: 1,
        toIndex: 0,
      }),
    ).resolves.toEqual(reordered);
    expect(tx.property.updateMany).toHaveBeenCalledWith({
      where: {
        id: listing.id,
        listingStatus: ListingStatus.DRAFT,
        updatedAt: listing.updatedAt,
      },
      data: {
        photos: [secondPhoto, firstPhoto],
        listingStatus: ListingStatus.DRAFT,
      },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        action: 'SALE_LISTING_PHOTOS_REORDERED',
        resource: 'property',
        resourceId: listing.id,
        oldValue: JSON.stringify({ fromIndex: 1, toIndex: 0 }),
        newValue: JSON.stringify({ coverPhoto: secondPhoto }),
      },
    });
  });

  it('removes the database reference before best-effort storage cleanup', async () => {
    const updated = { ...listing, documents: [] };
    const tx = {
      property: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updated),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };

    await expect(
      serviceWith(prisma).service.remove('user-1', listing.id, 'document', 0),
    ).resolves.toEqual(updated);
    expect(tx.property.updateMany).toHaveBeenCalledWith({
      where: {
        id: listing.id,
        listingStatus: ListingStatus.DRAFT,
        updatedAt: listing.updatedAt,
      },
      data: {
        documents: [],
        listingStatus: ListingStatus.DRAFT,
      },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        action: 'SALE_LISTING_DOCUMENT_REMOVED',
        resource: 'property',
        resourceId: listing.id,
        oldValue: JSON.stringify({
          kind: 'document',
          index: 0,
          value: listing.documents[0],
        }),
        newValue: JSON.stringify({
          count: 0,
          listingStatus: ListingStatus.DRAFT,
        }),
      },
    });
  });
});
