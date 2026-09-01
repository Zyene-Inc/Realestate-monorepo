import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ESignatureDocumentType,
  RentalApplicationStatus,
  Role,
} from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { VerdocsService } from '../e-signatures/verdocs.service';
import { PrismaService } from '../prisma/prisma.service';
import { StartRentalApplicationHandoffDto } from './dto/rental-application.dto';
import {
  APPLICATION_HANDOFF_CONTEXT_INCLUDE,
  BLOCKING_LEASE_STATUSES,
  LEASE_TEMPLATE_FIELDS,
  missingTemplateFields,
  type RentalApplicationHandoffContext,
} from './rental-application-handoff.policy';

const preparedLeaseInclude = {
  tenant: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  unit: { include: { property: { select: { id: true, name: true } } } },
};

@Injectable()
export class RentalApplicationHandoffPreparationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly verdocs: VerdocsService,
  ) {}

  async application(id: string) {
    const application = await this.prisma.rentalApplication.findUnique({
      where: { id },
      include: APPLICATION_HANDOFF_CONTEXT_INCLUDE,
    });
    if (!application) {
      throw new NotFoundException('Rental application not found');
    }
    if (application.status !== RentalApplicationStatus.APPROVED) {
      throw new ConflictException(
        'Approve the application before preparing a lease',
      );
    }
    return application;
  }

  async options(applicationId: string) {
    const application = await this.application(applicationId);
    const configuration = this.verdocs.configuration();
    const templateId = this.verdocs.templateIdFor(ESignatureDocumentType.LEASE);
    const reusableTenant = application.handoff?.tenant
      ? null
      : await this.prisma.tenant.findUnique({
          where: { email: application.email.trim().toLowerCase() },
          select: { unitId: true, status: true },
        });
    const reservedUnitId =
      application.handoff?.lease?.unitId ??
      application.handoff?.tenant?.unitId ??
      (reusableTenant?.status === 'invited' ? reusableTenant.unitId : null);
    const units = await this.prisma.unit.findMany({
      where: {
        propertyId: application.propertyId,
        OR: reservedUnitId
          ? [{ id: reservedUnitId }]
          : [
              {
                status: 'vacant',
                tenants: { none: { status: { in: ['invited', 'active'] } } },
                leases: {
                  none: { status: { in: BLOCKING_LEASE_STATUSES } },
                },
              },
            ],
      },
      select: {
        id: true,
        unitNumber: true,
        rentAmount: true,
        depositAmount: true,
        status: true,
      },
      orderBy: [{ unitNumber: 'asc' }, { id: 'asc' }],
    });
    if (!configuration.apiConfigured || !templateId) {
      return {
        configuration,
        template: null,
        requiredTemplateFields: LEASE_TEMPLATE_FIELDS,
        units,
        handoff: application.handoff,
      };
    }
    const template = await this.verdocs.template(templateId);
    const roles = (template.roles ?? []).filter((role) =>
      ['signer', 'approver'].includes(role.type),
    );
    return {
      configuration,
      template: {
        id: template.id,
        name: template.name,
        isSendable: template.is_sendable,
        roles: roles.map((role) => ({ name: role.name, type: role.type })),
        missingFieldsByRole: Object.fromEntries(
          roles.map((role) => [
            role.name,
            missingTemplateFields(template.fields ?? [], role.name),
          ]),
        ),
      },
      requiredTemplateFields: LEASE_TEMPLATE_FIELDS,
      units,
      handoff: application.handoff,
    };
  }

  async assertTemplate(data: StartRentalApplicationHandoffDto) {
    const configuration = this.verdocs.configuration();
    if (!configuration.apiConfigured || !configuration.webhookConfigured) {
      throw new ServiceUnavailableException(
        'Configure the Verdocs API, webhook, and lease template before sending a lease',
      );
    }
    if (
      this.verdocs.templateIdFor(ESignatureDocumentType.LEASE) !==
      data.templateId
    ) {
      throw new BadRequestException('Select the configured lease template');
    }
    const template = await this.verdocs.template(data.templateId);
    const roles = (template.roles ?? []).filter((role) =>
      ['signer', 'approver'].includes(role.type),
    );
    if (
      !template.is_sendable ||
      roles.length !== 1 ||
      roles[0]?.name !== data.recipientRoleName.trim()
    ) {
      throw new BadRequestException(
        'The lease template must be sendable with one matching signer role',
      );
    }
    const missing = missingTemplateFields(
      template.fields ?? [],
      data.recipientRoleName.trim(),
    );
    if (missing.length) {
      throw new BadRequestException(
        `Add the required lease fields to Verdocs: ${missing.join(', ')}`,
      );
    }
  }

  async ensureTenant(
    userId: string,
    application: RentalApplicationHandoffContext,
    unitId: string,
  ) {
    const email = application.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
      include: {
        tenantProfile: {
          include: {
            leases: {
              where: { status: { in: BLOCKING_LEASE_STATUSES } },
              select: { id: true, rentalApplicationId: true },
            },
          },
        },
      },
    });
    if (existing) {
      if (existing.role !== Role.TENANT || !existing.tenantProfile) {
        throw new ConflictException(
          'The applicant email belongs to a non-resident portal account',
        );
      }
      if (
        existing.tenantProfile.leases.some(
          (lease) => lease.rentalApplicationId !== application.id,
        )
      ) {
        throw new ConflictException(
          'The applicant already has a current lease',
        );
      }
      if (
        existing.tenantProfile.unitId &&
        existing.tenantProfile.unitId !== unitId &&
        existing.tenantProfile.status !== 'inactive'
      ) {
        throw new ConflictException(
          'The applicant is assigned to a different rental unit',
        );
      }
      return existing.tenantProfile.id;
    }
    const invited = await this.auth.inviteTenant(
      {
        email,
        firstName: application.firstName,
        lastName: application.lastName,
        unitId,
      },
      userId,
    );
    return invited.tenantId;
  }

  async prepareLeaseRetry(
    userId: string,
    applicationId: string,
    tenantId: string,
    leaseId: string,
    data: StartRentalApplicationHandoffDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Unit" WHERE "id" = ${data.unitId} FOR UPDATE`;
      const lease = await tx.lease.findFirst({
        where: { id: leaseId, rentalApplicationId: applicationId, tenantId },
        include: preparedLeaseInclude,
      });
      if (!lease) {
        throw new ConflictException(
          'Application lease history is inconsistent',
        );
      }
      if (lease.unitId !== data.unitId) {
        throw new ConflictException(
          'A lease retry must use the unit already linked to the application',
        );
      }
      const [competingLease, unit] = await Promise.all([
        tx.lease.findFirst({
          where: {
            unitId: data.unitId,
            id: { not: leaseId },
            status: { in: BLOCKING_LEASE_STATUSES },
          },
          select: { id: true },
        }),
        tx.unit.findUnique({ where: { id: data.unitId } }),
      ]);
      if (
        competingLease ||
        !unit ||
        !['vacant', 'reserved'].includes(unit.status)
      ) {
        throw new ConflictException('Unit is no longer available');
      }
      await tx.unit.update({
        where: { id: data.unitId },
        data: { status: 'reserved', availableDate: null },
      });
      await tx.tenant.update({
        where: { id: tenantId },
        data: { unitId: data.unitId, status: 'invited' },
      });
      const updated = await tx.lease.update({
        where: { id: leaseId },
        data: {
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          monthlyRent: data.monthlyRent,
          securityDeposit: data.securityDeposit,
          rentDueDay: data.rentDueDay,
          gracePeriodDays: data.gracePeriodDays,
          lateFeeAmount: data.lateFeeAmount,
          status: 'pending_signature',
        },
        include: preparedLeaseInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'RENTAL_APPLICATION_LEASE_SIGNATURE_RETRIED',
          resource: 'rental_application',
          resourceId: applicationId,
          newValue: JSON.stringify({ leaseId, unitId: data.unitId }),
        },
      });
      return updated;
    });
  }
}
