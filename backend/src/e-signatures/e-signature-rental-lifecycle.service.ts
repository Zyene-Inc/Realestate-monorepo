import { ConflictException, Injectable } from '@nestjs/common';
import {
  ESignatureEnvelopeStatus,
  LeaseRenewalStatus,
  NoticeToVacateStatus,
  Prisma,
  RentalApplicationHandoffStatus,
} from '@prisma/client';
import { standardMoveInChargeData } from '../payments/move-in-charge.policy';
import { defaultMoveInInspectionData } from '../move-in-inspections/move-in-inspection.template';

@Injectable()
export class ESignatureRentalLifecycleService {
  async apply(
    tx: Prisma.TransactionClient,
    envelopeId: string,
    status: ESignatureEnvelopeStatus,
    occurredAt: Date,
  ) {
    const renewal = await tx.leaseRenewal.findUnique({
      where: { envelopeId },
      include: { lease: { include: { vacateNotices: true } } },
    });
    if (renewal) {
      await this.applyRenewal(tx, renewal, status, occurredAt);
      return;
    }
    const handoff = await tx.rentalApplicationHandoff.findUnique({
      where: { envelopeId },
      select: {
        id: true,
        applicationId: true,
        tenantId: true,
        leaseId: true,
        status: true,
        initiatedByUserId: true,
        lease: {
          select: {
            unitId: true,
            startDate: true,
            monthlyRent: true,
            securityDeposit: true,
            unit: {
              select: {
                property: {
                  select: {
                    owner: { select: { id: true, commissionRate: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!handoff || !handoff.tenantId || !handoff.leaseId || !handoff.lease) {
      return;
    }
    const linkedHandoff = {
      id: handoff.id,
      applicationId: handoff.applicationId,
      tenantId: handoff.tenantId,
      leaseId: handoff.leaseId,
      initiatedByUserId: handoff.initiatedByUserId,
      lease: handoff.lease,
    };
    if (
      status === ESignatureEnvelopeStatus.COMPLETED &&
      handoff.status !== RentalApplicationHandoffStatus.SIGNED
    ) {
      await this.activateSignedLease(tx, linkedHandoff, envelopeId, occurredAt);
      return;
    }
    const unsignedStatuses: ESignatureEnvelopeStatus[] = [
      ESignatureEnvelopeStatus.DECLINED,
      ESignatureEnvelopeStatus.CANCELED,
      ESignatureEnvelopeStatus.EXPIRED,
    ];
    if (
      unsignedStatuses.includes(status) &&
      handoff.status !== RentalApplicationHandoffStatus.SIGNED &&
      handoff.status !== RentalApplicationHandoffStatus.ACTION_REQUIRED
    ) {
      await this.releaseUnsignedLease(tx, linkedHandoff, status, occurredAt);
    }
  }

  private async applyRenewal(
    tx: Prisma.TransactionClient,
    renewal: {
      id: string;
      leaseId: string;
      status: LeaseRenewalStatus;
      lease: { vacateNotices: { status: NoticeToVacateStatus }[] };
    },
    status: ESignatureEnvelopeStatus,
    occurredAt: Date,
  ) {
    if (status === ESignatureEnvelopeStatus.COMPLETED) {
      if (renewal.status === LeaseRenewalStatus.SIGNED) return;
      await tx.leaseRenewal.update({
        where: { id: renewal.id },
        data: { status: LeaseRenewalStatus.SIGNED, signedAt: occurredAt },
      });
      await tx.lease.update({
        where: { id: renewal.leaseId },
        data: { status: 'renewed' },
      });
      await tx.auditLog.create({
        data: {
          action: 'LEASE_RENEWAL_SIGNED',
          resource: 'lease_renewal',
          resourceId: renewal.id,
        },
      });
      return;
    }
    const terminalMap: Partial<
      Record<ESignatureEnvelopeStatus, LeaseRenewalStatus>
    > = {
      [ESignatureEnvelopeStatus.DECLINED]: LeaseRenewalStatus.DECLINED,
      [ESignatureEnvelopeStatus.CANCELED]: LeaseRenewalStatus.CANCELED,
      [ESignatureEnvelopeStatus.EXPIRED]: LeaseRenewalStatus.EXPIRED,
      [ESignatureEnvelopeStatus.FAILED]: LeaseRenewalStatus.FAILED,
    };
    const next = terminalMap[status];
    if (!next || renewal.status === LeaseRenewalStatus.SIGNED) return;
    await tx.leaseRenewal.update({
      where: { id: renewal.id },
      data: {
        status: next,
        declinedAt:
          next === LeaseRenewalStatus.DECLINED ? occurredAt : undefined,
        canceledAt:
          next === LeaseRenewalStatus.CANCELED ? occurredAt : undefined,
      },
    });
    const openNoticeStatuses: NoticeToVacateStatus[] = [
      NoticeToVacateStatus.SUBMITTED,
      NoticeToVacateStatus.ACKNOWLEDGED,
      NoticeToVacateStatus.MOVE_OUT_IN_PROGRESS,
    ];
    const hasOpenNotice = renewal.lease.vacateNotices.some((notice) =>
      openNoticeStatuses.includes(notice.status),
    );
    await tx.lease.update({
      where: { id: renewal.leaseId },
      data: { status: hasOpenNotice ? 'expiring' : 'active' },
    });
    await tx.auditLog.create({
      data: {
        action: `LEASE_RENEWAL_${next}`,
        resource: 'lease_renewal',
        resourceId: renewal.id,
      },
    });
  }

  private async activateSignedLease(
    tx: Prisma.TransactionClient,
    handoff: {
      id: string;
      applicationId: string;
      tenantId: string;
      leaseId: string;
      initiatedByUserId: string;
      lease: {
        unitId: string;
        startDate: Date;
        monthlyRent: number;
        securityDeposit: number;
        unit: {
          property: {
            owner: { id: string; commissionRate: Prisma.Decimal } | null;
          };
        };
      };
    },
    envelopeId: string,
    occurredAt: Date,
  ) {
    const occupied = await tx.unit.updateMany({
      where: { id: handoff.lease.unitId, status: 'reserved' },
      data: { status: 'occupied', availableDate: null },
    });
    if (occupied.count !== 1) {
      throw new ConflictException(
        'The reserved unit could not be activated for the signed lease',
      );
    }
    await tx.lease.update({
      where: { id: handoff.leaseId },
      data: { status: 'active' },
    });
    await tx.tenant.update({
      where: { id: handoff.tenantId },
      data: { unitId: handoff.lease.unitId, status: 'active' },
    });
    const moveInCharges = standardMoveInChargeData({
      tenantId: handoff.tenantId,
      leaseId: handoff.leaseId,
      unitId: handoff.lease.unitId,
      startDate: handoff.lease.startDate,
      monthlyRent: handoff.lease.monthlyRent,
      securityDeposit: handoff.lease.securityDeposit,
      propertyOwnerId: handoff.lease.unit.property.owner?.id ?? null,
      commissionRate: handoff.lease.unit.property.owner?.commissionRate ?? null,
      postedByUserId: handoff.initiatedByUserId,
    });
    if (moveInCharges.length) {
      await tx.moveInCharge.createMany({
        data: moveInCharges,
        skipDuplicates: true,
      });
    }
    const inspection = await tx.moveInInspection.create({
      data: defaultMoveInInspectionData({
        leaseId: handoff.leaseId,
        tenantId: handoff.tenantId,
        unitId: handoff.lease.unitId,
        startDate: handoff.lease.startDate,
        preparedByUserId: handoff.initiatedByUserId,
      }),
      select: { id: true },
    });
    await tx.rentalApplicationHandoff.update({
      where: { id: handoff.id },
      data: {
        status: RentalApplicationHandoffStatus.SIGNED,
        signedAt: occurredAt,
        failureStage: null,
        failureReason: null,
        failedAt: null,
      },
    });
    await tx.auditLog.create({
      data: {
        action: 'RENTAL_APPLICATION_LEASE_SIGNED',
        resource: 'rental_application',
        resourceId: handoff.applicationId,
        newValue: JSON.stringify({
          leaseId: handoff.leaseId,
          tenantId: handoff.tenantId,
          envelopeId,
          moveInChargesPosted: moveInCharges.length,
          moveInInspectionId: inspection.id,
        }),
      },
    });
  }

  private async releaseUnsignedLease(
    tx: Prisma.TransactionClient,
    handoff: {
      id: string;
      applicationId: string;
      tenantId: string;
      leaseId: string;
      initiatedByUserId: string;
      lease: {
        unitId: string;
        startDate: Date;
        monthlyRent: number;
        securityDeposit: number;
        unit: {
          property: {
            owner: { id: string; commissionRate: Prisma.Decimal } | null;
          };
        };
      };
    },
    status: ESignatureEnvelopeStatus,
    occurredAt: Date,
  ) {
    await tx.lease.update({
      where: { id: handoff.leaseId },
      data: { status: 'signature_action_required' },
    });
    await tx.unit.updateMany({
      where: { id: handoff.lease.unitId, status: 'reserved' },
      data: { status: 'vacant', availableDate: occurredAt },
    });
    await tx.tenant.updateMany({
      where: { id: handoff.tenantId, unitId: handoff.lease.unitId },
      data: { unitId: null, status: 'inactive' },
    });
    await tx.rentalApplicationHandoff.update({
      where: { id: handoff.id },
      data: {
        status: RentalApplicationHandoffStatus.ACTION_REQUIRED,
        failureStage: 'SIGNATURE',
        failureReason: `Envelope ${status.toLowerCase()}`,
        failedAt: occurredAt,
      },
    });
    await tx.auditLog.create({
      data: {
        action: 'RENTAL_APPLICATION_SIGNATURE_ACTION_REQUIRED',
        resource: 'rental_application',
        resourceId: handoff.applicationId,
        newValue: JSON.stringify({ status, leaseId: handoff.leaseId }),
      },
    });
  }
}
