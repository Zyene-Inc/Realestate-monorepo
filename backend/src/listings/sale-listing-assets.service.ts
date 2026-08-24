import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ListingStatus, Prisma } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  AttachListingAssetDto,
  CreateListingUploadDto,
  ListingAssetKind,
  ReorderListingPhotosDto,
} from './dto/listing-asset.dto';
import { SaleListingsService } from './sale-listings.service';

const PHOTO_BUCKET = 'listing-media';
const DOCUMENT_BUCKET = 'listing-documents';
const MAX_PHOTOS = 30;
const MAX_DOCUMENTS = 30;

const listingInclude = {
  agent: {
    select: {
      id: true,
      companyName: true,
      contactName: true,
      email: true,
      phone: true,
    },
  },
  reviewedBy: { select: { email: true } },
} satisfies Prisma.PropertyInclude;

@Injectable()
export class SaleListingAssetsService {
  private readonly logger = new Logger(SaleListingAssetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly listings: SaleListingsService,
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

  private bucket(kind: ListingAssetKind) {
    return kind === 'photo' ? PHOTO_BUCKET : DOCUMENT_BUCKET;
  }

  private assertEditable(status: ListingStatus | null) {
    if (status === ListingStatus.PENDING_REVIEW) {
      throw new ConflictException(
        'This listing is under review and cannot be edited',
      );
    }
  }

  private async ownedListing(userId: string, listingId: string) {
    const listing = await this.listings.getForAgent(userId, listingId);
    this.assertEditable(listing.listingStatus);
    if (!listing.agent) throw new NotFoundException('Agent profile not found');
    return listing;
  }

  private storagePath(
    listing: Awaited<ReturnType<SaleListingsService['getForAgent']>>,
    kind: ListingAssetKind,
    value: string,
  ) {
    const expectedPrefix = `${listing.agentId}/${listing.id}/${kind}/`;
    if (kind === 'document') {
      if (!value.startsWith(expectedPrefix)) {
        throw new BadRequestException('Invalid listing document path');
      }
      return value;
    }

    const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
    let pathname: string;
    try {
      pathname = new URL(value).pathname;
    } catch {
      throw new BadRequestException('Invalid listing photo URL');
    }
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex === -1) {
      throw new BadRequestException('Invalid listing photo URL');
    }
    const path = decodeURIComponent(
      pathname.slice(markerIndex + marker.length),
    );
    if (!path.startsWith(expectedPrefix)) {
      throw new BadRequestException('Invalid listing photo URL');
    }
    return path;
  }

  private async removeStoredAsset(kind: ListingAssetKind, path: string) {
    try {
      const { error } = await this.storageClient()
        .storage.from(this.bucket(kind))
        .remove([path]);
      if (error)
        this.logger.warn(`Unable to remove listing asset: ${error.message}`);
    } catch (error) {
      this.logger.warn(
        `Unable to remove listing asset: ${
          error instanceof Error ? error.message : 'unknown storage error'
        }`,
      );
    }
  }

  private reviewTransition(status: ListingStatus | null) {
    const wasApproved = status === ListingStatus.APPROVED;
    if (!wasApproved) {
      return { wasApproved, data: { listingStatus: status } };
    }
    return {
      wasApproved,
      data: {
        listingStatus: ListingStatus.PENDING_REVIEW,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedByUserId: null,
        rejectionReason: null,
      },
    };
  }

