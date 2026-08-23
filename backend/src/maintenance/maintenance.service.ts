import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailsService } from '../emails/emails.service';
import {
  AttachMaintenancePhotoDto,
  CreateMaintenanceRequestDto,
  MaintenanceListQueryDto,
  MaintenancePhotoUploadDto,
  UpdateMaintenanceRequestDto,
} from './dto/maintenance.dto';

const MAINTENANCE_BUCKET = 'maintenance-media';
const maintenanceInclude = {
  tenant: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  unit: { select: { id: true, unitNumber: true } },
  property: { select: { id: true, name: true, address: true } },
  vendor: { select: { id: true, name: true, companyName: true } },
} satisfies Prisma.MaintenanceRequestInclude;

type MaintenanceWithRelations = Prisma.MaintenanceRequestGetPayload<{
  include: typeof maintenanceInclude;
}>;

@Injectable()
export class MaintenanceService {
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

  private async withPhotoUrls(request: MaintenanceWithRelations) {
    if (request.photos.length === 0) return { ...request, photoUrls: [] };
    const { data, error } = await this.storageClient()
      .storage.from(MAINTENANCE_BUCKET)
      .createSignedUrls(request.photos, 300);
    if (error) return { ...request, photoUrls: [] };
    return {
      ...request,
      photoUrls: data.map((photo) => photo.signedUrl).filter(Boolean),
    };
  }

