import {
  LeaseRenewalStatus,
  NoticeToVacateStatus,
  Prisma,
} from '@prisma/client';
import { LeaseRenewalService } from './lease-renewal.service';

describe('LeaseRenewalService', () => {
  const actor = { id: 'admin-1' } as never;
  const offer = {
    proposedStartDate: '2099-02-01T00:00:00.000Z',
    proposedEndDate: '2100-01-31T00:00:00.000Z',
    proposedMonthlyRent: 1500,
    proposedSecurityDeposit: 1500,
    proposedRentDueDay: 1,
    proposedGracePeriodDays: 4,
    proposedLateFeeAmount: 75,
    offerExpiresAt: '2099-01-15T00:00:00.000Z',
  };

  it('locks the lease and rejects a renewal while a vacate notice is active', async () => {
    const tx = {
      lease: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'lease-1',
          status: 'active',
          endDate: new Date('2099-01-31T00:00:00.000Z'),
          renewals: [],
          vacateNotices: [{ id: 'notice-1' }],
        }),
      },
      leaseRenewal: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      $queryRaw: jest.fn(),
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const service = new LeaseRenewalService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.createRenewal(actor, 'lease-1', offer),
    ).rejects.toThrow(
      'Cancel the active notice to vacate before creating a renewal offer',
    );
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.leaseRenewal.create).not.toHaveBeenCalled();
  });

  it('does not contact Verdocs for an expired draft renewal', async () => {
    const verdocs = {
      templateIdFor: jest.fn(),
      template: jest.fn(),
    };
    const eSignatures = { create: jest.fn() };
    const prisma = {
      leaseRenewal: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'renewal-1',
          leaseId: 'lease-1',
          status: LeaseRenewalStatus.DRAFT,
          offerExpiresAt: new Date('2020-01-01T00:00:00.000Z'),
          proposedMonthlyRent: new Prisma.Decimal(1500),
          proposedSecurityDeposit: new Prisma.Decimal(1500),
          proposedLateFeeAmount: new Prisma.Decimal(75),
          lease: {},
        }),
      },
      noticeToVacate: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'notice-1',
          status: NoticeToVacateStatus.SUBMITTED,
        }),
      },
    };
    const service = new LeaseRenewalService(
      prisma as never,
      {} as never,
      eSignatures as never,
      verdocs as never,
      {} as never,
    );

    await expect(service.sendRenewal(actor, 'renewal-1')).rejects.toThrow(
      'This renewal response deadline has expired; create a new offer',
    );
    expect(prisma.noticeToVacate.findFirst).not.toHaveBeenCalled();
    expect(verdocs.templateIdFor).not.toHaveBeenCalled();
    expect(eSignatures.create).not.toHaveBeenCalled();
  });

  it('sends a valid renewal with the configured single-signer template', async () => {
    const renewal = {
      id: 'renewal-1',
      leaseId: 'lease-1',
      status: LeaseRenewalStatus.DRAFT,
      offerExpiresAt: new Date('2099-01-15T00:00:00.000Z'),
      proposedStartDate: new Date('2099-02-01T00:00:00.000Z'),
      proposedEndDate: new Date('2100-01-31T00:00:00.000Z'),
      proposedMonthlyRent: new Prisma.Decimal(1500),
      proposedSecurityDeposit: new Prisma.Decimal(1500),
      proposedRentDueDay: 1,
      proposedGracePeriodDays: 4,
      proposedLateFeeAmount: new Prisma.Decimal(75),
      lease: {
        id: 'lease-1',
        tenantId: 'tenant-1',
        tenant: {
          firstName: 'Taylor',
          lastName: 'Tenant',
          email: 'tenant@example.com',
        },
        unit: {
          unitNumber: 'A1',
          property: {
            name: 'Oakwood',
            address: '1 Main Street',
          },
        },
      },
    };
    const prisma = {
      leaseRenewal: {
        findUnique: jest.fn().mockResolvedValue(renewal),
        update: jest.fn().mockResolvedValue({}),
      },
      noticeToVacate: { findFirst: jest.fn().mockResolvedValue(null) },
      lease: { update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(async (operations: Array<Promise<unknown>>) =>
        Promise.all(operations),
      ),
    };
    const notifications = { renewalOffered: jest.fn() };
    const eSignatures = {
      create: jest.fn().mockResolvedValue({ id: 'envelope-1' }),
    };
    const verdocs = {
      templateIdFor: jest.fn().mockReturnValue('template-1'),
      template: jest.fn().mockResolvedValue({
        roles: [{ name: 'Tenant', type: 'signer' }],
      }),
    };
    const lifecycle = {
      getLease: jest.fn().mockResolvedValue({ id: 'lease-1' }),
    };
    const service = new LeaseRenewalService(
      prisma as never,
      notifications as never,
      eSignatures as never,
      verdocs as never,
      lifecycle as never,
    );

    await service.sendRenewal(actor, renewal.id);

    expect(eSignatures.create).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({
        leaseId: 'lease-1',
        targetId: 'tenant-1',
        recipientRoleName: 'Tenant',
      }),
      expect.objectContaining({
        lease_tenant_name: 'Taylor Tenant',
        lease_monthly_rent: '1500.00',
      }),
    );
    const updateRenewal = (
      prisma.leaseRenewal.update.mock.calls as unknown as Array<
        [
          {
            data: {
              status: LeaseRenewalStatus;
              envelopeId: string;
            };
          },
        ]
      >
    )[0][0];
    expect(updateRenewal.data).toMatchObject({
      status: LeaseRenewalStatus.SIGNING,
      envelopeId: 'envelope-1',
    });
    expect(notifications.renewalOffered).toHaveBeenCalledTimes(1);
    expect(lifecycle.getLease).toHaveBeenCalledWith('lease-1');
  });

  it('rejects a draft renewal when a vacate notice appears before sending', async () => {
    const prisma = {
      leaseRenewal: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'renewal-1',
          leaseId: 'lease-1',
          status: LeaseRenewalStatus.DRAFT,
          offerExpiresAt: new Date('2099-01-15T00:00:00.000Z'),
        }),
      },
      noticeToVacate: {
        findFirst: jest.fn().mockResolvedValue({ id: 'notice-1' }),
      },
    };
    const eSignatures = { create: jest.fn() };
    const verdocs = { templateIdFor: jest.fn() };
    const service = new LeaseRenewalService(
      prisma as never,
      {} as never,
      eSignatures as never,
      verdocs as never,
      {} as never,
    );

    await expect(service.sendRenewal(actor, 'renewal-1')).rejects.toThrow(
      'Cancel the active notice to vacate before sending a renewal offer',
    );
    expect(verdocs.templateIdFor).not.toHaveBeenCalled();
    expect(eSignatures.create).not.toHaveBeenCalled();
  });
});
