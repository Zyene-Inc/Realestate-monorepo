import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MoveInChargeCategory,
  MoveInChargeStatus,
  MoveOutInspectionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AcknowledgeMoveOutInspectionDto,
  CompleteMoveOutInspectionDto,
} from './dto/lease-lifecycle.dto';
import {
  LeaseLifecycleService,
  type LifecycleActor,
} from './lease-lifecycle.service';

@Injectable()
export class LeaseMoveOutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: LeaseLifecycleService,
  ) {}

  async completeInspection(
    actor: LifecycleActor,
    id: string,
    data: CompleteMoveOutInspectionDto,
  ) {
    if (!data.keysReturned)
      throw new BadRequestException(
        'Record all keys as returned before completing move-out',
      );
    if (data.items.some((item) => item.condition === 'NOT_INSPECTED')) {
      throw new BadRequestException('Complete every final inspection item');
    }
    const inspection = await this.prisma.moveOutInspection.findUnique({
      where: { id },
      include: { notice: true, items: true },
    });
    if (!inspection)
      throw new NotFoundException('Move-out inspection not found');
    const completableStatuses: MoveOutInspectionStatus[] = [
      MoveOutInspectionStatus.DRAFT,
      MoveOutInspectionStatus.SCHEDULED,
    ];
    if (!completableStatuses.includes(inspection.status)) {
      throw new ConflictException('This final inspection is already complete');
    }
    const itemIds = new Set(inspection.items.map((item) => item.id));
    const submittedItemIds = new Set(data.items.map((item) => item.id));
    if (
      submittedItemIds.size !== inspection.items.length ||
      data.items.some((item) => !itemIds.has(item.id)) ||
      inspection.items.some((item) => !submittedItemIds.has(item.id))
    ) {
      throw new BadRequestException(
        'Submit the complete current inspection checklist',
      );
    }
    const actualMoveOutAt = new Date(data.actualMoveOutAt);
    if (actualMoveOutAt > new Date())
      throw new BadRequestException(
        'Actual move-out time cannot be in the future',
      );
    const deadline = new Date(
      Date.UTC(
        actualMoveOutAt.getUTCFullYear(),
        actualMoveOutAt.getUTCMonth(),
        actualMoveOutAt.getUTCDate() + 30,
      ),
    );
    const forwardingAddress = data.forwardingAddress.trim();

    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.moveOutInspection.updateMany({
        where: {
          id,
          revision: data.expectedRevision,
          status: {
            in: [
              MoveOutInspectionStatus.DRAFT,
              MoveOutInspectionStatus.SCHEDULED,
            ],
          },
        },
        data: {
          status: MoveOutInspectionStatus.COMPLETED,
          actualMoveOutAt,
          turnoverStatus: data.turnoverStatus,
          keysReturned: true,
          staffNotes: data.staffNotes?.trim(),
          completedAt: new Date(),
          revision: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new ConflictException(
          'The inspection changed. Refresh before completing it',
        );
      await tx.$queryRaw`
        SELECT "id"
        FROM "MoveInCharge"
        WHERE "leaseId" = ${inspection.leaseId}
          AND "category" = 'SECURITY_DEPOSIT'::"MoveInChargeCategory"
          AND "status" <> 'VOID'::"MoveInChargeStatus"
        ORDER BY "createdAt" ASC
        LIMIT 1
        FOR UPDATE
      `;
      const depositCharge = await tx.moveInCharge.findFirst({
        where: {
          leaseId: inspection.leaseId,
          category: MoveInChargeCategory.SECURITY_DEPOSIT,
          status: { not: MoveInChargeStatus.VOID },
        },
        orderBy: { createdAt: 'asc' },
      });
      const held = new Prisma.Decimal(depositCharge?.paidAmount ?? 0)
        .minus(depositCharge?.refundedAmount ?? 0)
        .toDecimalPlaces(2);
      for (const item of data.items) {
        await tx.moveOutInspectionItem.update({
          where: { id: item.id },
          data: {
            condition: item.condition,
            notes: item.notes?.trim() || null,
            estimatedCost: new Prisma.Decimal(item.estimatedCost),
          },
        });
      }
      await tx.securityDepositDisposition.create({
        data: {
          leaseId: inspection.leaseId,
          inspectionId: id,
          tenantId: inspection.tenantId,
          unitId: inspection.unitId,
          amountHeld: held,
          refundAmount: held,
          dueDate: deadline,
          forwardingAddress,
          createdByUserId: actor.id,
        },
      });
      await tx.noticeToVacate.update({
        where: { id: inspection.noticeId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          forwardingAddress,
        },
      });
      await tx.lease.update({
        where: { id: inspection.leaseId },
        data: { status: 'terminated' },
      });
      await tx.tenant.updateMany({
        where: { id: inspection.tenantId, unitId: inspection.unitId },
        data: { unitId: null, status: 'inactive' },
      });
      await tx.unit.update({
        where: { id: inspection.unitId },
        data: {
          status:
            data.turnoverStatus === 'READY_TO_RENT'
              ? 'vacant'
              : 'under maintenance',
          availableDate:
            data.turnoverStatus === 'READY_TO_RENT' ? actualMoveOutAt : null,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: 'MOVE_OUT_COMPLETED',
          resource: 'move_out_inspection',
          resourceId: id,
          newValue: JSON.stringify({
            leaseId: inspection.leaseId,
            amountHeld: held.toFixed(2),
            dueDate: deadline.toISOString(),
          }),
        },
      });
    });
    return this.lifecycle.getLease(inspection.leaseId);
  }

  async acknowledgeInspection(
    userId: string,
    id: string,
    data: AcknowledgeMoveOutInspectionDto,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Tenant profile not found');
    const inspection = await this.prisma.moveOutInspection.findFirst({
      where: { id, tenantId: tenant.id },
    });
    if (!inspection)
      throw new NotFoundException('Move-out inspection not found');
    if (inspection.status !== MoveOutInspectionStatus.COMPLETED) {
      throw new ConflictException(
        'The final inspection is not ready for acknowledgement',
      );
    }
    await this.prisma.$transaction([
      this.prisma.moveOutInspection.update({
        where: { id },
        data: {
          status: MoveOutInspectionStatus.TENANT_ACKNOWLEDGED,
          tenantNotes: data.tenantNotes?.trim(),
          tenantAcknowledgedAt: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'MOVE_OUT_INSPECTION_ACKNOWLEDGED',
          resource: 'move_out_inspection',
          resourceId: id,
        },
      }),
    ]);
    return this.lifecycle.getMine(userId);
  }
}
