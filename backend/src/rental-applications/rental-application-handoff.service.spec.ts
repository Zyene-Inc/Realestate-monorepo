import {
  ESignatureEnvelopeStatus,
  RentalApplicationHandoffStatus,
  Role,
} from '@prisma/client';
import { RentalApplicationHandoffService } from './rental-application-handoff.service';
import { handoffFingerprint } from './rental-application-handoff.policy';

describe('RentalApplicationHandoffService', () => {
  const request = {
    clientRequestId: '11111111-1111-4111-8111-111111111111',
    unitId: 'unit-1',
    startDate: '2026-09-01T00:00:00.000Z',
    endDate: '2027-08-31T00:00:00.000Z',
    monthlyRent: 1500,
    securityDeposit: 1500,
    rentDueDay: 1,
    gracePeriodDays: 5,
    lateFeeAmount: 50,
    templateId: '22222222-2222-4222-8222-222222222222',
    recipientRoleName: 'Tenant',
    title: 'Oakwood residential lease',
  };
  const application = {
    id: 'application-1',
    email: 'resident@example.com',
    firstName: 'Taylor',
    lastName: 'Resident',
    property: {
      address: '123 Main Street',
      city: 'Kansas City',
      state: 'MO',
      zip: '64101',
    },
  };
  const user = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: Role.TENANT_ADMIN,
  };

  it('runs the approved application handoff and prefills the lease envelope', async () => {
    const lease = {
      id: 'lease-1',
      startDate: new Date(request.startDate),
      endDate: new Date(request.endDate),
      monthlyRent: 1500,
      securityDeposit: 1500,
      rentDueDay: 1,
      gracePeriodDays: 5,
      lateFeeAmount: 50,
      unit: { unitNumber: '1A' },
    };
    const updates = [
      {
        id: 'handoff-1',
        tenantId: 'tenant-1',
        leaseId: null,
        envelopeClientRequestId: null,
        status: RentalApplicationHandoffStatus.TENANT_INVITED,
        envelope: null,
      },
      {
        id: 'handoff-1',
        tenantId: 'tenant-1',
        leaseId: 'lease-1',
        envelopeClientRequestId: null,
        status: RentalApplicationHandoffStatus.LEASE_CREATED,
        envelope: null,
      },
      {
        id: 'handoff-1',
        tenantId: 'tenant-1',
        leaseId: 'lease-1',
        envelopeClientRequestId: '33333333-3333-4333-8333-333333333333',
        status: RentalApplicationHandoffStatus.ENVELOPE_CREATING,
        envelope: null,
      },
      {
        id: 'handoff-1',
        status: RentalApplicationHandoffStatus.ENVELOPE_SENT,
      },
    ];
    const tx = {
      $queryRaw: jest.fn(),
      rentalApplicationHandoff: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'handoff-1',
          tenantId: null,
          leaseId: null,
          envelopeClientRequestId: null,
          status: RentalApplicationHandoffStatus.STARTED,
          envelope: null,
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
      rentalApplicationHandoff: {
        update: jest.fn().mockImplementation(() => updates.shift()),
      },
    };
    const preparation = {
      application: jest.fn().mockResolvedValue(application),
      assertTemplate: jest.fn(),
      ensureTenant: jest.fn().mockResolvedValue('tenant-1'),
    };
    const leases = {
      createPendingFromApplication: jest.fn().mockResolvedValue(lease),
    };
    const eSignatures = {
      create: jest.fn().mockResolvedValue({
        id: 'envelope-1',
        status: ESignatureEnvelopeStatus.PENDING,
      }),
      findByClientRequestId: jest.fn(),
    };
    const service = new RentalApplicationHandoffService(
      prisma as never,
      leases as never,
      eSignatures as never,
      preparation as never,
    );

    await expect(service.start(user, application.id, request)).resolves.toEqual(
      {
        id: 'handoff-1',
        status: RentalApplicationHandoffStatus.ENVELOPE_SENT,
      },
    );
    expect(preparation.ensureTenant).toHaveBeenCalledWith(
      user.id,
      application,
      request.unitId,
    );
    expect(eSignatures.create).toHaveBeenCalledWith(
      user,
      expect.objectContaining({
        documentType: 'LEASE',
        targetType: 'TENANT',
        targetId: 'tenant-1',
        leaseId: 'lease-1',
      }),
      expect.objectContaining({
        lease_tenant_name: 'Taylor Resident',
        lease_unit_number: '1A',
        lease_monthly_rent: '$1,500.00',
      }),
    );
  });

  it('returns an already-sent handoff without duplicating side effects', async () => {
    const sent = {
      id: 'handoff-1',
      status: RentalApplicationHandoffStatus.ENVELOPE_SENT,
      requestFingerprint: handoffFingerprint(application.id, request),
    };
    const tx = {
      $queryRaw: jest.fn(),
      rentalApplicationHandoff: {
        findUnique: jest.fn().mockResolvedValue(sent),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const preparation = {
      application: jest.fn().mockResolvedValue(application),
      assertTemplate: jest.fn(),
      ensureTenant: jest.fn(),
    };
    const service = new RentalApplicationHandoffService(
      prisma as never,
      {} as never,
      {} as never,
      preparation as never,
    );
    await expect(service.start(user, application.id, request)).resolves.toBe(
      sent,
    );
    expect(preparation.ensureTenant).not.toHaveBeenCalled();
  });
});
