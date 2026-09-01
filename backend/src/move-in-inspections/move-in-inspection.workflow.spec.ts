import { InspectionCondition, InspectionKeyType } from '@prisma/client';
import {
  defaultInspectionAreas,
  defaultInspectionKeys,
} from './move-in-inspection.template';
import {
  inspectionReadiness,
  inspectionSnapshotHash,
  normalizeTypedName,
} from './move-in-inspection.workflow';

describe('move-in inspection workflow', () => {
  it('creates a useful room-by-room template and a unit-key record', () => {
    const areas = defaultInspectionAreas();
    const keys = defaultInspectionKeys();

    expect(areas).toHaveLength(6);
    expect(
      areas.flatMap((area) =>
        'create' in area.items ? area.items.create : [],
      ),
    ).toHaveLength(24);
    expect(keys).toEqual([
      expect.objectContaining({
        type: InspectionKeyType.UNIT,
        quantity: 1,
      }),
    ]);
  });

  it('requires every condition and a completed physical-key handover', () => {
    expect(
      inspectionReadiness({
        noPhysicalKeys: false,
        accessMethodNotes: null,
        areas: [
          {
            items: [
              { condition: InspectionCondition.GOOD },
              { condition: InspectionCondition.NOT_INSPECTED },
            ],
          },
        ],
        keys: [{ handedOverAt: null }],
      }),
    ).toEqual({
      itemCount: 2,
      uninspected: 1,
      keysComplete: false,
      ready: false,
    });
  });

  it('accepts a documented keyless access method', () => {
    expect(
      inspectionReadiness({
        noPhysicalKeys: true,
        accessMethodNotes: 'Tenant received a unique keypad credential.',
        areas: [{ items: [{ condition: InspectionCondition.GOOD }] }],
        keys: [],
      }).ready,
    ).toBe(true);
  });

  it('normalizes acknowledgement names and hashes the exact snapshot', () => {
    expect(normalizeTypedName('  Taylor   Resident ')).toBe('taylor resident');
    expect(inspectionSnapshotHash({ revision: 3 })).toMatch(/^[0-9a-f]{64}$/);
    expect(inspectionSnapshotHash({ revision: 3 })).not.toBe(
      inspectionSnapshotHash({ revision: 4 }),
    );
  });
});
