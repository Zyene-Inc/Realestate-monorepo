import {
  MoveInChargeCategory,
  MoveInChargePayoutTreatment,
  MoveInChargeStatus,
  Prisma,
} from '@prisma/client';
import {
  moveInChargeStatus,
  payoutSplit,
  standardMoveInChargeData,
} from './move-in-charge.policy';

describe('move-in charge policy', () => {
  it('posts first-month rent and security deposit as separate categories', () => {
    const rows = standardMoveInChargeData({
      tenantId: 'tenant-1',
      leaseId: 'lease-1',
      unitId: 'unit-1',
      startDate: new Date('2026-09-15T00:00:00.000Z'),
      monthlyRent: 1800,
      securityDeposit: 1200,
      propertyOwnerId: 'owner-1',
      commissionRate: new Prisma.Decimal('10'),
      postedByUserId: 'admin-1',
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: MoveInChargeCategory.FIRST_MONTH_RENT,
          amount: new Prisma.Decimal('1800'),
          payoutTreatment: MoveInChargePayoutTreatment.OWNER_NET_OF_COMMISSION,
          billingPeriod: new Date('2026-09-01T00:00:00.000Z'),
        }),
        expect.objectContaining({
          category: MoveInChargeCategory.SECURITY_DEPOSIT,
          amount: new Prisma.Decimal('1200'),
          payoutTreatment: MoveInChargePayoutTreatment.OWNER_FULL,
        }),
      ]),
    );
  });

  it('splits each category by its payout policy', () => {
    const split = payoutSplit([
      {
        amount: new Prisma.Decimal('1000'),
        moveInCharge: {
          payoutTreatment: MoveInChargePayoutTreatment.OWNER_NET_OF_COMMISSION,
          commissionRate: new Prisma.Decimal('10'),
        },
      },
      {
        amount: new Prisma.Decimal('500'),
        moveInCharge: {
          payoutTreatment: MoveInChargePayoutTreatment.OWNER_FULL,
          commissionRate: null,
        },
      },
      {
        amount: new Prisma.Decimal('75'),
        moveInCharge: {
          payoutTreatment: MoveInChargePayoutTreatment.JOHNSON_REALTY,
          commissionRate: null,
        },
      },
    ]);

    expect(split.managementCommissionAmount.toFixed(2)).toBe('175.00');
    expect(split.ownerProceedsAmount.toFixed(2)).toBe('1400.00');
  });

  it('reopens the correct balance after a refund', () => {
    expect(
      moveInChargeStatus({
        amount: new Prisma.Decimal('500'),
        paidAmount: new Prisma.Decimal('500'),
        refundedAmount: new Prisma.Decimal('125'),
        waivedAmount: new Prisma.Decimal('0'),
      }),
    ).toBe(MoveInChargeStatus.PARTIAL);
  });
});
