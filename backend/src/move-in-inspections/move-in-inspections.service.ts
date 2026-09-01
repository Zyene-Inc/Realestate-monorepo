import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MoveInInspectionStatus,
  Prisma,
  Role,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AcknowledgeMoveInInspectionDto,
  CreateMoveInInspectionDto,
  InspectionReasonDto,
  InspectionRevisionDto,
  ListMoveInInspectionsDto,
  TenantInspectionObservationDto,
  UpdateMoveInInspectionDto,
} from './dto/move-in-inspection.dto';
import { defaultMoveInInspectionData } from './move-in-inspection.template';
import {
  inspectionReadiness,
  inspectionReadinessMessage,
  inspectionSnapshot,
  inspectionSnapshotHash,
  inspectionWithReadiness,
  MOVE_IN_ACKNOWLEDGEMENT_TEXT,
  MOVE_IN_ACKNOWLEDGEMENT_VERSION,
  normalizeTypedName,
  optionalInspectionText,
} from './move-in-inspection.workflow';
import { moveInInspectionInclude } from './move-in-inspection.query';
import { MoveInInspectionEmailsService } from './move-in-inspection-emails.service';

const CURRENT_LEASE_STATUSES = ['active', 'expiring', 'renewed'];

@Injectable()
export class MoveInInspectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: MoveInInspectionEmailsService,
  ) {}

  async list(query: ListMoveInInspectionsDto) {
    const rows = await this.prisma.moveInInspection.findMany({
      where: {
        status: query.status,
        leaseId: query.leaseId,
      },
      select: {
        id: true,
        leaseId: true,
        status: true,
        scheduledAt: true,
        revision: true,
        readyForTenantAt: true,
        completedAt: true,
        updatedAt: true,
        tenant: { select: { firstName: true, lastName: true } },
        lease: { select: { startDate: true, status: true } },
        unit: {
          select: {
            unitNumber: true,
            property: { select: { name: true, address: true } },
          },
        },
        _count: { select: { photos: true, meterReadings: true, keys: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: query.take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > query.take;
    const items = hasMore ? rows.slice(0, query.take) : rows;
    return {
      items,
      nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
    };
  }

  async getForAdmin(id: string) {
    const inspection = await this.prisma.moveInInspection.findUnique({
      where: { id },
      include: moveInInspectionInclude,
    });
    if (!inspection)
      throw new NotFoundException('Move-in inspection not found');
    return inspectionWithReadiness(inspection);
  }

  async getForTenant(userId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Tenant profile not found');
    const inspection = await this.prisma.moveInInspection.findFirst({
      where: {
        tenantId: tenant.id,
        status: {
          in: [
            MoveInInspectionStatus.READY_FOR_TENANT,
            MoveInInspectionStatus.COMPLETED,
          ],
        },
      },
      include: moveInInspectionInclude,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    return inspection ? inspectionWithReadiness(inspection) : null;
  }

  async create(userId: string, data: CreateMoveInInspectionDto) {
    const lease = await this.prisma.lease.findFirst({
      where: {
        id: data.leaseId,
        status: { in: CURRENT_LEASE_STATUSES },
        unit: { property: { listingType: 'RENT' } },
      },
      select: {
        id: true,
        tenantId: true,
        unitId: true,
        startDate: true,
      },
    });
    if (!lease) {
      throw new BadRequestException(
        'A current signed rental lease is required before preparing an inspection',
      );
    }
    const existing = await this.prisma.moveInInspection.findUnique({
      where: { leaseId: lease.id },
      select: { id: true },
    });
    if (existing) return this.getForAdmin(existing.id);

    const inspection = await this.prisma.$transaction(async (tx) => {
      const created = await tx.moveInInspection.create({
        data: {
          ...defaultMoveInInspectionData({
            leaseId: lease.id,
            tenantId: lease.tenantId,
            unitId: lease.unitId,
            startDate: lease.startDate,
            preparedByUserId: userId,
          }),
          scheduledAt: data.scheduledAt
            ? new Date(data.scheduledAt)
            : lease.startDate,
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'MOVE_IN_INSPECTION_CREATED',
          resource: 'move_in_inspection',
          resourceId: created.id,
          newValue: JSON.stringify({ leaseId: lease.id }),
        },
      });
      return created;
    });
    return this.getForAdmin(inspection.id);
  }

  async update(userId: string, id: string, data: UpdateMoveInInspectionDto) {
    await this.prisma.$transaction(async (tx) => {
      const current = await this.locked(tx, id, data.expectedRevision);
      this.assertDraft(current.status);
      await tx.moveInInspection.update({
        where: { id },
        data: {
          scheduledAt: data.scheduledAt
            ? new Date(data.scheduledAt)
            : undefined,
          staffNotes: optionalInspectionText(data.staffNotes),
          noPhysicalKeys: data.noPhysicalKeys,
          accessMethodNotes: optionalInspectionText(data.accessMethodNotes),
          revision: { increment: 1 },
        },
      });
      await this.audit(tx, userId, 'MOVE_IN_INSPECTION_UPDATED', id);
    });
    return this.getForAdmin(id);
  }

  async sendToTenant(userId: string, id: string, data: InspectionRevisionDto) {
    const inspection = await this.prisma.$transaction(async (tx) => {
      const current = await this.locked(tx, id, data.expectedRevision);
      this.assertDraft(current.status);
      const readiness = inspectionReadiness(current);
      if (!readiness.ready) {
        throw new ConflictException(inspectionReadinessMessage(readiness));
      }
      const updated = await tx.moveInInspection.update({
        where: { id },
        data: {
          status: MoveInInspectionStatus.READY_FOR_TENANT,
          readyForTenantAt: new Date(),
          revision: { increment: 1 },
        },
        include: moveInInspectionInclude,
      });
      if (updated.tenant.userId) {
        await tx.notification.create({
          data: {
            userId: updated.tenant.userId,
            title: 'Move-in inspection ready',
            message: `Review the condition record and key handover for ${updated.unit.property.name}, unit ${updated.unit.unitNumber}.`,
          },
        });
      }
      await this.audit(tx, userId, 'MOVE_IN_INSPECTION_SENT', id, {
        revision: updated.revision,
      });
      return updated;
    });
    await this.emails.sendReady(
      inspection.tenant.email,
      {
        name: `${inspection.tenant.firstName} ${inspection.tenant.lastName}`,
        propertyName: inspection.unit.property.name,
        unitNumber: inspection.unit.unitNumber,
      },
      `${inspection.id}-${inspection.revision}`,
    );
    return inspectionWithReadiness(inspection);
  }

  async reopen(userId: string, id: string, data: InspectionReasonDto) {
    await this.prisma.$transaction(async (tx) => {
      const current = await this.locked(tx, id, data.expectedRevision);
      if (current.status !== MoveInInspectionStatus.READY_FOR_TENANT) {
        throw new ConflictException(
          'Only a pending tenant review can be reopened',
        );
      }
      if (current.acknowledgement) {
        throw new ConflictException(
          'A completed acknowledgement cannot be reopened',
        );
      }
      await tx.moveInInspection.update({
        where: { id },
        data: {
          status: MoveInInspectionStatus.DRAFT,
          readyForTenantAt: null,
          revision: { increment: 1 },
        },
      });
      await this.audit(tx, userId, 'MOVE_IN_INSPECTION_REOPENED', id, {
        reason: data.reason.trim(),
      });
    });
    return this.getForAdmin(id);
  }

  async cancel(userId: string, id: string, data: InspectionReasonDto) {
    await this.prisma.$transaction(async (tx) => {
      const current = await this.locked(tx, id, data.expectedRevision);
      if (
        current.status === MoveInInspectionStatus.COMPLETED ||
        current.status === MoveInInspectionStatus.CANCELED
      ) {
        throw new ConflictException(
          'This inspection can no longer be canceled',
        );
      }
      await tx.moveInInspection.update({
        where: { id },
        data: {
          status: MoveInInspectionStatus.CANCELED,
          canceledAt: new Date(),
          cancellationReason: data.reason.trim(),
          revision: { increment: 1 },
        },
      });
      await this.audit(tx, userId, 'MOVE_IN_INSPECTION_CANCELED', id, {
        reason: data.reason.trim(),
      });
    });
    return this.getForAdmin(id);
  }

  async saveTenantObservation(
    userId: string,
    id: string,
    itemId: string,
    data: TenantInspectionObservationDto,
  ) {
    if (data.condition === undefined && data.notes === undefined) {
      throw new BadRequestException('Add a condition or note before saving');
    }
    await this.prisma.$transaction(async (tx) => {
      const current = await this.lockedForTenant(
        tx,
        userId,
        id,
        data.expectedRevision,
      );
      this.assertTenantEditable(current.status);
      const item = await tx.moveInInspectionItem.findFirst({
        where: { id: itemId, area: { inspectionId: id } },
        select: { id: true },
      });
      if (!item) throw new NotFoundException('Inspection item not found');
      await tx.moveInInspectionItem.update({
        where: { id: itemId },
        data: {
          tenantCondition: data.condition,
          tenantNotes: optionalInspectionText(data.notes),
          tenantObservedAt: new Date(),
        },
      });
      await tx.moveInInspection.update({
        where: { id },
        data: { revision: { increment: 1 } },
      });
      await this.audit(
        tx,
        userId,
        'MOVE_IN_INSPECTION_TENANT_OBSERVATION',
        id,
        {
          itemId,
        },
      );
    });
    return this.getForTenant(userId);
  }

  async acknowledge(
    userId: string,
    id: string,
    data: AcknowledgeMoveInInspectionDto,
  ) {
    if (!data.accepted) {
      throw new BadRequestException(
        'Confirm the acknowledgement before submitting',
      );
    }
    const completed = await this.prisma.$transaction(async (tx) => {
      const current = await this.lockedForTenant(
        tx,
        userId,
        id,
        data.expectedRevision,
      );
      this.assertTenantEditable(current.status);
      const expectedName = `${current.tenant.firstName} ${current.tenant.lastName}`;
      if (
        normalizeTypedName(data.typedName) !== normalizeTypedName(expectedName)
      ) {
        throw new BadRequestException(`Type ${expectedName} to acknowledge`);
      }
      if (current.acknowledgement) {
        throw new ConflictException('This inspection is already acknowledged');
      }
      const snapshot = inspectionSnapshot(current);
      const recordSha256 = inspectionSnapshotHash(snapshot);
      const now = new Date();
      await tx.moveInInspectionAcknowledgement.create({
        data: {
          inspectionId: id,
          tenantId: current.tenantId,
          acknowledgedByUserId: userId,
          typedName: data.typedName.trim().replace(/\s+/g, ' '),
          statementVersion: MOVE_IN_ACKNOWLEDGEMENT_VERSION,
          statementText: MOVE_IN_ACKNOWLEDGEMENT_TEXT,
          inspectionRevision: current.revision,
          tenantNotes: optionalInspectionText(data.tenantNotes),
          recordSnapshot: snapshot,
          recordSha256,
          acknowledgedAt: now,
        },
      });
      const updated = await tx.moveInInspection.update({
        where: { id },
        data: {
          status: MoveInInspectionStatus.COMPLETED,
          completedAt: now,
          revision: { increment: 1 },
        },
        include: moveInInspectionInclude,
      });
      const managers = await tx.user.findMany({
        where: {
          role: { in: [Role.SUPER_ADMIN, Role.TENANT_ADMIN] },
          status: UserStatus.ACTIVE,
        },
        select: { id: true, email: true },
      });
      if (managers.length) {
        await tx.notification.createMany({
          data: managers.map((manager) => ({
            userId: manager.id,
            title: 'Move-in inspection acknowledged',
            message: `${expectedName} completed the condition and key-handover acknowledgement for ${current.unit.property.name}, unit ${current.unit.unitNumber}.`,
          })),
        });
      }
      await this.audit(tx, userId, 'MOVE_IN_INSPECTION_ACKNOWLEDGED', id, {
        recordSha256,
        inspectionRevision: current.revision,
      });
      return { updated, managers };
    });
    await Promise.all(
      completed.managers.map((manager) =>
        this.emails.sendAcknowledged(
          manager.email,
          {
            tenantName: `${completed.updated.tenant.firstName} ${completed.updated.tenant.lastName}`,
            propertyName: completed.updated.unit.property.name,
            unitNumber: completed.updated.unit.unitNumber,
          },
          `${completed.updated.id}-${completed.updated.revision}-${manager.id}`,
        ),
      ),
    );
    return inspectionWithReadiness(completed.updated);
  }

  private async locked(
    tx: Prisma.TransactionClient,
    id: string,
    expectedRevision: number,
  ) {
    await tx.$queryRaw`SELECT "id" FROM "MoveInInspection" WHERE "id" = ${id} FOR UPDATE`;
    const inspection = await tx.moveInInspection.findUnique({
      where: { id },
      include: moveInInspectionInclude,
    });
    if (!inspection)
      throw new NotFoundException('Move-in inspection not found');
    if (inspection.revision !== expectedRevision) {
      throw new ConflictException(
        'The inspection changed. Refresh and try again.',
      );
    }
    return inspection;
  }

  private async lockedForTenant(
    tx: Prisma.TransactionClient,
    userId: string,
    id: string,
    expectedRevision: number,
  ) {
    const inspection = await this.locked(tx, id, expectedRevision);
    if (inspection.tenant.userId !== userId) {
      throw new NotFoundException('Move-in inspection not found');
    }
    return inspection;
  }

  private assertDraft(status: MoveInInspectionStatus) {
    if (status !== MoveInInspectionStatus.DRAFT) {
      throw new ConflictException(
        'Only a draft inspection can be changed by staff',
      );
    }
  }

  private assertTenantEditable(status: MoveInInspectionStatus) {
    if (status !== MoveInInspectionStatus.READY_FOR_TENANT) {
      throw new ConflictException(
        'This inspection is not awaiting tenant review',
      );
    }
  }

  private audit(
    tx: Prisma.TransactionClient,
    userId: string,
    action: string,
    inspectionId: string,
    value?: Record<string, unknown>,
  ) {
    return tx.auditLog.create({
      data: {
        userId,
        action,
        resource: 'move_in_inspection',
        resourceId: inspectionId,
        newValue: value ? JSON.stringify(value) : undefined,
      },
    });
  }
}
