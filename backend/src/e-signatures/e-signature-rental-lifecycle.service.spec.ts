import {
  ESignatureEnvelopeStatus,
  LeaseRenewalStatus,
  RentalApplicationHandoffStatus,
} from '@prisma/client';
import { ESignatureRentalLifecycleService } from './e-signature-rental-lifecycle.service';

describe('ESignatureRentalLifecycleService', () => {
  const handoff = {
    id: 'handoff-1',
    applicationId: 'application-1',
    tenantId: 'tenant-1',
    leaseId: 'lease-1',
    status: RentalApplicationHandoffStatus.ENVELOPE_SENT,
    initiatedByUserId: 'admin-1',
    lease: {
      unitId: 'unit-1',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      monthlyRent: 1500,
      securityDeposit: 1500,
      unit: {
        property: { owner: null },
      },
    },
  };

  function transaction() {
    return {
      leaseRenewal: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      rentalApplicationHandoff: {
        findUnique: jest.fn().mockResolvedValue(handoff),
        update: jest.fn(),
      },
      unit: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      lease: { update: jest.fn() },
      tenant: { update: jest.fn(), updateMany: jest.fn() },
      auditLog: { create: jest.fn() },
      moveInCharge: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      moveInInspection: {
        create: jest.fn().mockResolvedValue({ id: 'inspection-1' }),
      },
    };
  }

  it('activates occupancy only after the signed envelope is complete', async () => {
    const tx = transaction();
    const now = new Date('2026-09-01T12:00:00.000Z');

    await new ESignatureRentalLifecycleService().apply(
      tx as never,
      'envelope-1',
      ESignatureEnvelopeStatus.COMPLETED,
      now,
    );

    expect(tx.unit.updateMany).toHaveBeenCalledWith({
      where: { id: 'unit-1', status: 'reserved' },
      data: { status: 'occupied', availableDate: null },
    });
    expect(tx.lease.update).toHaveBeenCalledWith({
      where: { id: 'lease-1' },
      data: { status: 'active' },
    });
    expect(tx.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: { unitId: 'unit-1', status: 'active' },
    });
    expect(tx.rentalApplicationHandoff.update).toHaveBeenCalledWith({
      where: { id: 'handoff-1' },
      data: {
        status: RentalApplicationHandoffStatus.SIGNED,
        signedAt: now,
        failureStage: null,
        failureReason: null,
        failedAt: null,
      },
    });
    expect(tx.moveInCharge.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(tx.moveInInspection.create).toHaveBeenCalledTimes(1);
  });

  it('records a signed renewal without changing future terms early', async () => {
    const tx = transaction();
    tx.leaseRenewal.findUnique.mockResolvedValue({
      id: 'renewal-1',
      leaseId: 'lease-1',
      status: LeaseRenewalStatus.SIGNING,
      lease: { vacateNotices: [] },
    });
    const occurredAt = new Date('2026-08-24T12:00:00.000Z');

    await new ESignatureRentalLifecycleService().apply(
      tx as never,
      'envelope-renewal',
      ESignatureEnvelopeStatus.COMPLETED,
      occurredAt,
    );

    expect(tx.leaseRenewal.update).toHaveBeenCalledWith({
      where: { id: 'renewal-1' },
      data: { status: LeaseRenewalStatus.SIGNED, signedAt: occurredAt },
    });
    expect(tx.lease.update).toHaveBeenCalledWith({
      where: { id: 'lease-1' },
      data: { status: 'renewed' },
    });
    expect(tx.rentalApplicationHandoff.update).not.toHaveBeenCalled();
  });

  it('releases the reservation when the resident declines', async () => {
    const tx = transaction();

    const occurredAt = new Date();
    await new ESignatureRentalLifecycleService().apply(
      tx as never,
      'envelope-1',
      ESignatureEnvelopeStatus.DECLINED,
      occurredAt,
    );

    expect(tx.lease.update).toHaveBeenCalledWith({
      where: { id: 'lease-1' },
      data: { status: 'signature_action_required' },
    });
    expect(tx.unit.updateMany).toHaveBeenCalledWith({
      where: { id: 'unit-1', status: 'reserved' },
      data: { status: 'vacant', availableDate: occurredAt },
    });
    expect(tx.tenant.updateMany).toHaveBeenCalledWith({
      where: { id: 'tenant-1', unitId: 'unit-1' },
      data: { unitId: null, status: 'inactive' },
    });
  });

  it('does not repeat a terminal handoff transition', async () => {
    const tx = transaction();
    tx.rentalApplicationHandoff.findUnique.mockResolvedValue({
      ...handoff,
      status: RentalApplicationHandoffStatus.ACTION_REQUIRED,
    });

    await new ESignatureRentalLifecycleService().apply(
      tx as never,
      'envelope-1',
      ESignatureEnvelopeStatus.DECLINED,
      new Date(),
    );

    expect(tx.lease.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
