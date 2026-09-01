import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MoveInInspectionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInspectionAreaDto,
  CreateInspectionItemDto,
  CreateInspectionKeyDto,
  CreateInspectionMeterDto,
  InspectionRevisionDto,
  UpdateInspectionAreaDto,
  UpdateInspectionItemDto,
  UpdateInspectionKeyDto,
  UpdateInspectionMeterDto,
} from './dto/move-in-inspection.dto';
import { optionalInspectionText } from './move-in-inspection.workflow';
import { MoveInInspectionsService } from './move-in-inspections.service';

@Injectable()
export class MoveInInspectionRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inspections: MoveInInspectionsService,
  ) {}

  async createArea(
    userId: string,
    inspectionId: string,
    data: CreateInspectionAreaDto,
  ) {
    await this.mutate(
      userId,
      inspectionId,
      data.expectedRevision,
      'MOVE_IN_INSPECTION_AREA_CREATED',
      async (tx) => {
        await tx.moveInInspectionArea.create({
          data: {
            inspectionId,
            name: data.name.trim(),
            sortOrder: data.sortOrder,
          },
        });
      },
    );
    return this.inspections.getForAdmin(inspectionId);
  }

  async updateArea(
    userId: string,
    inspectionId: string,
    areaId: string,
    data: UpdateInspectionAreaDto,
  ) {
    await this.mutate(
      userId,
      inspectionId,
      data.expectedRevision,
      'MOVE_IN_INSPECTION_AREA_UPDATED',
      async (tx) => {
        await this.assertArea(tx, inspectionId, areaId);
        await tx.moveInInspectionArea.update({
          where: { id: areaId },
          data: {
            name: data.name?.trim(),
            sortOrder: data.sortOrder,
          },
        });
      },
      { areaId },
    );
    return this.inspections.getForAdmin(inspectionId);
  }

  async deleteArea(
    userId: string,
    inspectionId: string,
    areaId: string,
    data: InspectionRevisionDto,
  ) {
    await this.mutate(
      userId,
      inspectionId,
      data.expectedRevision,
      'MOVE_IN_INSPECTION_AREA_REMOVED',
      async (tx) => {
        const area = await tx.moveInInspectionArea.findFirst({
          where: { id: areaId, inspectionId },
          select: {
            id: true,
            items: { select: { photos: { select: { id: true }, take: 1 } } },
          },
        });
        if (!area) throw new NotFoundException('Inspection area not found');
        if (area.items.some((item) => item.photos.length > 0)) {
          throw new ConflictException(
            'Remove attached photos before deleting this area',
          );
        }
        await tx.moveInInspectionArea.delete({ where: { id: areaId } });
      },
      { areaId },
    );
    return this.inspections.getForAdmin(inspectionId);
  }

  async createItem(
    userId: string,
    inspectionId: string,
    data: CreateInspectionItemDto,
  ) {
    await this.mutate(
      userId,
      inspectionId,
      data.expectedRevision,
      'MOVE_IN_INSPECTION_ITEM_CREATED',
      async (tx) => {
        await this.assertArea(tx, inspectionId, data.areaId);
        await tx.moveInInspectionItem.create({
          data: {
            areaId: data.areaId,
            name: data.name.trim(),
            condition: data.condition,
            staffNotes: optionalInspectionText(data.staffNotes),
            sortOrder: data.sortOrder,
          },
        });
      },
      { areaId: data.areaId },
    );
    return this.inspections.getForAdmin(inspectionId);
  }

  async updateItem(
    userId: string,
    inspectionId: string,
    itemId: string,
    data: UpdateInspectionItemDto,
  ) {
    await this.mutate(
      userId,
      inspectionId,
      data.expectedRevision,
      'MOVE_IN_INSPECTION_ITEM_UPDATED',
      async (tx) => {
        await this.assertItem(tx, inspectionId, itemId);
        await tx.moveInInspectionItem.update({
          where: { id: itemId },
          data: {
            name: data.name?.trim(),
            condition: data.condition,
            staffNotes: optionalInspectionText(data.staffNotes),
            sortOrder: data.sortOrder,
          },
        });
      },
      { itemId },
    );
    return this.inspections.getForAdmin(inspectionId);
  }

  async deleteItem(
    userId: string,
    inspectionId: string,
    itemId: string,
    data: InspectionRevisionDto,
  ) {
    await this.mutate(
      userId,
      inspectionId,
      data.expectedRevision,
      'MOVE_IN_INSPECTION_ITEM_REMOVED',
      async (tx) => {
        const item = await tx.moveInInspectionItem.findFirst({
          where: { id: itemId, area: { inspectionId } },
          select: { id: true, _count: { select: { photos: true } } },
        });
        if (!item) throw new NotFoundException('Inspection item not found');
        if (item._count.photos > 0) {
          throw new ConflictException(
            'Remove attached photos before deleting this item',
          );
        }
        await tx.moveInInspectionItem.delete({ where: { id: itemId } });
      },
      { itemId },
    );
    return this.inspections.getForAdmin(inspectionId);
  }

  async createMeter(
    userId: string,
    inspectionId: string,
    data: CreateInspectionMeterDto,
  ) {
    await this.mutate(
      userId,
      inspectionId,
      data.expectedRevision,
      'MOVE_IN_INSPECTION_METER_CREATED',
      async (tx) => {
        await tx.moveInInspectionMeterReading.create({
          data: {
            inspectionId,
            type: data.type,
            label: data.label.trim(),
            reading: data.reading,
            unit: data.unit.trim(),
            readAt: new Date(data.readAt),
            notes: optionalInspectionText(data.notes),
            sortOrder: data.sortOrder,
          },
        });
      },
    );
    return this.inspections.getForAdmin(inspectionId);
  }

  async updateMeter(
    userId: string,
    inspectionId: string,
    meterId: string,
    data: UpdateInspectionMeterDto,
  ) {
    await this.mutate(
      userId,
      inspectionId,
      data.expectedRevision,
      'MOVE_IN_INSPECTION_METER_UPDATED',
      async (tx) => {
        await this.assertMeter(tx, inspectionId, meterId);
        await tx.moveInInspectionMeterReading.update({
          where: { id: meterId },
          data: {
            type: data.type,
            label: data.label?.trim(),
            reading: data.reading,
            unit: data.unit?.trim(),
            readAt: data.readAt ? new Date(data.readAt) : undefined,
            notes: optionalInspectionText(data.notes),
            sortOrder: data.sortOrder,
          },
        });
      },
      { meterId },
    );
    return this.inspections.getForAdmin(inspectionId);
  }

  async deleteMeter(
    userId: string,
    inspectionId: string,
    meterId: string,
    data: InspectionRevisionDto,
  ) {
    await this.mutate(
      userId,
      inspectionId,
      data.expectedRevision,
      'MOVE_IN_INSPECTION_METER_REMOVED',
      async (tx) => {
        const meter = await tx.moveInInspectionMeterReading.findFirst({
          where: { id: meterId, inspectionId },
          select: { id: true, _count: { select: { photos: true } } },
        });
        if (!meter) throw new NotFoundException('Meter reading not found');
        if (meter._count.photos > 0) {
          throw new ConflictException(
            'Remove attached photos before deleting this reading',
          );
        }
        await tx.moveInInspectionMeterReading.delete({
          where: { id: meterId },
        });
      },
      { meterId },
    );
    return this.inspections.getForAdmin(inspectionId);
  }

  async createKey(
    userId: string,
    inspectionId: string,
    data: CreateInspectionKeyDto,
  ) {
    await this.mutate(
      userId,
      inspectionId,
      data.expectedRevision,
      'MOVE_IN_INSPECTION_KEY_CREATED',
      async (tx) => {
        await tx.moveInInspectionKey.create({
          data: {
            inspectionId,
            type: data.type,
            label: data.label.trim(),
            quantity: data.quantity,
            identifier: optionalInspectionText(data.identifier),
            notes: optionalInspectionText(data.notes),
            handedOverAt: data.handedOverAt
              ? new Date(data.handedOverAt)
              : null,
            sortOrder: data.sortOrder,
          },
        });
      },
    );
    return this.inspections.getForAdmin(inspectionId);
  }

  async updateKey(
    userId: string,
    inspectionId: string,
    keyId: string,
    data: UpdateInspectionKeyDto,
  ) {
    await this.mutate(
      userId,
      inspectionId,
      data.expectedRevision,
      'MOVE_IN_INSPECTION_KEY_UPDATED',
      async (tx) => {
        await this.assertKey(tx, inspectionId, keyId);
        await tx.moveInInspectionKey.update({
          where: { id: keyId },
          data: {
            type: data.type,
            label: data.label?.trim(),
            quantity: data.quantity,
            identifier: optionalInspectionText(data.identifier),
            notes: optionalInspectionText(data.notes),
            handedOverAt: data.clearHandover
              ? null
              : data.handedOverAt
                ? new Date(data.handedOverAt)
                : undefined,
            sortOrder: data.sortOrder,
          },
        });
      },
      { keyId },
    );
    return this.inspections.getForAdmin(inspectionId);
  }

  async deleteKey(
    userId: string,
    inspectionId: string,
    keyId: string,
    data: InspectionRevisionDto,
  ) {
    await this.mutate(
      userId,
      inspectionId,
      data.expectedRevision,
      'MOVE_IN_INSPECTION_KEY_REMOVED',
      async (tx) => {
        await this.assertKey(tx, inspectionId, keyId);
        await tx.moveInInspectionKey.delete({ where: { id: keyId } });
      },
      { keyId },
    );
    return this.inspections.getForAdmin(inspectionId);
  }

  private async mutate(
    userId: string,
    inspectionId: string,
    expectedRevision: number,
    action: string,
    operation: (tx: Prisma.TransactionClient) => Promise<void>,
    value?: Record<string, unknown>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "MoveInInspection" WHERE "id" = ${inspectionId} FOR UPDATE`;
      const inspection = await tx.moveInInspection.findUnique({
        where: { id: inspectionId },
        select: { revision: true, status: true },
      });
      if (!inspection)
        throw new NotFoundException('Move-in inspection not found');
      if (inspection.revision !== expectedRevision) {
        throw new ConflictException(
          'The inspection changed. Refresh and try again.',
        );
      }
      if (inspection.status !== MoveInInspectionStatus.DRAFT) {
        throw new ConflictException('Only a draft inspection can be changed');
      }
      await operation(tx);
      await tx.moveInInspection.update({
        where: { id: inspectionId },
        data: { revision: { increment: 1 } },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action,
          resource: 'move_in_inspection',
          resourceId: inspectionId,
          newValue: value ? JSON.stringify(value) : undefined,
        },
      });
    });
  }

  private async assertArea(
    tx: Prisma.TransactionClient,
    inspectionId: string,
    areaId: string,
  ) {
    const area = await tx.moveInInspectionArea.findFirst({
      where: { id: areaId, inspectionId },
      select: { id: true },
    });
    if (!area) throw new NotFoundException('Inspection area not found');
  }

  private async assertItem(
    tx: Prisma.TransactionClient,
    inspectionId: string,
    itemId: string,
  ) {
    const item = await tx.moveInInspectionItem.findFirst({
      where: { id: itemId, area: { inspectionId } },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Inspection item not found');
  }

  private async assertMeter(
    tx: Prisma.TransactionClient,
    inspectionId: string,
    meterId: string,
  ) {
    const meter = await tx.moveInInspectionMeterReading.findFirst({
      where: { id: meterId, inspectionId },
      select: { id: true },
    });
    if (!meter) throw new NotFoundException('Meter reading not found');
  }

  private async assertKey(
    tx: Prisma.TransactionClient,
    inspectionId: string,
    keyId: string,
  ) {
    const key = await tx.moveInInspectionKey.findFirst({
      where: { id: keyId, inspectionId },
      select: { id: true },
    });
    if (!key) throw new NotFoundException('Key handover record not found');
  }
}