  async createUploadUrl(
    userId: string,
    listingId: string,
    data: CreateListingUploadDto,
  ) {
    const listing = await this.ownedListing(userId, listingId);
    const values = data.kind === 'photo' ? listing.photos : listing.documents;
    const limit = data.kind === 'photo' ? MAX_PHOTOS : MAX_DOCUMENTS;
    if (values.length >= limit) {
      throw new BadRequestException(
        `A listing can have up to ${limit} ${data.kind}s`,
      );
    }

    const safeName = data.fileName
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .slice(-120);
    const path = `${listing.agentId}/${listing.id}/${data.kind}/${randomUUID()}-${safeName}`;
    const bucket = this.bucket(data.kind);
    const { data: signed, error } = await this.storageClient()
      .storage.from(bucket)
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !signed) {
      throw new BadRequestException(
        error?.message || 'Unable to prepare file upload',
      );
    }
    return { bucket, path: signed.path, token: signed.token, expiresIn: 7200 };
  }

  async attach(userId: string, listingId: string, data: AttachListingAssetDto) {
    const listing = await this.ownedListing(userId, listingId);
    const expectedPrefix = `${listing.agentId}/${listing.id}/${data.kind}/`;
    if (!data.path.startsWith(expectedPrefix)) {
      throw new ForbiddenException('Invalid listing asset path');
    }

    const bucket = this.bucket(data.kind);
    const slash = data.path.lastIndexOf('/');
    const directory = data.path.slice(0, slash);
    const fileName = data.path.slice(slash + 1);
    const storage = this.storageClient();
    const { data: objects, error } = await storage.storage
      .from(bucket)
      .list(directory, { search: fileName, limit: 2 });
    if (error || !objects?.some((object) => object.name === fileName)) {
      throw new BadRequestException('Upload the file before attaching it');
    }

    const value =
      data.kind === 'photo'
        ? storage.storage.from(bucket).getPublicUrl(data.path).data.publicUrl
        : data.path;
    const existing = data.kind === 'photo' ? listing.photos : listing.documents;
    if (existing.includes(value)) return listing;
    const limit = data.kind === 'photo' ? MAX_PHOTOS : MAX_DOCUMENTS;
    if (existing.length >= limit) {
      await this.removeStoredAsset(data.kind, data.path);
      throw new BadRequestException(
        `A listing can have up to ${limit} ${data.kind}s`,
      );
    }

    const transition = this.reviewTransition(listing.listingStatus);
    const values = [...existing, value];
    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.property.updateMany({
        where: {
          id: listing.id,
          listingStatus: listing.listingStatus,
          updatedAt: listing.updatedAt,
        },
        data: {
          ...(data.kind === 'photo'
            ? { photos: values }
            : { documents: values }),
          ...transition.data,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Listing changed; refresh and retry');
      }
      const result = await tx.property.findUniqueOrThrow({
        where: { id: listing.id },
        include: listingInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: transition.wasApproved
            ? 'SALE_LISTING_ASSET_ATTACHED_AND_RESUBMITTED'
            : data.kind === 'photo'
              ? 'SALE_LISTING_PHOTO_ATTACHED'
              : 'SALE_LISTING_DOCUMENT_ATTACHED',
          resource: 'property',
          resourceId: listing.id,
          newValue: JSON.stringify({
            kind: data.kind,
            path: data.path,
            listingStatus: result.listingStatus,
          }),
        },
      });
      return result;
    });
    if (transition.wasApproved)
      await this.listings.notifyReviewers(updated, true);
    return updated;
  }

  async reorderPhotos(
    userId: string,
    listingId: string,
    data: ReorderListingPhotosDto,
  ) {
    const listing = await this.ownedListing(userId, listingId);
    if (
      data.fromIndex >= listing.photos.length ||
      data.toIndex >= listing.photos.length
    ) {
      throw new BadRequestException('Listing photo position is out of range');
    }
    if (data.fromIndex === data.toIndex) return listing;

    const photos = [...listing.photos];
    const [photo] = photos.splice(data.fromIndex, 1);
    photos.splice(data.toIndex, 0, photo);
    const transition = this.reviewTransition(listing.listingStatus);
    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.property.updateMany({
        where: {
          id: listing.id,
          listingStatus: listing.listingStatus,
          updatedAt: listing.updatedAt,
        },
        data: { photos, ...transition.data },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Listing changed; refresh and retry');
      }
      const result = await tx.property.findUniqueOrThrow({
        where: { id: listing.id },
        include: listingInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: transition.wasApproved
            ? 'SALE_LISTING_PHOTOS_REORDERED_AND_RESUBMITTED'
            : 'SALE_LISTING_PHOTOS_REORDERED',
          resource: 'property',
          resourceId: listing.id,
          oldValue: JSON.stringify(data),
          newValue: JSON.stringify({ coverPhoto: photos[0] }),
        },
      });
      return result;
    });
    if (transition.wasApproved)
      await this.listings.notifyReviewers(updated, true);
    return updated;
  }

  async remove(
    userId: string,
    listingId: string,
    kind: ListingAssetKind,
    index: number,
  ) {
    const listing = await this.ownedListing(userId, listingId);
    const existing = kind === 'photo' ? listing.photos : listing.documents;
    const value = existing[index];
    if (!value) throw new NotFoundException(`Listing ${kind} not found`);
    const path = this.storagePath(listing, kind, value);
    const values = existing.filter((_, valueIndex) => valueIndex !== index);
    const transition = this.reviewTransition(listing.listingStatus);
    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.property.updateMany({
        where: {
          id: listing.id,
          listingStatus: listing.listingStatus,
          updatedAt: listing.updatedAt,
        },
        data: {
          ...(kind === 'photo' ? { photos: values } : { documents: values }),
          ...transition.data,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Listing changed; refresh and retry');
      }
      const result = await tx.property.findUniqueOrThrow({
        where: { id: listing.id },
        include: listingInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: transition.wasApproved
            ? 'SALE_LISTING_ASSET_REMOVED_AND_RESUBMITTED'
            : kind === 'photo'
              ? 'SALE_LISTING_PHOTO_REMOVED'
              : 'SALE_LISTING_DOCUMENT_REMOVED',
          resource: 'property',
          resourceId: listing.id,
          oldValue: JSON.stringify({ kind, index, value }),
          newValue: JSON.stringify({
            count: values.length,
            listingStatus: result.listingStatus,
          }),
        },
      });
      return result;
    });
    await this.removeStoredAsset(kind, path);
    if (transition.wasApproved)
      await this.listings.notifyReviewers(updated, true);
    return updated;
  }

  async getAgentDocumentUrl(userId: string, listingId: string, index: number) {
    const listing = await this.listings.getForAgent(userId, listingId);
    return this.createDocumentUrl(listing.documents, index);
  }

  async getAdminDocumentUrl(listingId: string, index: number) {
    const listing = await this.listings.getForReview(listingId);
    return this.createDocumentUrl(listing.documents, index);
  }

  private async createDocumentUrl(documents: string[], index: number) {
    const path = documents[index];
    if (!path) throw new NotFoundException('Listing document not found');
    const { data, error } = await this.storageClient()
      .storage.from(DOCUMENT_BUCKET)
      .createSignedUrl(path, 300, { download: true });
    if (error || !data?.signedUrl) {
      throw new BadRequestException(
        error?.message || 'Unable to prepare document download',
      );
    }
    return { url: data.signedUrl, expiresIn: 300 };
  }
}
