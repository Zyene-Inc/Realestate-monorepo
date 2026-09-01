import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, RentalApplicationHandoffStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { StartRentalApplicationHandoffDto } from './dto/rental-application.dto';

export const LEASE_TEMPLATE_FIELDS = [
  'lease_tenant_name',
  'lease_property_address',
  'lease_unit_number',
  'lease_start_date',
  'lease_end_date',
  'lease_monthly_rent',
  'lease_security_deposit',
  'lease_rent_due_day',
  'lease_grace_period_days',
  'lease_late_fee',
] as const;

export const BLOCKING_LEASE_STATUSES = [
  'pending_signature',
  'signature_action_required',
  'active',
  'expiring',
  'renewed',
];

export const HANDOFF_INCLUDE = {
  tenant: {
    select: {
      id: true,
      unitId: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
    },
  },
  lease: {
    include: {
      unit: {
        include: { property: { select: { id: true, name: true } } },
      },
    },
  },
  envelope: {
    select: {
      id: true,
      providerEnvelopeId: true,
      status: true,
      recipientStatus: true,
      sentAt: true,
      openedAt: true,
      completedAt: true,
      expiresAt: true,
      failureReason: true,
    },
  },
} satisfies Prisma.RentalApplicationHandoffInclude;

export const APPLICATION_HANDOFF_CONTEXT_INCLUDE = {
  property: {
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      zip: true,
    },
  },
  handoff: { include: HANDOFF_INCLUDE },
} satisfies Prisma.RentalApplicationInclude;

export type RentalApplicationHandoffContext =
  Prisma.RentalApplicationGetPayload<{
    include: typeof APPLICATION_HANDOFF_CONTEXT_INCLUDE;
  }>;

export function missingTemplateFields(
  fields: Array<{ name: string; role_name: string }>,
  roleName: string,
) {
  const names = new Set(
    fields
      .filter((field) => field.role_name === roleName)
      .map((field) => field.name),
  );
  return LEASE_TEMPLATE_FIELDS.filter((name) => !names.has(name));
}

export function assertLeaseTerms(data: StartRentalApplicationHandoffDto) {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  if (
    !Number.isFinite(start.valueOf()) ||
    !Number.isFinite(end.valueOf()) ||
    start >= end
  ) {
    throw new BadRequestException('Lease end date must be after start date');
  }
}

export function handoffFingerprint(
  applicationId: string,
  data: StartRentalApplicationHandoffDto,
) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        applicationId,
        unitId: data.unitId,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        monthlyRent: data.monthlyRent,
        securityDeposit: data.securityDeposit,
        rentDueDay: data.rentDueDay,
        gracePeriodDays: data.gracePeriodDays,
        lateFeeAmount: data.lateFeeAmount,
        templateId: data.templateId,
        recipientRoleName: data.recipientRoleName.trim(),
        title: data.title.trim(),
      }),
    )
    .digest('hex');
}

export function preparedLeaseFields(
  application: RentalApplicationHandoffContext,
  lease: {
    startDate: Date;
    endDate: Date;
    monthlyRent: number;
    securityDeposit: number;
    rentDueDay: number;
    gracePeriodDays: number;
    lateFeeAmount: number;
    unit: { unitNumber: string };
  },
) {
  const money = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  const date = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeZone: 'UTC',
  });
  return {
    lease_tenant_name: `${application.firstName} ${application.lastName}`,
    lease_property_address: [
      application.property.address,
      application.property.city,
      application.property.state,
      application.property.zip,
    ]
      .filter(Boolean)
      .join(', '),
    lease_unit_number: lease.unit.unitNumber,
    lease_start_date: date.format(lease.startDate),
    lease_end_date: date.format(lease.endDate),
    lease_monthly_rent: money.format(lease.monthlyRent),
    lease_security_deposit: money.format(lease.securityDeposit),
    lease_rent_due_day: String(lease.rentDueDay),
    lease_grace_period_days: String(lease.gracePeriodDays),
    lease_late_fee: money.format(lease.lateFeeAmount),
  };
}

export function handoffFailureStage(status: RentalApplicationHandoffStatus) {
  if (status === RentalApplicationHandoffStatus.ENVELOPE_CREATING) {
    return 'ENVELOPE';
  }
  if (status === RentalApplicationHandoffStatus.LEASE_CREATED) return 'LEASE';
  if (status === RentalApplicationHandoffStatus.TENANT_INVITED) return 'TENANT';
  return 'START';
}

export function safeHandoffFailure(error: unknown) {
  if (
    error instanceof BadRequestException ||
    error instanceof ConflictException ||
    error instanceof ServiceUnavailableException
  ) {
    const response = error.getResponse();
    if (typeof response === 'string') return response.slice(0, 500);
    if (response && typeof response === 'object' && 'message' in response) {
      const message = response.message;
      return (
        Array.isArray(message) ? message.join(', ') : String(message)
      ).slice(0, 500);
    }
  }
  return 'The lease handoff could not be completed';
}
