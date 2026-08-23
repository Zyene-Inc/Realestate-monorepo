import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AgentAccountStatus,
  ListingStatus,
  ListingType,
  Prisma,
  Role,
  UserStatus,
} from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { EmailsService } from '../emails/emails.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleListingDto } from './dto/create-sale-listing.dto';
import {
  AttachListingAssetDto,
  CreateListingUploadDto,
  ListingAssetKind,
} from './dto/listing-asset.dto';
import { UpdateSaleListingDto } from './dto/update-sale-listing.dto';

const PHOTO_BUCKET = 'listing-media';
const DOCUMENT_BUCKET = 'listing-documents';

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
export class SaleListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emails: EmailsService,
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

  private async approvedAgent(userId: string) {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new NotFoundException('Agent profile not found');
    if (agent.accountStatus !== AgentAccountStatus.APPROVED) {
      throw new ForbiddenException(
        'Only approved agents can manage sale listings',
      );
    }
    return agent;
  }

  private async ownedListing(userId: string, listingId: string) {
    const agent = await this.approvedAgent(userId);
    const listing = await this.prisma.property.findFirst({
      where: {
        id: listingId,
        agentId: agent.id,
        listingType: ListingType.SALE,
      },
      include: listingInclude,
    });
    if (!listing) throw new NotFoundException('Sale listing not found');
    return { agent, listing };
  }

  private assertEditable(status: ListingStatus | null) {
    if (status === ListingStatus.PENDING_REVIEW) {
      throw new ConflictException(
        'This listing is under review and cannot be edited',
      );
    }
  }

  private bucket(kind: ListingAssetKind) {
    return kind === 'photo' ? PHOTO_BUCKET : DOCUMENT_BUCKET;
  }

  async listForAgent(userId: string) {
    const agent = await this.approvedAgent(userId);
    return this.prisma.property.findMany({
      where: { agentId: agent.id, listingType: ListingType.SALE },
      include: listingInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getForAgent(userId: string, listingId: string) {
    const { listing } = await this.ownedListing(userId, listingId);
    return listing;
  }

  async createDraft(userId: string, data: CreateSaleListingDto) {
    const agent = await this.approvedAgent(userId);
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.property.create({
        data: {
          listingType: ListingType.SALE,
          listingStatus: ListingStatus.DRAFT,
          agentId: agent.id,
          name: data.name.trim(),
          address: data.address.trim(),
          city: data.city.trim(),
          state: data.state.trim(),
          zip: data.zip.trim(),
          propertyType: data.propertyType.trim(),
          description: data.description?.trim(),
          price: data.price,
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          squareFeet: data.squareFeet,
          amenities: data.amenities ?? [],
          photos: [],
          documents: [],
        },
        include: listingInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'SALE_LISTING_CREATED',
          resource: 'property',
          resourceId: listing.id,
          newValue: JSON.stringify({
            listingStatus: listing.listingStatus,
            name: listing.name,
          }),
        },
      });
      return listing;
    });
  }

  async updateDraft(
    userId: string,
    listingId: string,
    data: UpdateSaleListingDto,
  ) {
    const { listing } = await this.ownedListing(userId, listingId);
    this.assertEditable(listing.listingStatus);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Add at least one field to update');
    }

    const wasApproved = listing.listingStatus === ListingStatus.APPROVED;
    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.property.updateMany({
        where: { id: listing.id, listingStatus: listing.listingStatus },
        data: {
          ...data,
          name: data.name?.trim(),
          address: data.address?.trim(),
          city: data.city?.trim(),
          state: data.state?.trim(),
          zip: data.zip?.trim(),
          propertyType: data.propertyType?.trim(),
          description: data.description?.trim(),
          listingStatus: wasApproved
            ? ListingStatus.PENDING_REVIEW
            : listing.listingStatus,
          submittedAt: wasApproved ? new Date() : listing.submittedAt,
          reviewedAt: wasApproved ? null : listing.reviewedAt,
          reviewedByUserId: wasApproved ? null : listing.reviewedByUserId,
          rejectionReason: wasApproved ? null : listing.rejectionReason,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          'Listing status changed; refresh and retry',
        );
      }
      const result = await tx.property.findUniqueOrThrow({
        where: { id: listing.id },
        include: listingInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: wasApproved
            ? 'SALE_LISTING_EDITED_AND_RESUBMITTED'
            : 'SALE_LISTING_UPDATED',
          resource: 'property',
          resourceId: result.id,
          oldValue: JSON.stringify({ listingStatus: listing.listingStatus }),
          newValue: JSON.stringify({
            listingStatus: result.listingStatus,
            changedFields: Object.keys(data),
          }),
        },
      });
      return result;
    });

    if (wasApproved) await this.notifyReviewers(updated, true);
    return updated;
  }

  async submit(userId: string, listingId: string) {
    const { listing } = await this.ownedListing(userId, listingId);
    if (
      listing.listingStatus !== ListingStatus.DRAFT &&
      listing.listingStatus !== ListingStatus.REJECTED
    ) {
      throw new ConflictException(
        'Only draft or rejected listings can be submitted',
      );
    }
    if (!listing.description?.trim()) {
      throw new BadRequestException('Add a listing description before review');
    }
    if (!listing.price || listing.price.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Add a valid sale price before review');
    }
    if (listing.photos.length === 0) {
      throw new BadRequestException('Add at least one photo before review');
    }

    const previousStatus = listing.listingStatus;
    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.property.updateMany({
        where: { id: listing.id, listingStatus: previousStatus },
        data: {
          listingStatus: ListingStatus.PENDING_REVIEW,
          submittedAt: new Date(),
          reviewedAt: null,
          reviewedByUserId: null,
          rejectionReason: null,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          'Listing status changed; refresh and retry',
        );
      }
      const result = await tx.property.findUniqueOrThrow({
        where: { id: listing.id },
        include: listingInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action:
            previousStatus === ListingStatus.REJECTED
              ? 'SALE_LISTING_RESUBMITTED'
              : 'SALE_LISTING_SUBMITTED',
          resource: 'property',
          resourceId: result.id,
          oldValue: JSON.stringify({ listingStatus: previousStatus }),
          newValue: JSON.stringify({
            listingStatus: ListingStatus.PENDING_REVIEW,
          }),
        },
      });
      return result;
    });
    await this.notifyReviewers(
      updated,
      previousStatus === ListingStatus.REJECTED,
    );
    return updated;
  }

  async updateAvailability(
    userId: string,
    listingId: string,
    status: 'active' | 'sold',
  ) {
    const { listing } = await this.ownedListing(userId, listingId);
    if (listing.listingStatus !== ListingStatus.APPROVED) {
      throw new ConflictException(
        'Only approved listings can change public availability',
      );
    }
    if (listing.status === status) return listing;

    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.property.updateMany({
        where: {
          id: listing.id,
          listingStatus: ListingStatus.APPROVED,
          status: listing.status,
        },
        data: { status },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          'Listing availability changed; refresh and retry',
        );
      }
      const updated = await tx.property.findUniqueOrThrow({
        where: { id: listing.id },
        include: listingInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action:
            status === 'sold'
              ? 'SALE_LISTING_MARKED_SOLD'
              : 'SALE_LISTING_REOPENED',
          resource: 'property',
          resourceId: updated.id,
          oldValue: JSON.stringify({ status: listing.status }),
          newValue: JSON.stringify({ status }),
        },
      });
      return updated;
    });
  }

  async listForReview(status?: ListingStatus) {
    return this.prisma.property.findMany({
      where: {
        listingType: ListingType.SALE,
        listingStatus: status ?? ListingStatus.PENDING_REVIEW,
      },
      include: listingInclude,
      orderBy: [{ submittedAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getForReview(listingId: string) {
    const listing = await this.prisma.property.findFirst({
      where: { id: listingId, listingType: ListingType.SALE },
      include: listingInclude,
    });
    if (!listing) throw new NotFoundException('Sale listing not found');
    return listing;
  }

  async getAuditHistory(listingId: string) {
    await this.getForReview(listingId);
    const events = await this.prisma.auditLog.findMany({
      where: {
        resource: 'property',
        resourceId: listingId,
        action: { startsWith: 'SALE_LISTING_' },
      },
      include: {
        user: { select: { email: true, role: true } },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return events.map((event) => ({
      id: event.id,
      action: event.action,
      oldValue: this.parseAuditValue(event.oldValue),
      newValue: this.parseAuditValue(event.newValue),
      createdAt: event.createdAt,
      actor: event.user,
    }));
  }

  private parseAuditValue(value: string | null) {
    if (!value) return null;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }

  async approve(reviewerId: string, listingId: string) {
    const current = await this.getForReview(listingId);
    if (current.listingStatus !== ListingStatus.PENDING_REVIEW) {
      throw new ConflictException('Only pending listings can be approved');
    }
    const updated = await this.reviewTransition(
      reviewerId,
      current,
      ListingStatus.APPROVED,
    );
    if (updated.agent) {
      await this.emails.sendListingApproved(
        updated.agent.email,
        updated.agent.contactName,
        updated.name,
        updated.id,
      );
    }
    return updated;
  }

  async reject(reviewerId: string, listingId: string, reason: string) {
    const current = await this.getForReview(listingId);
    if (current.listingStatus !== ListingStatus.PENDING_REVIEW) {
      throw new ConflictException('Only pending listings can be rejected');
    }
    const updated = await this.reviewTransition(
      reviewerId,
      current,
      ListingStatus.REJECTED,
      reason.trim(),
    );
    if (updated.agent) {
      await this.emails.sendListingRejected(
        updated.agent.email,
        updated.agent.contactName,
        updated.name,
        reason.trim(),
        updated.id,
      );
    }
    return updated;
  }

  private async reviewTransition(
    reviewerId: string,
    current: Awaited<ReturnType<SaleListingsService['getForReview']>>,
    status: ListingStatus,
    reason?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.property.updateMany({
        where: {
          id: current.id,
          listingStatus: ListingStatus.PENDING_REVIEW,
        },
        data: {
          listingStatus: status,
          reviewedAt: new Date(),
          reviewedByUserId: reviewerId,
          rejectionReason: reason ?? null,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Listing was already reviewed');
      }
      const updated = await tx.property.findUniqueOrThrow({
        where: { id: current.id },
        include: listingInclude,
      });
      await tx.auditLog.create({
        data: {
          userId: reviewerId,
          action:
            status === ListingStatus.APPROVED
              ? 'SALE_LISTING_APPROVED'
              : 'SALE_LISTING_REJECTED',
          resource: 'property',
          resourceId: updated.id,
          oldValue: JSON.stringify({
            listingStatus: ListingStatus.PENDING_REVIEW,
          }),
          newValue: JSON.stringify({ listingStatus: status, reason }),
        },
      });
      return updated;
    });
  }

  async listPublic() {
    return this.prisma.property.findMany({
      where: {
        listingType: ListingType.SALE,
        listingStatus: ListingStatus.APPROVED,
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        propertyType: true,
        description: true,
        price: true,
        bedrooms: true,
        bathrooms: true,
        squareFeet: true,
        amenities: true,
        photos: true,
        status: true,
        reviewedAt: true,
        updatedAt: true,
        agent: {
          select: {
            companyName: true,
            contactName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { reviewedAt: 'desc' },
    });
  }

  async getPublic(listingId: string) {
    const listing = await this.prisma.property.findFirst({
      where: {
        id: listingId,
        listingType: ListingType.SALE,
        listingStatus: ListingStatus.APPROVED,
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        propertyType: true,
        description: true,
        price: true,
        bedrooms: true,
        bathrooms: true,
        squareFeet: true,
        amenities: true,
        photos: true,
        status: true,
        reviewedAt: true,
        updatedAt: true,
        agent: {
          select: {
            companyName: true,
            contactName: true,
            email: true,
            phone: true,
          },
        },
      },
    });
    if (!listing) throw new NotFoundException('Sale listing not found');
    return listing;
  }

  async createUploadUrl(
    userId: string,
    listingId: string,
    data: CreateListingUploadDto,
  ) {
    const { agent, listing } = await this.ownedListing(userId, listingId);
    this.assertEditable(listing.listingStatus);
    if (data.kind === 'photo' && !data.contentType.startsWith('image/')) {
      throw new BadRequestException('Photos must be JPEG, PNG, or WebP');
    }
    if (
      data.kind === 'document' &&
      data.contentType !== 'application/pdf' &&
      !data.contentType.startsWith('image/')
    ) {
      throw new BadRequestException(
        'Documents must be PDF, JPEG, PNG, or WebP',
      );
    }

    const safeName = data.fileName
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .slice(-120);
    const path = `${agent.id}/${listing.id}/${data.kind}/${randomUUID()}-${safeName}`;
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

  async attachAsset(
    userId: string,
    listingId: string,
    data: AttachListingAssetDto,
  ) {
    const { agent, listing } = await this.ownedListing(userId, listingId);
    this.assertEditable(listing.listingStatus);
    const expectedPrefix = `${agent.id}/${listing.id}/${data.kind}/`;
    if (!data.path.startsWith(expectedPrefix)) {
      throw new ForbiddenException('Invalid listing asset path');
    }

    const bucket = this.bucket(data.kind);
    const slash = data.path.lastIndexOf('/');
    const directory = data.path.slice(0, slash);
    const fileName = data.path.slice(slash + 1);
    const { data: objects, error } = await this.storageClient()
      .storage.from(bucket)
      .list(directory, { search: fileName, limit: 2 });
    if (error || !objects?.some((object) => object.name === fileName)) {
      throw new BadRequestException('Upload the file before attaching it');
    }

    const value =
      data.kind === 'photo'
        ? this.storageClient().storage.from(bucket).getPublicUrl(data.path).data
            .publicUrl
        : data.path;
    const existing = data.kind === 'photo' ? listing.photos : listing.documents;
    if (existing.includes(value)) return listing;
    const values = existing.includes(value) ? existing : [...existing, value];
    const wasApproved = listing.listingStatus === ListingStatus.APPROVED;
    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.property.updateMany({
        where: { id: listing.id, listingStatus: listing.listingStatus },
        data: {
          ...(data.kind === 'photo'
            ? { photos: values }
            : { documents: values }),
          listingStatus: wasApproved
            ? ListingStatus.PENDING_REVIEW
            : listing.listingStatus,
          submittedAt: wasApproved ? new Date() : listing.submittedAt,
          reviewedAt: wasApproved ? null : listing.reviewedAt,
          reviewedByUserId: wasApproved ? null : listing.reviewedByUserId,
          rejectionReason: wasApproved ? null : listing.rejectionReason,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          'Listing status changed; refresh and retry',
        );
      }
      const result = await tx.property.findUniqueOrThrow({
        where: { id: listing.id },
        include: listingInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: wasApproved
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
    if (wasApproved) await this.notifyReviewers(updated, true);
    return updated;
  }

  async getAgentDocumentUrl(userId: string, listingId: string, index: number) {
    const { listing } = await this.ownedListing(userId, listingId);
    return this.createDocumentUrl(listing.documents, index);
  }

  async getAdminDocumentUrl(listingId: string, index: number) {
    const listing = await this.getForReview(listingId);
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

  private async notifyReviewers(
    listing: {
      id: string;
      name: string;
      agent: { companyName: string } | null;
    },
    resubmission: boolean,
  ) {
    const reviewers = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.SUPER_ADMIN, Role.SALES_ADMIN] },
        status: UserStatus.ACTIVE,
      },
      select: { email: true },
    });
    await Promise.all(
      reviewers.map(({ email }) =>
        this.emails.sendListingSubmitted(
          email,
          listing.name,
          listing.agent?.companyName ?? 'Approved agent',
          listing.id,
          resubmission,
        ),
      ),
    );
  }
}
