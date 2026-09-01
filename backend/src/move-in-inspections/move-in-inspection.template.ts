import { InspectionCondition, InspectionKeyType, Prisma } from '@prisma/client';

const MOVE_IN_CHECKLIST_VERSION = 1;

const DEFAULT_AREAS = [
  {
    name: 'Entry and safety',
    items: [
      'Entry door and lock',
      'Walls and ceiling',
      'Flooring',
      'Smoke and carbon monoxide alarms',
    ],
  },
  {
    name: 'Living area',
    items: [
      'Walls and ceiling',
      'Flooring',
      'Windows and screens',
      'Lights and outlets',
    ],
  },
  {
    name: 'Kitchen',
    items: [
      'Cabinets and counters',
      'Sink and faucet',
      'Appliances',
      'Flooring',
    ],
  },
  {
    name: 'Bedrooms',
    items: [
      'Walls and ceiling',
      'Flooring',
      'Windows and screens',
      'Closets and doors',
    ],
  },
  {
    name: 'Bathrooms',
    items: [
      'Sink and vanity',
      'Toilet',
      'Tub or shower',
      'Ventilation and flooring',
    ],
  },
  {
    name: 'Systems and exterior',
    items: [
      'Heating, cooling, and thermostat',
      'Water heater and visible plumbing',
      'Exterior, porch, or balcony',
      'Other supplied fixtures',
    ],
  },
] as const;

export function defaultInspectionAreas(): Prisma.MoveInInspectionAreaCreateWithoutInspectionInput[] {
  return DEFAULT_AREAS.map((area, areaIndex) => ({
    name: area.name,
    sortOrder: areaIndex,
    items: {
      create: area.items.map((name, itemIndex) => ({
        name,
        condition: InspectionCondition.NOT_INSPECTED,
        sortOrder: itemIndex,
      })),
    },
  }));
}

export function defaultInspectionKeys(): Prisma.MoveInInspectionKeyCreateWithoutInspectionInput[] {
  return [
    {
      type: InspectionKeyType.UNIT,
      label: 'Unit key',
      quantity: 1,
      sortOrder: 0,
    },
  ];
}

export function defaultMoveInInspectionData(input: {
  leaseId: string;
  tenantId: string;
  unitId: string;
  startDate: Date;
  preparedByUserId: string;
}): Prisma.MoveInInspectionCreateInput {
  return {
    lease: { connect: { id: input.leaseId } },
    tenant: { connect: { id: input.tenantId } },
    unit: { connect: { id: input.unitId } },
    preparedBy: { connect: { id: input.preparedByUserId } },
    scheduledAt: input.startDate,
    checklistVersion: MOVE_IN_CHECKLIST_VERSION,
    areas: { create: defaultInspectionAreas() },
    keys: { create: defaultInspectionKeys() },
  };
}
