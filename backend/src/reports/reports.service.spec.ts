import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  it('combines queues, occupancy, rent splits, sale revenue, and audit metrics', async () => {
    const prisma = {
      agent: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([{ id: 'agent-1' }]),
      },
      property: {
        count: jest
          .fn()
          .mockResolvedValueOnce(3)
          .mockResolvedValueOnce(7)
          .mockResolvedValueOnce(5)
          .mockResolvedValueOnce(1),
        findMany: jest.fn().mockResolvedValue([{ id: 'listing-1' }]),
      },
      unit: {
        groupBy: jest.fn().mockResolvedValue([
          { status: 'occupied', _count: { _all: 8 } },
          { status: 'vacant', _count: { _all: 2 } },
        ]),
      },
      payment: {
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({
            _sum: {
              paidAmount: 10000,
              managementCommissionAmount: new Prisma.Decimal('1000'),
              ownerProceedsAmount: new Prisma.Decimal('9000'),
            },
            _count: { _all: 6 },
          })
          .mockResolvedValueOnce({
            _sum: { paidAmount: 500 },
            _count: { _all: 1 },
          }),
      },
      saleCommission: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { commissionAmount: new Prisma.Decimal('12000') },
          _count: { _all: 1 },
        }),
      },
      auditLog: {
        count: jest.fn().mockResolvedValueOnce(20).mockResolvedValueOnce(2),
        groupBy: jest
          .fn()
          .mockResolvedValue([{ userId: 'user-1' }, { userId: 'user-2' }]),
      },
    };

    const result = await new ReportsService(prisma as never).overview({
      from: '2026-01-01',
      to: '2026-12-31',
    });

    expect(result.queues).toMatchObject({
      pendingAgents: 2,
      pendingListings: 3,
    });
    expect(result.rentals).toMatchObject({
      properties: 7,
      publishedProperties: 5,
      unassignedProperties: 1,
      units: 10,
      occupiedUnits: 8,
      occupancyRate: 80,
    });
    expect(result.rentRevenue).toEqual({
      collected: '10000.00',
      managementCommission: '1000.00',
      ownerProceeds: '9000.00',
      paymentCount: 6,
      unassignedCollected: '500.00',
      unassignedPaymentCount: 1,
    });
    expect(result.companyRevenue.combined).toBe('13000.00');
    expect(result.compliance).toEqual({
      auditEventCount: 20,
      actorCount: 2,
      systemEventCount: 2,
    });
  });

  it('paginates owners and reports snapshotted rent attribution', async () => {
    const owners = [
      {
        id: 'owner-2',
        ownerName: 'Owner Two',
        companyName: null,
        contactEmail: 'two@example.com',
        payoutStatus: 'ACTIVE',
        commissionRate: new Prisma.Decimal('12.50'),
        createdAt: new Date('2026-08-02'),
      },
      {
        id: 'owner-1',
        ownerName: 'Owner One',
        companyName: null,
        contactEmail: 'one@example.com',
        payoutStatus: 'PENDING_ONBOARDING',
        commissionRate: new Prisma.Decimal('10.00'),
        createdAt: new Date('2026-08-01'),
      },
    ];
    const prisma = {
      propertyOwner: { findMany: jest.fn().mockResolvedValue(owners) },
      property: {
        findMany: jest.fn().mockResolvedValue([
          {
            ownerId: 'owner-2',
            publishStatus: 'PUBLISHED',
            units: [{ status: 'occupied' }, { status: 'vacant' }],
          },
        ]),
      },
      payment: {
        groupBy: jest.fn().mockResolvedValue([
          {
            propertyOwnerId: 'owner-2',
            _sum: {
              paidAmount: 2000,
              managementCommissionAmount: new Prisma.Decimal('250'),
              ownerProceedsAmount: new Prisma.Decimal('1750'),
            },
            _count: { _all: 1 },
          },
        ]),
      },
    };
    const result = await new ReportsService(prisma as never).owners({
      limit: 1,
      from: '2026-01-01',
      to: '2026-12-31',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'owner-2',
      commissionRate: '12.50',
      propertyCount: 1,
      unitCount: 2,
      occupiedUnitCount: 1,
      rentCollected: '2000.00',
      managementCommission: '250.00',
      ownerProceeds: '1750.00',
    });
    expect(result.nextCursor).toEqual(expect.any(String));
    expect(prisma.propertyOwner.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 2 }),
    );
  });

  it('rejects inverted and excessive report ranges', async () => {
    const service = new ReportsService({} as never);
    await expect(
      service.overview({ from: '2026-08-02', to: '2026-08-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.overview({ from: '2019-01-01', to: '2026-01-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
