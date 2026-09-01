import { BadRequestException, ConflictException } from '@nestjs/common';
import { InspectionCondition, MoveInInspectionStatus } from '@prisma/client';
import { MoveInInspectionsService } from './move-in-inspections.service';

function inspectionRecord(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: 'inspection-1',
    leaseId: 'lease-1',
    tenantId: 'tenant-1',
    unitId: 'unit-1',
    status: MoveInInspectionStatus.DRAFT,
    scheduledAt: new Date('2026-09-01T15:00:00.000Z'),
    staffNotes: null,
    noPhysicalKeys: false,
    accessMethodNotes: null,
    revision: 1,
    checklistVersion: 1,
    readyForTenantAt: null,
    completedAt: null,
    canceledAt: null,
    cancellationReason: null,
    createdAt: new Date('2026-08-24T00:00:00.000Z'),
    updatedAt: new Date('2026-08-24T00:00:00.000Z'),
    preparedByUserId: 'admin-1',
    tenant: {
      id: 'tenant-1',
      firstName: 'Taylor',
      lastName: 'Resident',
      email: 'taylor@example.com',
      userId: 'tenant-user-1',
    },
    lease: {
      id: 'lease-1',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2027-08-31T00:00:00.000Z'),
      status: 'active',
    },
    unit: {
      id: 'unit-1',
      unitNumber: 'A1',
      property: {
        id: 'property-1',
        name: 'Oakwood Apartments',
        address: '123 Main St',
        city: 'Kansas City',
        state: 'MO',
      },
    },
    preparedBy: { id: 'admin-1', email: 'admin@example.com' },
    areas: [
      {
        id: 'area-1',
        inspectionId: 'inspection-1',
        name: 'Living room',
        sortOrder: 0,
        createdAt: new Date('2026-08-24T00:00:00.000Z'),
        updatedAt: new Date('2026-08-24T00:00:00.000Z'),
        items: [
          {
            id: 'item-1',
            areaId: 'area-1',
            name: 'Walls and ceiling',
            condition: InspectionCondition.GOOD,
            staffNotes: null,
            tenantCondition: null,
            tenantNotes: null,
            tenantObservedAt: null,
            sortOrder: 0,
            createdAt: new Date('2026-08-24T00:00:00.000Z'),
            updatedAt: new Date('2026-08-24T00:00:00.000Z'),
          },
        ],
      },
    ],
    meterReadings: [],
    keys: [
      {
        id: 'key-1',
        inspectionId: 'inspection-1',
        type: 'UNIT',
        label: 'Unit key',
        quantity: 1,
        identifier: null,
        notes: null,
        handedOverAt: new Date('2026-09-01T15:00:00.000Z'),
        sortOrder: 0,
        createdAt: new Date('2026-08-24T00:00:00.000Z'),
        updatedAt: new Date('2026-08-24T00:00:00.000Z'),
      },
    ],
    photos: [],
    acknowledgement: null,
    ...overrides,
  };
}

function setup(current: Record<string, unknown>) {
  let lastAuditInput: unknown;
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    moveInInspection: {
      findUnique: jest.fn().mockResolvedValue(current),
      update: jest
        .fn<(input: unknown) => Promise<Record<string, unknown>>>()
        .mockResolvedValue({}),
    },
    moveInInspectionAcknowledgement: { create: jest.fn() },
    notification: { create: jest.fn(), createMany: jest.fn() },
    auditLog: {
      create: jest
        .fn<(input: unknown) => Promise<Record<string, unknown>>>()
        .mockImplementation((input) => {
          lastAuditInput = input;
          return Promise.resolve({});
        }),
    },
    user: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const prisma = {
    $transaction: jest.fn(
      (operation: (transaction: typeof tx) => Promise<unknown>) =>
        operation(tx),
    ),
  };
  const emails = {
    sendReady: jest.fn().mockResolvedValue(null),
    sendAcknowledged: jest.fn().mockResolvedValue(null),
  };
  return {
    service: new MoveInInspectionsService(prisma as never, emails as never),
    tx,
    emails,
    getLastAuditInput: () => lastAuditInput,
  };
}

describe('MoveInInspectionsService', () => {
  it('sends a complete draft, creates one audit event, and notifies the tenant', async () => {
    const current = inspectionRecord();
    const { service, tx, emails, getLastAuditInput } = setup(current);
    tx.moveInInspection.update.mockResolvedValue(
      inspectionRecord({
        status: MoveInInspectionStatus.READY_FOR_TENANT,
        revision: 2,
        readyForTenantAt: new Date(),
      }),
    );

    const result = await service.sendToTenant('admin-1', 'inspection-1', {
      expectedRevision: 1,
    });

    expect(result.status).toBe(MoveInInspectionStatus.READY_FOR_TENANT);
    expect(tx.moveInInspection.update).toHaveBeenCalledTimes(1);
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(getLastAuditInput()).toMatchObject({
      data: { action: 'MOVE_IN_INSPECTION_SENT' },
    });
    expect(emails.sendReady).toHaveBeenCalledTimes(1);
  });

  it('does not mutate or audit an incomplete draft', async () => {
    const current = inspectionRecord({
      areas: [
        {
          items: [{ condition: InspectionCondition.NOT_INSPECTED }],
        },
      ],
    });
    const { service, tx, emails } = setup(current);

    await expect(
      service.sendToTenant('admin-1', 'inspection-1', {
        expectedRevision: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.moveInInspection.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(emails.sendReady).not.toHaveBeenCalled();
  });

  it('requires the resident account holder name before acknowledgement', async () => {
    const current = inspectionRecord({
      status: MoveInInspectionStatus.READY_FOR_TENANT,
    });
    const { service, tx } = setup(current);

    await expect(
      service.acknowledge('tenant-user-1', 'inspection-1', {
        expectedRevision: 1,
        accepted: true,
        typedName: 'Someone Else',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.moveInInspectionAcknowledgement.create).not.toHaveBeenCalled();
    expect(tx.moveInInspection.update).not.toHaveBeenCalled();
  });
});
