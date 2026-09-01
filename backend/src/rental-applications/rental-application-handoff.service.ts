import { ConflictException, Injectable } from '@nestjs/common';
import {
  ESignatureDocumentType,
  ESignatureEnvelopeStatus,
  ESignatureTargetType,
  RentalApplicationHandoffStatus,
  Role,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ESignaturesService } from '../e-signatures/e-signatures.service';
import { LeasesService } from '../leases/leases.service';
import { PrismaService } from '../prisma/prisma.service';
import { StartRentalApplicationHandoffDto } from './dto/rental-application.dto';
import { RentalApplicationHandoffPreparationService } from './rental-application-handoff-preparation.service';
import {
  HANDOFF_INCLUDE,
  assertLeaseTerms,
  handoffFailureStage,
  handoffFingerprint,
  preparedLeaseFields,
  safeHandoffFailure,
} from './rental-application-handoff.policy';

type AdminUser = { id: string; email: string; role: Role };

@Injectable()
export class RentalApplicationHandoffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leases: LeasesService,
    private readonly eSignatures: ESignaturesService,
    private readonly preparation: RentalApplicationHandoffPreparationService,
  ) {}

  options(applicationId: string) {
    return this.preparation.options(applicationId);
  }

  async start(
    user: AdminUser,
    applicationId: string,
    data: StartRentalApplicationHandoffDto,
  ) {
    const application = await this.preparation.application(applicationId);
    await this.preparation.assertTemplate(data);
    assertLeaseTerms(data);
    let handoff = await this.reserveHandoff(
      user.id,
      applicationId,
      data.clientRequestId,
      handoffFingerprint(applicationId, data),
    );
    if (
      handoff.status === RentalApplicationHandoffStatus.SIGNED ||
      handoff.status === RentalApplicationHandoffStatus.ENVELOPE_SENT
    ) {
      return handoff;
    }

    try {
      const tenantId =
        handoff.tenantId ??
        (await this.preparation.ensureTenant(
          user.id,
          application,
          data.unitId,
        ));
      handoff = await this.markTenantInvited(handoff.id, tenantId);
      const lease = handoff.leaseId
        ? await this.preparation.prepareLeaseRetry(
            user.id,
            applicationId,
            tenantId,
            handoff.leaseId,
            data,
          )
        : await this.leases.createPendingFromApplication(
            user.id,
            applicationId,
            tenantId,
            data,
          );
      handoff = await this.markLeaseCreated(handoff.id, lease.id);

      const recovered = await this.recoverActiveEnvelope(handoff);
      if (recovered) return recovered;

      const envelopeClientRequestId = randomUUID();
      handoff = await this.prisma.rentalApplicationHandoff.update({
        where: { id: handoff.id },
        data: {
          envelopeId: null,
          envelopeClientRequestId,
          status: RentalApplicationHandoffStatus.ENVELOPE_CREATING,
        },
        include: HANDOFF_INCLUDE,
      });
      const envelope = await this.eSignatures.create(
        user,
        {
          clientRequestId: envelopeClientRequestId,
          templateId: data.templateId,
          documentType: ESignatureDocumentType.LEASE,
          targetType: ESignatureTargetType.TENANT,
          targetId: tenantId,
          leaseId: lease.id,
          recipientRoleName: data.recipientRoleName,
          title: data.title,
        },
        preparedLeaseFields(application, lease),
      );
      return this.markEnvelopeSent(handoff.id, envelope.id);
    } catch (error) {
      const recoveredEnvelope = handoff.envelopeClientRequestId
        ? await this.eSignatures.findByClientRequestId(
            handoff.envelopeClientRequestId,
          )
        : null;
      await this.prisma.rentalApplicationHandoff.update({
        where: { id: handoff.id },
        data: {
          envelopeId: recoveredEnvelope?.id,
          status: RentalApplicationHandoffStatus.FAILED,
          failureStage: handoffFailureStage(handoff.status),
          failureReason: safeHandoffFailure(error),
          failedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private async reserveHandoff(
    userId: string,
    applicationId: string,
    clientRequestId: string,
    fingerprint: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "RentalApplication" WHERE "id" = ${applicationId} FOR UPDATE`;
      const current = await tx.rentalApplicationHandoff.findUnique({
        where: { applicationId },
        include: HANDOFF_INCLUDE,
      });
      if (!current) {
        return tx.rentalApplicationHandoff.create({
          data: {
            applicationId,
            initiatedByUserId: userId,
            clientRequestId,
            requestFingerprint: fingerprint,
          },
          include: HANDOFF_INCLUDE,
        });
      }
      const retryableStatuses: RentalApplicationHandoffStatus[] = [
        RentalApplicationHandoffStatus.FAILED,
        RentalApplicationHandoffStatus.ACTION_REQUIRED,
      ];
      const retryable = retryableStatuses.includes(current.status);
      if (!retryable && current.requestFingerprint !== fingerprint) {
        throw new ConflictException(
          'A different lease handoff is already in progress for this application',
        );
      }
      if (!retryable) return current;
      return tx.rentalApplicationHandoff.update({
        where: { id: current.id },
        data: {
          clientRequestId,
          requestFingerprint: fingerprint,
          initiatedByUserId: userId,
          status: RentalApplicationHandoffStatus.STARTED,
          attemptCount: { increment: 1 },
          failureStage: null,
          failureReason: null,
          failedAt: null,
        },
        include: HANDOFF_INCLUDE,
      });
    });
  }

  private markTenantInvited(handoffId: string, tenantId: string) {
    return this.prisma.rentalApplicationHandoff.update({
      where: { id: handoffId },
      data: {
        tenantId,
        status: RentalApplicationHandoffStatus.TENANT_INVITED,
        tenantInvitedAt: new Date(),
        failureStage: null,
        failureReason: null,
        failedAt: null,
      },
      include: HANDOFF_INCLUDE,
    });
  }

  private markLeaseCreated(handoffId: string, leaseId: string) {
    return this.prisma.rentalApplicationHandoff.update({
      where: { id: handoffId },
      data: {
        leaseId,
        status: RentalApplicationHandoffStatus.LEASE_CREATED,
        leaseCreatedAt: new Date(),
      },
      include: HANDOFF_INCLUDE,
    });
  }

  private async recoverActiveEnvelope(
    handoff: Awaited<
      ReturnType<RentalApplicationHandoffService['markLeaseCreated']>
    >,
  ) {
    const envelope =
      handoff.envelope ??
      (handoff.envelopeClientRequestId
        ? await this.eSignatures.findByClientRequestId(
            handoff.envelopeClientRequestId,
          )
        : null);
    if (
      envelope?.status === ESignatureEnvelopeStatus.CREATING &&
      !envelope.providerEnvelopeId
    ) {
      throw new ConflictException(
        'Envelope confirmation is incomplete. Verify Verdocs before retrying to avoid a duplicate lease.',
      );
    }
    const inactiveStatuses: ESignatureEnvelopeStatus[] = [
      ESignatureEnvelopeStatus.FAILED,
      ESignatureEnvelopeStatus.DECLINED,
      ESignatureEnvelopeStatus.CANCELED,
      ESignatureEnvelopeStatus.EXPIRED,
    ];
    if (!envelope || inactiveStatuses.includes(envelope.status)) {
      return null;
    }
    return this.markEnvelopeSent(handoff.id, envelope.id);
  }

  private markEnvelopeSent(handoffId: string, envelopeId: string) {
    return this.prisma.rentalApplicationHandoff.update({
      where: { id: handoffId },
      data: {
        envelopeId,
        status: RentalApplicationHandoffStatus.ENVELOPE_SENT,
        envelopeSentAt: new Date(),
        failureStage: null,
        failureReason: null,
        failedAt: null,
      },
      include: HANDOFF_INCLUDE,
    });
  }
}
