import { Prisma } from '@prisma/client';

export const moveInInspectionInclude = {
  tenant: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      userId: true,
    },
  },
  lease: {
    select: { id: true, startDate: true, endDate: true, status: true },
  },
  unit: {
    select: {
      id: true,
      unitNumber: true,
      property: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          state: true,
        },
      },
    },
  },
  preparedBy: { select: { id: true, email: true } },
  areas: {
    orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
    include: {
      items: {
        orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
      },
    },
  },
  meterReadings: {
    orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
  },
  keys: { orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }] },
  photos: {
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
    select: {
      id: true,
      itemId: true,
      meterReadingId: true,
      source: true,
      originalFileName: true,
      contentType: true,
      sizeBytes: true,
      caption: true,
      uploadedByUserId: true,
      createdAt: true,
    },
  },
  acknowledgement: {
    select: {
      id: true,
      typedName: true,
      statementText: true,
      inspectionRevision: true,
      tenantNotes: true,
      recordSha256: true,
      acknowledgedAt: true,
    },
  },
} satisfies Prisma.MoveInInspectionInclude;

export type MoveInInspectionRecord = Prisma.MoveInInspectionGetPayload<{
  include: typeof moveInInspectionInclude;
}>;
