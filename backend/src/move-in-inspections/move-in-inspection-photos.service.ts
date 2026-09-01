import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InspectionPhotoSource,
  MoveInInspectionStatus,
  Prisma,
} from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  AttachInspectionPhotoDto,
  InspectionPhotoUploadDto,
  InspectionRevisionDto,
} from './dto/move-in-inspection.dto';
import { MoveInInspectionsService } from './move-in-inspections.service';

const MOVE_IN_INSPECTION_BUCKET = 'move-in-inspection-media';
const MAX_INSPECTION_PHOTOS = 60;
const MAX_TENANT_PHOTOS = 20;

@Injectable()
export class MoveInInspectionPhotosService {
  private readonly logger = new Logger(MoveInInspectionPhotosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly inspections: MoveInInspectionsService,
  ) {}

  async createAdminUploadUrl(
    userId: string,
    inspectionId: string,
    data: InspectionPhotoUploadDto,
  ) {
    await this.assertUploadAccess(
      userId,
      inspectionId,
      data.expectedRevision,
      InspectionPhotoSource.STAFF,
    );
    return this.createUploadUrl(
      inspectionId,
      data,
      InspectionPhotoSource.STAFF,
    );
  }

  async createTenantUploadUrl(
    userId: string,
    inspectionId: string,
    data: InspectionPhotoUploadDto,
  ) {
    await this.assertUploadAccess(
      userId,
      inspectionId,
      data.expectedRevision,
      InspectionPhotoSource.TENANT,
    );
    return this.createUploadUrl(
      inspectionId,
      data,
      InspectionPhotoSource.TENANT,
    );
  }

  async attachForAdmin(
    userId: string,
    inspectionId: string,
    data: AttachInspectionPhotoDto,
  ) {
    await this.attach(userId, inspectionId, data, InspectionPhotoSource.STAFF);
    return this.inspections.getForAdmin(inspectionId);
  }

  async attachForTenant(
    userId: string,
    inspectionId: string,
    data: AttachInspectionPhotoDto,
  ) {
    await this.attach(userId, inspectionId, data, InspectionPhotoSource.TENANT);
    return this.inspections.getForTenant(userId);
  }

  async downloadForAdmin(inspectionId: string, photoId: string) {
    return this.download(inspectionId, photoId);
  }

  async downloadForTenant(
    userId: string,
    inspectionId: string,
    photoId: string,
  ) {
    await this.assertTenantOwns(userId, inspectionId);
    return this.download(inspectionId, photoId);
  }

  async removeForAdmin(
    userId: string,
    inspectionId: string,
    photoId: string,
    data: InspectionRevisionDto,
  ) {
    await this.remove(
      userId,
      inspectionId,
      photoId,
      data,
      InspectionPhotoSource.STAFF,
    );
    return this.inspections.getForAdmin(inspectionId);
  }

  async removeForTenant(
    userId: string,
    inspectionId: string,
    photoId: string,
    data: InspectionRevisionDto,
  ) {
    await this.remove(
      userId,
      inspectionId,
      photoId,
      data,
      InspectionPhotoSource.TENANT,
    );
    return this.inspections.getForTenant(userId);
  }

  private storageClient() {
    const url = this.config.get<string>('SUPABASE_URL');
    const secretKey = this.config.get<string>('SUPABASE_SECRET_KEY');
    if (!url || !secretKey) {
      throw new InternalServerErrorException(
        'Private inspection photo storage is not configured',
      );
    }
    return createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  private safeName(value: string) {
    return value
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .slice(-120);
  }

  private async createUploadUrl(
    inspectionId: string,
    data: InspectionPhotoUploadDto,
    source: InspectionPhotoSource,
  ) {
    const path = `inspections/${inspectionId}/${source.toLowerCase()}/${randomUUID()}-${this.safeName(data.fileName)}`;
    const { data: signed, error } = await this.storageClient()
      .storage.from(MOVE_IN_INSPECTION_BUCKET)
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !signed) {
      throw new BadRequestException(
        error?.message || 'Unable to prepare inspection photo upload',
      );
    }
    return {
      bucket: MOVE_IN_INSPECTION_BUCKET,
      path: signed.path,
      token: signed.token,
      expiresIn: 7200,
    };
  }

