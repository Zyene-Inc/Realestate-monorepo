import { BadRequestException } from '@nestjs/common';
import { ListingType, PublishStatus } from '@prisma/client';
import { PropertiesService } from './properties.service';

describe('PropertiesService rental publishing', () => {
  const baseRental = {
    id: 'rental-1',
    listingType: ListingType.RENT,
    publishStatus: PublishStatus.DRAFT,
    description: 'A complete rental description.',
    rentAmount: 1500,
    status: 'active',
    units: [],
    updatedAt: new Date(),
  };

  function serviceWith(prisma: object) {
    return new PropertiesService(
      prisma as never,
      { get: jest.fn() } as never,
      { sendRentalPublished: jest.fn() } as never,
    );
  }

  it('refuses to publish an incomplete rental', async () => {
    const prisma = {
      property: {
        findFirst: jest.fn().mockResolvedValue({
          ...baseRental,
          description: '   ',
        }),
      },
      $transaction: jest.fn(),
    };

    await expect(
      serviceWith(prisma).publish('admin-1', 'rental-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('publishes directly and writes the exact audit event atomically', async () => {
    const publishedAt = new Date('2026-08-22T18:00:00.000Z');
    jest.useFakeTimers().setSystemTime(publishedAt);
    const tx = {
      property: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          ...baseRental,
          publishStatus: PublishStatus.PUBLISHED,
        }),
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
      serviceWith(prisma).publish('admin-1', 'rental-1'),
    ).resolves.toMatchObject({ publishStatus: PublishStatus.PUBLISHED });
    expect(tx.property.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'rental-1',
        listingType: ListingType.RENT,
        publishStatus: PublishStatus.DRAFT,
      },
      data: { publishStatus: PublishStatus.PUBLISHED, publishedAt },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'admin-1',
        action: 'RENTAL_PROPERTY_PUBLISHED',
        resource: 'property',
        resourceId: 'rental-1',
        oldValue: JSON.stringify({ publishStatus: PublishStatus.DRAFT }),
        newValue: JSON.stringify({ publishStatus: PublishStatus.PUBLISHED }),
      },
    });
    jest.useRealTimers();
  });
});
