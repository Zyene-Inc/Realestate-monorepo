import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ListingType, Prisma, PublishStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  AttachRentalPhotoDto,
  CreateRentalPhotoUploadDto,
  ReorderRentalPhotosDto,
} from './dto/rental-property.dto';

const RENTAL_PHOTO_BUCKET = 'listing-media';
const MAX_RENTAL_PHOTOS = 30;

const rentalPhotoInclude = {
  owner: {
    select: {
      id: true,
      ownerName: true,
      companyName: true,
      contactEmail: true,
    },
  },
  units: { orderBy: [{ unitNumber: 'asc' as const }] },
} satisfies Prisma.PropertyInclude;

@Injectable()
export class RentalPhotoService {
  private readonly logger = new Logger(RentalPhotoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private storageClient() {
    const url = this.config.get<string>('SUPABASE_URL');
    const secretKey = this.config.get<string>('SUPABASE_SECRET_KEY');
    if (!url || !secretKey) {
      throw new InternalServerErrorException(
        'Supabase Storage is not configured',
      );
    }
    return createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  private async rental(id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, listingType: ListingType.RENT },
      include: rentalPhotoInclude,
    });
    if (!property) throw new NotFoundException('Rental property not found');
    return property;
  }

  private rentalPhotoPath(propertyId: string, photoUrl: string) {
    const publicPathMarker = `/storage/v1/object/public/${RENTAL_PHOTO_BUCKET}/`;
    let pathname: string;
    try {
      pathname = new URL(photoUrl).pathname;
    } catch {
      throw new BadRequestException('Invalid rental photo URL');
    }
    const markerIndex = pathname.indexOf(publicPathMarker);
    if (markerIndex === -1) {
      throw new BadRequestException('Invalid rental photo URL');
    }
    const path = decodeURIComponent(
      pathname.slice(markerIndex + publicPathMarker.length),
    );
    if (!path.startsWith(`rentals/${propertyId}/photo/`)) {
      throw new BadRequestException('Invalid rental photo URL');
    }
    return path;
  }

  private async removeStoredPhotos(paths: string[]) {
    if (paths.length === 0) return;
    try {
      const { error } = await this.storageClient()
        .storage.from(RENTAL_PHOTO_BUCKET)
        .remove(paths);
      if (error) {
        this.logger.warn(`Unable to remove rental photos: ${error.message}`);
      }
    } catch (error) {
      this.logger.warn(
        `Unable to remove rental photos: ${
          error instanceof Error ? error.message : 'unknown storage error'
        }`,
      );
    }
  }

  async createUploadUrl(id: string, data: CreateRentalPhotoUploadDto) {
    const property = await this.rental(id);
    if (property.photos.length >= MAX_RENTAL_PHOTOS) {
      throw new BadRequestException(
        `A rental can have up to ${MAX_RENTAL_PHOTOS} photos`,
      );
    }
    const safeName = data.fileName
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .slice(-120);
    const path = `rentals/${id}/photo/${randomUUID()}-${safeName}`;
    const { data: signed, error } = await this.storageClient()
      .storage.from(RENTAL_PHOTO_BUCKET)
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !signed) {
      throw new BadRequestException(
        error?.message || 'Unable to prepare photo upload',
      );
    }
    return {
      bucket: RENTAL_PHOTO_BUCKET,
      path: signed.path,
      token: signed.token,
      expiresIn: 7200,
    };
  }

  async attach(userId: string, id: string, data: AttachRentalPhotoDto) {
    const property = await this.rental(id);
    if (property.photos.length >= MAX_RENTAL_PHOTOS) {
      throw new BadRequestException(
        `A rental can have up to ${MAX_RENTAL_PHOTOS} photos`,
      );
    }
    const expectedPrefix = `rentals/${id}/photo/`;
    if (!data.path.startsWith(expectedPrefix)) {
      throw new BadRequestException('Invalid rental photo path');
    }
    const slash = data.path.lastIndexOf('/');
    const directory = data.path.slice(0, slash);
    const fileName = data.path.slice(slash + 1);
    const storage = this.storageClient();
    const { data: objects, error } = await storage.storage
      .from(RENTAL_PHOTO_BUCKET)
      .list(directory, { search: fileName, limit: 2 });
    if (error || !objects?.some((object) => object.name === fileName)) {
      throw new BadRequestException('Upload the photo before attaching it');
    }
    const publicUrl = storage.storage
      .from(RENTAL_PHOTO_BUCKET)
      .getPublicUrl(data.path).data.publicUrl;
    if (property.photos.includes(publicUrl)) return property;

    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.property.updateMany({
        where: {
          id,
          listingType: ListingType.RENT,
          updatedAt: property.updatedAt,
        },
        data: { photos: [...property.photos, publicUrl] },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Property changed; refresh and retry');
      }
      const updated = await tx.property.findUniqueOrThrow({
        where: { id },
        include: rentalPhotoInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'RENTAL_PROPERTY_PHOTO_ATTACHED',
          resource: 'property',
          resourceId: id,
          newValue: JSON.stringify({ path: data.path }),
        },
      });
      return updated;
    });
  }

  async reorder(userId: string, id: string, data: ReorderRentalPhotosDto) {
    const property = await this.rental(id);
    if (
      data.fromIndex >= property.photos.length ||
      data.toIndex >= property.photos.length
    ) {
      throw new BadRequestException('Rental photo position is out of range');
    }
    if (data.fromIndex === data.toIndex) return property;

    const photos = [...property.photos];
    const [photo] = photos.splice(data.fromIndex, 1);
    photos.splice(data.toIndex, 0, photo);

    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.property.updateMany({
        where: {
          id,
          listingType: ListingType.RENT,
          updatedAt: property.updatedAt,
        },
        data: { photos },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Property changed; refresh and retry');
      }
      const updated = await tx.property.findUniqueOrThrow({
        where: { id },
        include: rentalPhotoInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'RENTAL_PROPERTY_PHOTOS_REORDERED',
          resource: 'property',
          resourceId: id,
          oldValue: JSON.stringify({
            fromIndex: data.fromIndex,
            toIndex: data.toIndex,
          }),
          newValue: JSON.stringify({ coverPhoto: photos[0] }),
        },
      });
      return updated;
    });
  }

  async remove(userId: string, id: string, photoIndex: number) {
    const property = await this.rental(id);
    if (photoIndex < 0 || photoIndex >= property.photos.length) {
      throw new BadRequestException('Rental photo position is out of range');
    }
    const photoUrl = property.photos[photoIndex];
    const storagePath = this.rentalPhotoPath(id, photoUrl);
    const photos = property.photos.filter((_, index) => index !== photoIndex);
    if (
      property.publishStatus === PublishStatus.PUBLISHED &&
      photos.length === 0
    ) {
      throw new ConflictException(
        'Published rentals need a photo. Upload a replacement or unpublish first',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.property.updateMany({
        where: {
          id,
          listingType: ListingType.RENT,
          updatedAt: property.updatedAt,
        },
        data: { photos },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Property changed; refresh and retry');
      }
      const result = await tx.property.findUniqueOrThrow({
        where: { id },
        include: rentalPhotoInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'RENTAL_PROPERTY_PHOTO_REMOVED',
          resource: 'property',
          resourceId: id,
          oldValue: JSON.stringify({ photoUrl, photoIndex }),
          newValue: JSON.stringify({
            photoCount: photos.length,
            coverPhoto: photos[0] ?? null,
          }),
        },
      });
      return result;
    });

    await this.removeStoredPhotos([storagePath]);
    return updated;
  }

  async removePropertyPhotos(propertyId: string, photoUrls: string[]) {
    const storagePaths = photoUrls.flatMap((photoUrl) => {
      try {
        return [this.rentalPhotoPath(propertyId, photoUrl)];
      } catch {
        return [];
      }
    });
    await this.removeStoredPhotos(storagePaths);
  }
}