  private async attach(
    userId: string,
    inspectionId: string,
    data: AttachInspectionPhotoDto,
    source: InspectionPhotoSource,
  ) {
    const expectedPrefix = `inspections/${inspectionId}/${source.toLowerCase()}/`;
    if (!data.path.startsWith(expectedPrefix)) {
      throw new BadRequestException('Invalid inspection photo path');
    }
    if (data.itemId && data.meterReadingId) {
      throw new BadRequestException(
        'Attach a photo to either an item or meter reading',
      );
    }
    const storage = this.storageClient();
    const slash = data.path.lastIndexOf('/');
    const directory = data.path.slice(0, slash);
    const fileName = data.path.slice(slash + 1);
    const { data: objects, error } = await storage.storage
      .from(MOVE_IN_INSPECTION_BUCKET)
      .list(directory, { search: fileName, limit: 2 });
    const object = objects?.find((item) => item.name === fileName);
    if (error || !object) {
      throw new BadRequestException('Upload the photo before attaching it');
    }
    const actualSize = Number(object.metadata?.size ?? data.sizeBytes);
    if (actualSize < 1 || actualSize > 8 * 1024 * 1024) {
      await storage.storage.from(MOVE_IN_INSPECTION_BUCKET).remove([data.path]);
      throw new BadRequestException('Inspection photo exceeds the 8 MB limit');
    }

    await this.prisma.$transaction(async (tx) => {
      const inspection = await this.lockedForSource(
        tx,
        userId,
        inspectionId,
        data.expectedRevision,
        source,
      );
      if (inspection._count.photos >= MAX_INSPECTION_PHOTOS) {
        throw new ConflictException(
          `An inspection can contain up to ${MAX_INSPECTION_PHOTOS} photos`,
        );
      }
      if (source === InspectionPhotoSource.TENANT) {
        const tenantCount = await tx.moveInInspectionPhoto.count({
          where: { inspectionId, source: InspectionPhotoSource.TENANT },
        });
        if (tenantCount >= MAX_TENANT_PHOTOS) {
          throw new ConflictException(
            `A tenant can add up to ${MAX_TENANT_PHOTOS} inspection photos`,
          );
        }
      }
      await this.assertAttachment(
        tx,
        inspectionId,
        data.itemId,
        data.meterReadingId,
      );
      await tx.moveInInspectionPhoto.create({
        data: {
          inspectionId,
          itemId: data.itemId,
          meterReadingId: data.meterReadingId,
          source,
          storagePath: data.path,
          originalFileName: this.safeName(data.fileName),
          contentType: data.contentType,
          sizeBytes: actualSize,
          caption: data.caption?.trim() || null,
          uploadedByUserId: userId,
        },
      });
      await tx.moveInInspection.update({
        where: { id: inspectionId },
        data: { revision: { increment: 1 } },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'MOVE_IN_INSPECTION_PHOTO_ATTACHED',
          resource: 'move_in_inspection',
          resourceId: inspectionId,
          newValue: JSON.stringify({ source, itemId: data.itemId ?? null }),
        },
      });
    });
  }

  private async download(inspectionId: string, photoId: string) {
    const photo = await this.prisma.moveInInspectionPhoto.findFirst({
      where: { id: photoId, inspectionId },
    });
    if (!photo) throw new NotFoundException('Inspection photo not found');
    const { data, error } = await this.storageClient()
      .storage.from(MOVE_IN_INSPECTION_BUCKET)
      .createSignedUrl(photo.storagePath, 300);
    if (error || !data?.signedUrl) {
      throw new BadRequestException(error?.message || 'Unable to open photo');
    }
    return { url: data.signedUrl, expiresIn: 300 };
  }

  private async remove(
    userId: string,
    inspectionId: string,
    photoId: string,
    data: InspectionRevisionDto,
    source: InspectionPhotoSource,
  ) {
    const path = await this.prisma.$transaction(async (tx) => {
      await this.lockedForSource(
        tx,
        userId,
        inspectionId,
        data.expectedRevision,
        source,
      );
      const photo = await tx.moveInInspectionPhoto.findFirst({
        where: {
          id: photoId,
          inspectionId,
          source,
          ...(source === InspectionPhotoSource.TENANT
            ? { uploadedByUserId: userId }
            : {}),
        },
      });
      if (!photo) throw new NotFoundException('Inspection photo not found');
      await tx.moveInInspectionPhoto.delete({ where: { id: photo.id } });
      await tx.moveInInspection.update({
        where: { id: inspectionId },
        data: { revision: { increment: 1 } },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'MOVE_IN_INSPECTION_PHOTO_REMOVED',
          resource: 'move_in_inspection',
          resourceId: inspectionId,
          oldValue: JSON.stringify({ photoId, source }),
        },
      });
      return photo.storagePath;
    });
    const { error } = await this.storageClient()
      .storage.from(MOVE_IN_INSPECTION_BUCKET)
      .remove([path]);
    if (error) {
      this.logger.warn(`Inspection photo cleanup failed: ${error.message}`);
    }
  }

  private async assertUploadAccess(
    userId: string,
    inspectionId: string,
    expectedRevision: number,
    source: InspectionPhotoSource,
  ) {
    const inspection = await this.prisma.moveInInspection.findUnique({
      where: { id: inspectionId },
      select: {
        revision: true,
        status: true,
        tenant: { select: { userId: true } },
      },
    });
    if (!inspection)
      throw new NotFoundException('Move-in inspection not found');
    if (inspection.revision !== expectedRevision) {
      throw new ConflictException(
        'The inspection changed. Refresh and try again.',
      );
    }
    this.assertSourceAccess(inspection, userId, source);
  }

  private async lockedForSource(
    tx: Prisma.TransactionClient,
    userId: string,
    inspectionId: string,
    expectedRevision: number,
    source: InspectionPhotoSource,
  ) {
    await tx.$queryRaw`SELECT "id" FROM "MoveInInspection" WHERE "id" = ${inspectionId} FOR UPDATE`;
    const inspection = await tx.moveInInspection.findUnique({
      where: { id: inspectionId },
      select: {
        revision: true,
        status: true,
        tenant: { select: { userId: true } },
        _count: { select: { photos: true } },
      },
    });
    if (!inspection)
      throw new NotFoundException('Move-in inspection not found');
    if (inspection.revision !== expectedRevision) {
      throw new ConflictException(
        'The inspection changed. Refresh and try again.',
      );
    }
    this.assertSourceAccess(inspection, userId, source);
    return inspection;
  }

  private assertSourceAccess(
    inspection: {
      status: MoveInInspectionStatus;
      tenant: { userId: string | null };
    },
    userId: string,
    source: InspectionPhotoSource,
  ) {
    if (
      source === InspectionPhotoSource.STAFF &&
      inspection.status !== MoveInInspectionStatus.DRAFT
    ) {
      throw new ConflictException('Staff photos can be changed only in draft');
    }
    if (
      source === InspectionPhotoSource.TENANT &&
      (inspection.status !== MoveInInspectionStatus.READY_FOR_TENANT ||
        inspection.tenant.userId !== userId)
    ) {
      throw new NotFoundException('Move-in inspection not found');
    }
  }

  private async assertTenantOwns(userId: string, inspectionId: string) {
    const inspection = await this.prisma.moveInInspection.findFirst({
      where: {
        id: inspectionId,
        tenant: { userId },
        status: {
          in: [
            MoveInInspectionStatus.READY_FOR_TENANT,
            MoveInInspectionStatus.COMPLETED,
          ],
        },
      },
      select: { id: true },
    });
    if (!inspection)
      throw new NotFoundException('Move-in inspection not found');
  }

  private async assertAttachment(
    tx: Prisma.TransactionClient,
    inspectionId: string,
    itemId?: string,
    meterReadingId?: string,
  ) {
    if (itemId) {
      const item = await tx.moveInInspectionItem.findFirst({
        where: { id: itemId, area: { inspectionId } },
        select: { id: true },
      });
      if (!item) throw new BadRequestException('Inspection item not found');
    }
    if (meterReadingId) {
      const meter = await tx.moveInInspectionMeterReading.findFirst({
        where: { id: meterReadingId, inspectionId },
        select: { id: true },
      });
      if (!meter) throw new BadRequestException('Meter reading not found');
    }
  }
}
