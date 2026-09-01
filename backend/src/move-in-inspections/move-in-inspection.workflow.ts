import { createHash } from 'node:crypto';
import { InspectionCondition, Prisma } from '@prisma/client';
import type { MoveInInspectionRecord } from './move-in-inspection.query';

export const MOVE_IN_ACKNOWLEDGEMENT_VERSION = 1;
export const MOVE_IN_ACKNOWLEDGEMENT_TEXT =
  'I confirm that I reviewed this move-in condition record, added any observations I wanted included, and received the listed keys or access method. This acknowledgement records the condition at move-in and does not waive rights or responsibilities under the lease or applicable law.';

export type InspectionReadinessInput = {
  noPhysicalKeys: boolean;
  accessMethodNotes: string | null;
  areas: Array<{
    items: Array<{ condition: InspectionCondition }>;
  }>;
  keys: Array<{ handedOverAt: Date | null }>;
};

export function inspectionReadiness(input: InspectionReadinessInput) {
  const items = input.areas.flatMap((area) => area.items);
  const uninspected = items.filter(
    (item) => item.condition === InspectionCondition.NOT_INSPECTED,
  ).length;
  const keysComplete = input.noPhysicalKeys
    ? Boolean(input.accessMethodNotes?.trim())
    : input.keys.length > 0 && input.keys.every((key) => key.handedOverAt);

  return {
    itemCount: items.length,
    uninspected,
    keysComplete,
    ready: items.length > 0 && uninspected === 0 && keysComplete,
  };
}

export function normalizeTypedName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

export function inspectionSnapshotHash(snapshot: unknown) {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

export function inspectionWithReadiness(inspection: MoveInInspectionRecord) {
  return {
    ...inspection,
    readiness: inspectionReadiness(inspection),
    acknowledgementStatement: MOVE_IN_ACKNOWLEDGEMENT_TEXT,
  };
}

export function optionalInspectionText(value: string | undefined) {
  return value === undefined ? undefined : value.trim() || null;
}

export function inspectionReadinessMessage(
  input: ReturnType<typeof inspectionReadiness>,
) {
  if (input.itemCount === 0) {
    return 'Add at least one condition item before tenant review';
  }
  if (input.uninspected > 0) {
    return `Complete the remaining ${input.uninspected} checklist item${input.uninspected === 1 ? '' : 's'}`;
  }
  if (!input.keysComplete) {
    return 'Record key handover, or mark the home as keyless and explain access';
  }
  return 'The inspection is not ready for tenant review';
}

export function inspectionSnapshot(
  inspection: MoveInInspectionRecord,
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify({
      inspectionId: inspection.id,
      leaseId: inspection.leaseId,
      tenantId: inspection.tenantId,
      unitId: inspection.unitId,
      revision: inspection.revision,
      checklistVersion: inspection.checklistVersion,
      scheduledAt: inspection.scheduledAt,
      property: inspection.unit.property,
      unitNumber: inspection.unit.unitNumber,
      areas: inspection.areas,
      meterReadings: inspection.meterReadings,
      keys: inspection.keys,
      photos: inspection.photos.map((photo) => ({
        id: photo.id,
        itemId: photo.itemId,
        meterReadingId: photo.meterReadingId,
        source: photo.source,
        originalFileName: photo.originalFileName,
        contentType: photo.contentType,
        sizeBytes: photo.sizeBytes,
        caption: photo.caption,
        createdAt: photo.createdAt,
      })),
    }),
  ) as Prisma.InputJsonValue;
}
