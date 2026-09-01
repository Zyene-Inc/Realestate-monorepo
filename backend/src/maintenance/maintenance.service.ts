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
import { MaintenanceExpenseLedgerService } from './maintenance-expense-ledger.service';

const MAINTENANCE_BUCKET = 'maintenance-media';
const maintenanceInclude = {
  tenant: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  unit: { select: { id: true, unitNumber: true } },
  property: { select: { id: true, name: true, address: true, ownerId: true } },
  vendor: {
    select: {
      id: true,
      name: true,
      companyName: true,
      email: true,
      phone: true,
      specialty: true,
    },
  },
  expenseLedgerEntries: { select: { amount: true } },
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
    private readonly expenseLedger: MaintenanceExpenseLedgerService,
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
    const { expenseLedgerEntries, ...record } = request;
    const ownerExpenseTotal = expenseLedgerEntries
      .reduce((total, entry) => total.plus(entry.amount), new Prisma.Decimal(0))
      .toFixed(2);
    const base = {
      ...record,
      cost: request.cost?.toFixed(2) ?? null,
      ownerExpenseTotal,
      ownerExpenseEntryCount: expenseLedgerEntries.length,
    };
    if (request.photos.length === 0) return { ...base, photoUrls: [] };
    const { data, error } = await this.storageClient()
      .storage.from(MAINTENANCE_BUCKET)
      .createSignedUrls(request.photos, 300);
    if (error) return { ...base, photoUrls: [] };
    return {
      ...base,
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
    if (data.status === 'tenant_confirmed') {
      throw new BadRequestException(
        'Only the tenant can confirm maintenance completion',
      );
    }
    if (current.status === 'tenant_confirmed' && data.status) {
      throw new ConflictException(
        'A tenant-confirmed request cannot return to an earlier status',
      );
    }
    const nextStatus = data.status ?? current.status;
    const nextVendorId =
      data.assignedVendorId !== undefined
        ? data.assignedVendorId
        : current.assignedVendorId;
    const nextScheduledDate =
      data.scheduledDate !== undefined
        ? data.scheduledDate
          ? new Date(data.scheduledDate)
          : null
        : current.scheduledDate;
    const nextCost =
      data.cost !== undefined
        ? data.cost === null
          ? null
          : new Prisma.Decimal(data.cost.toFixed(2))
        : current.cost;
    if (
      ['assigned', 'scheduled', 'in_progress'].includes(nextStatus) &&
      !nextVendorId
    ) {
      throw new BadRequestException(
        'Assign a vendor before using this maintenance status',
      );
    }
    if (nextStatus === 'scheduled' && !nextScheduledDate) {
      throw new BadRequestException(
        'Choose a service date before scheduling this request',
      );
    }
    if (
      ['completed', 'tenant_confirmed'].includes(nextStatus) &&
      nextCost === null
    ) {
      throw new BadRequestException(
        'Enter the final maintenance cost before completing this request. Use 0 for no-charge work.',
      );
    }
    const completedAt = ['completed', 'tenant_confirmed'].includes(nextStatus)
      ? (current.completedAt ?? new Date())
      : null;
    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.maintenanceRequest.updateMany({
        where: { id, updatedAt: current.updatedAt },
        data: {
          status: data.status,
          assignedVendorId: data.assignedVendorId,
          scheduledDate: nextScheduledDate,
          cost: nextCost,
          adminNotes:
            data.adminNotes === null
              ? null
              : data.adminNotes?.trim() || undefined,
          completedAt,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          'This maintenance request changed. Refresh and review the latest values before saving.',
        );
      }
      const request = await tx.maintenanceRequest.findUnique({
        where: { id },
        include: maintenanceInclude,
      });
      if (!request)
        throw new NotFoundException('Maintenance request not found');
      await this.expenseLedger.reconcile(tx, request, userId);
      await tx.auditLog.create({
        data: {
          userId,
          action: 'MAINTENANCE_REQUEST_UPDATED',
          resource: 'maintenance_request',
          resourceId: id,
          oldValue: JSON.stringify({
            status: current.status,
            assignedVendorId: current.assignedVendorId,
            scheduledDate: current.scheduledDate,
            cost: current.cost?.toFixed(2) ?? null,
            adminNotes: current.adminNotes,
          }),
          newValue: JSON.stringify({
            status: request.status,
            assignedVendorId: request.assignedVendorId,
            scheduledDate: request.scheduledDate,
            cost: request.cost?.toFixed(2) ?? null,
            adminNotes: request.adminNotes,
          }),
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
    const vendorAssignmentChanged =
      updated.assignedVendorId !== current.assignedVendorId;
    const scheduleChanged =
      updated.scheduledDate?.getTime() !== current.scheduledDate?.getTime();
    if (updated.vendor?.email && (vendorAssignmentChanged || scheduleChanged)) {
      const scheduledAt = updated.scheduledDate
        ? new Intl.DateTimeFormat('en-US', {
            dateStyle: 'full',
            timeStyle: 'short',
            timeZone: 'America/Chicago',
          }).format(updated.scheduledDate)
        : undefined;
      await this.emails.sendMaintenanceVendorAssignment(
        updated.vendor.email,
        {
          name: updated.vendor.name,
          category: updated.category,
          description: updated.description,
          propertyName: updated.property.name,
          propertyAddress: updated.property.address,
          unitNumber: updated.unit.unitNumber,
          scheduledAt,
        },
        `${updated.id}-${updated.assignedVendorId}-${updated.scheduledDate?.toISOString() ?? 'unscheduled'}`,
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