  private async tenantByUser(userId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { userId },
      include: { unit: true },
    });
    if (!tenant) throw new NotFoundException('Tenant profile not found');
    return tenant;
  }

  private async ownedRequest(userId: string, id: string) {
    const tenant = await this.tenantByUser(userId);
    const request = await this.prisma.maintenanceRequest.findFirst({
      where: { id, tenantId: tenant.id },
      include: maintenanceInclude,
    });
    if (!request) throw new NotFoundException('Maintenance request not found');
    return { tenant, request };
  }

  async listForAdmin(query: MaintenanceListQueryDto) {
    const rows = await this.prisma.maintenanceRequest.findMany({
      where: query.status ? { status: query.status } : undefined,
      include: maintenanceInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit ?? 100,
    });
    return Promise.all(rows.map((request) => this.withPhotoUrls(request)));
  }

  async getForAdmin(id: string) {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id },
      include: maintenanceInclude,
    });
    if (!request) throw new NotFoundException('Maintenance request not found');
    return this.withPhotoUrls(request);
  }

  async listForTenant(userId: string) {
    const tenant = await this.tenantByUser(userId);
    const rows = await this.prisma.maintenanceRequest.findMany({
      where: { tenantId: tenant.id },
      include: maintenanceInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return Promise.all(rows.map((request) => this.withPhotoUrls(request)));
  }

  async create(userId: string, data: CreateMaintenanceRequestDto) {
    const tenant = await this.tenantByUser(userId);
    if (!tenant.unitId || !tenant.unit) {
      throw new ConflictException(
        'No active unit assignment found. Please contact management.',
      );
    }
    const unitId = tenant.unitId;
    const propertyId = tenant.unit.propertyId;
    const requestId = await this.prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceRequest.create({
        data: {
          ...data,
          description: data.description.trim(),
          preferredAccessTimes: data.preferredAccessTimes?.trim(),
          tenantId: tenant.id,
          unitId,
          propertyId,
          status: 'submitted',
          photos: [],
        },
        include: maintenanceInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'MAINTENANCE_REQUEST_CREATED',
          resource: 'maintenance_request',
          resourceId: created.id,
          newValue: JSON.stringify({
            category: created.category,
            priority: created.priority,
          }),
        },
      });
      return created.id;
    });
    const request = await this.getForAdmin(requestId);
    const managers = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.TENANT_ADMIN, Role.SUPER_ADMIN] },
        status: UserStatus.ACTIVE,
      },
      select: { email: true },
    });
    await Promise.all(
      managers.map(({ email }) =>
        this.emails.sendMaintenanceCreated(
          email,
          {
            tenantName: `${request.tenant.firstName} ${request.tenant.lastName}`,
            priority: request.priority,
            category: request.category,
            propertyName: request.property.name,
            unitNumber: request.unit.unitNumber,
          },
          request.id,
        ),
      ),
    );
    return request;
  }

  async update(userId: string, id: string, data: UpdateMaintenanceRequestDto) {
    const current = await this.prisma.maintenanceRequest.findUnique({
      where: { id },
      include: maintenanceInclude,
    });
    if (!current) throw new NotFoundException('Maintenance request not found');
    if (data.assignedVendorId) {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: data.assignedVendorId },
        select: { id: true },
      });
      if (!vendor) throw new BadRequestException('Vendor not found');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const request = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          ...data,
          scheduledDate: data.scheduledDate
            ? new Date(data.scheduledDate)
            : undefined,
          adminNotes: data.adminNotes?.trim(),
        },
        include: maintenanceInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'MAINTENANCE_REQUEST_UPDATED',
          resource: 'maintenance_request',
          resourceId: id,
          oldValue: JSON.stringify({ status: current.status }),
          newValue: JSON.stringify({ status: request.status }),
        },
      });
      return request;
    });
    if (updated.status !== current.status) {
      await this.emails.sendMaintenanceUpdate(
        updated.tenant.email,
        updated.id,
        updated.status,
        updated.category,
        `${updated.tenant.firstName} ${updated.tenant.lastName}`,
      );
    }
    return this.withPhotoUrls(updated);
  }

  async createPhotoUploadUrl(
    userId: string,
    id: string,
    data: MaintenancePhotoUploadDto,
  ) {
    const { tenant } = await this.ownedRequest(userId, id);
    const safeName = data.fileName
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .slice(-120);
    const path = `${tenant.id}/${id}/photo/${randomUUID()}-${safeName}`;
    const { data: signed, error } = await this.storageClient()
      .storage.from(MAINTENANCE_BUCKET)
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !signed) {
      throw new BadRequestException(
        error?.message || 'Unable to prepare photo upload',
      );
    }
    return {
      bucket: MAINTENANCE_BUCKET,
      path: signed.path,
      token: signed.token,
      expiresIn: 7200,
    };
  }

  async attachPhoto(
    userId: string,
    id: string,
    data: AttachMaintenancePhotoDto,
  ) {
    const { tenant, request } = await this.ownedRequest(userId, id);
    const expectedPrefix = `${tenant.id}/${id}/photo/`;
    if (!data.path.startsWith(expectedPrefix)) {
      throw new BadRequestException('Invalid maintenance photo path');
    }
    const slash = data.path.lastIndexOf('/');
    const directory = data.path.slice(0, slash);
    const fileName = data.path.slice(slash + 1);
    const { data: objects, error } = await this.storageClient()
      .storage.from(MAINTENANCE_BUCKET)
      .list(directory, { search: fileName, limit: 2 });
    if (error || !objects?.some((object) => object.name === fileName)) {
      throw new BadRequestException('Upload the photo before attaching it');
    }
    if (request.photos.includes(data.path)) return this.withPhotoUrls(request);
    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.maintenanceRequest.update({
        where: { id },
        data: { photos: { push: data.path } },
        include: maintenanceInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'MAINTENANCE_PHOTO_ATTACHED',
          resource: 'maintenance_request',
          resourceId: id,
          newValue: JSON.stringify({ path: data.path }),
        },
      });
      return saved;
    });
    return this.withPhotoUrls(updated);
  }

  async confirmCompletion(userId: string, id: string) {
    const { request } = await this.ownedRequest(userId, id);
    if (request.status !== 'completed') {
      throw new ConflictException(
        'Only completed requests can be confirmed by the tenant',
      );
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.maintenanceRequest.update({
        where: { id },
        data: { status: 'tenant_confirmed' },
        include: maintenanceInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'MAINTENANCE_COMPLETION_CONFIRMED',
          resource: 'maintenance_request',
          resourceId: id,
        },
      });
      return saved;
    });
    const managers = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.TENANT_ADMIN, Role.SUPER_ADMIN] },
        status: UserStatus.ACTIVE,
      },
      select: { email: true },
    });
    await Promise.all(
      managers.map(({ email }) =>
        this.emails.sendMaintenanceCompletionConfirmed(
          email,
          {
            tenantName: `${updated.tenant.firstName} ${updated.tenant.lastName}`,
            category: updated.category,
            propertyName: updated.property.name,
            unitNumber: updated.unit.unitNumber,
          },
          updated.id,
        ),
      ),
    );
    return this.withPhotoUrls(updated);
  }
}
