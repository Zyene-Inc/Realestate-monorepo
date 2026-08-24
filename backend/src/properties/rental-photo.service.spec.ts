import { ConflictException } from '@nestjs/common';
import { ListingType, PublishStatus } from '@prisma/client';
import { RentalPhotoService } from './rental-photo.service';

describe('RentalPhotoService', () => {
  const firstPhoto =
    'https://project.supabase.co/storage/v1/object/public/listing-media/rentals/rental-1/photo/front.webp';
  const secondPhoto =
    'https://project.supabase.co/storage/v1/object/public/listing-media/rentals/rental-1/photo/kitchen.webp';
  const baseRental = {
    id: 'rental-1',
    listingType: ListingType.RENT,
    photos: [firstPhoto],
    publishStatus: PublishStatus.DRAFT,
    updatedAt: new Date('2026-08-24T12:00:00.000Z'),
  };

  function serviceWith(prisma: object) {
    return new RentalPhotoService(prisma as never, { get: jest.fn() } as never);
  }

  it('reorders photos and records the new cover atomically', async () => {
    const property = { ...baseRental, photos: [firstPhoto, secondPhoto] };
    const reordered = { ...property, photos: [secondPhoto, firstPhoto] };
    const tx = {
      property: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(reordered),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      property: { findFirst: jest.fn().mockResolvedValue(property) },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };

    await expect(
      serviceWith(prisma).reorder('admin-1', 'rental-1', {
        fromIndex: 1,
        toIndex: 0,
      }),
    ).resolves.toEqual(reordered);
    expect(tx.property.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'rental-1',
        listingType: ListingType.RENT,
        updatedAt: property.updatedAt,
      },
      data: { photos: reordered.photos },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'admin-1',
        action: 'RENTAL_PROPERTY_PHOTOS_REORDERED',
        resource: 'property',
        resourceId: 'rental-1',
        oldValue: JSON.stringify({ fromIndex: 1, toIndex: 0 }),
        newValue: JSON.stringify({ coverPhoto: secondPhoto }),
      },
    });
  });

  it('removes the database reference before best-effort storage cleanup', async () => {
    const updated = { ...baseRental, photos: [] };
    const tx = {
      property: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updated),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      property: { findFirst: jest.fn().mockResolvedValue(baseRental) },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };

    await expect(
      serviceWith(prisma).remove('admin-1', 'rental-1', 0),
    ).resolves.toEqual(updated);
    expect(tx.property.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'rental-1',
        listingType: ListingType.RENT,
        updatedAt: baseRental.updatedAt,
      },
      data: { photos: [] },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'admin-1',
        action: 'RENTAL_PROPERTY_PHOTO_REMOVED',
        resource: 'property',
        resourceId: 'rental-1',
        oldValue: JSON.stringify({ photoUrl: firstPhoto, photoIndex: 0 }),
        newValue: JSON.stringify({ photoCount: 0, coverPhoto: null }),
      },
    });
  });

  it('keeps the last photo on a published rental', async () => {
    const published = {
      ...baseRental,
      publishStatus: PublishStatus.PUBLISHED,
    };
    const prisma = {
      property: { findFirst: jest.fn().mockResolvedValue(published) },
      $transaction: jest.fn(),
    };

    await expect(
      serviceWith(prisma).remove('admin-1', 'rental-1', 0),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
