import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ListingType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailsService } from '../emails/emails.service';
import { CreateLeaseDto, UpdateLeaseDto } from './dto/lease.dto';
import { standardMoveInChargeData } from '../payments/move-in-charge.policy';
import { defaultMoveInInspectionData } from '../move-in-inspections/move-in-inspection.template';

const OCCUPANCY_BLOCKING_LEASE_STATUSES = [
  'pending_signature',
  'signature_action_required',
  'active',
  'expiring',
  'renewed',
];

export type PendingApplicationLeaseInput = {
  unitId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  rentDueDay: number;
  gracePeriodDays: number;
  lateFeeAmount: number;
};

const leaseInclude = {
  tenant: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  unit: {
    include: {
      property: {
        select: {
          id: true,
          name: true,
          owner: { select: { id: true, commissionRate: true } },
        },
      },
    },
  },
} satisfies Prisma.LeaseInclude;

@Injectable()
export class LeasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: EmailsService,
  ) {}

  private date(value: Date) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(value);
  }

  private assertDateOrder(startDate: Date, endDate: Date) {
    if (startDate >= endDate) {
      throw new BadRequestException('Lease end date must be after start date');
    }
  }

  async findAll() {
    return this.prisma.lease.findMany({
      where: { unit: { property: { listingType: ListingType.RENT } } },
      include: leaseInclude,
      orderBy: [{ endDate: 'desc' }, { id: 'desc' }],
      take: 250,
    });
  }

  async findOne(id: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id, unit: { property: { listingType: ListingType.RENT } } },
      include: { ...leaseInclude, payments: true },
    });
    if (!lease) throw new NotFoundException('Lease not found');
    return lease;
  }

  async create(userId: string, data: CreateLeaseDto) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    this.assertDateOrder(startDate, endDate);
    const [tenant, unit, existingTenantLease, existingUnitLease] =
      await Promise.all([
        this.prisma.tenant.findUnique({ where: { id: data.tenantId } }),
        this.prisma.unit.findFirst({
          where: {
            id: data.unitId,
            property: { listingType: ListingType.RENT },
          },
        }),
        this.prisma.lease.findFirst({
          where: {
            tenantId: data.tenantId,
            status: { in: OCCUPANCY_BLOCKING_LEASE_STATUSES },
          },
          select: { id: true },
        }),
        this.prisma.lease.findFirst({
          where: {
            unitId: data.unitId,
            status: { in: OCCUPANCY_BLOCKING_LEASE_STATUSES },
          },
          select: { id: true },
        }),
      ]);
    if (!tenant) throw new BadRequestException('Tenant not found');
    if (!unit) throw new BadRequestException('Rental unit not found');
    if (tenant.unitId && tenant.unitId !== unit.id) {
      throw new ConflictException('Tenant is assigned to a different unit');
    }
    if (existingTenantLease) {
      throw new ConflictException('Tenant already has an active lease');
    }
    if (existingUnitLease || unit.status !== 'vacant') {
      throw new ConflictException('Unit already has an active lease');
    }

    const lease = await this.prisma.$transaction(async (tx) => {
      const reservedUnit = await tx.unit.updateMany({
        where: { id: unit.id, status: 'vacant' },
        data: { status: 'occupied', availableDate: null },
      });
      if (reservedUnit.count !== 1) {
        throw new ConflictException('Unit is no longer available');
      }
      const assignedTenant = await tx.tenant.updateMany({
        where: {
          id: tenant.id,
          OR: [{ unitId: null }, { unitId: unit.id }],
        },
        data: { unitId: unit.id, status: 'active' },
      });
      if (assignedTenant.count !== 1) {
        throw new ConflictException('Tenant is no longer available');
      }
      const lease = await tx.lease.create({
        data: {
          ...data,
          startDate,
          endDate,
          status: 'active',
        },
        include: leaseInclude,
      });
      const moveInCharges = standardMoveInChargeData({
        tenantId: lease.tenantId,
        leaseId: lease.id,
        unitId: lease.unitId,
        startDate: lease.startDate,
        monthlyRent: lease.monthlyRent,
        securityDeposit: lease.securityDeposit,
        propertyOwnerId: lease.unit.property.owner?.id ?? null,
        commissionRate: lease.unit.property.owner?.commissionRate ?? null,
        postedByUserId: userId,
      });
      if (moveInCharges.length) {
        await tx.moveInCharge.createMany({ data: moveInCharges });
      }
      const inspection = await tx.moveInInspection.create({
        data: defaultMoveInInspectionData({
          leaseId: lease.id,
          tenantId: lease.tenantId,
          unitId: lease.unitId,
          startDate: lease.startDate,
          preparedByUserId: userId,
        }),
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'RENTAL_LEASE_CREATED',
          resource: 'lease',
          resourceId: lease.id,
          newValue: JSON.stringify({
            tenantId: tenant.id,
            unitId: unit.id,
            moveInChargesPosted: moveInCharges.length,
            moveInInspectionId: inspection.id,
          }),
        },
      });
      return lease;
    });
    await this.emails.sendLeaseCreated(
      lease.tenant.email,
      {
        name: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
        propertyName: lease.unit.property.name,
        unitNumber: lease.unit.unitNumber,
        startDate: this.date(lease.startDate),
        endDate: this.date(lease.endDate),
      },
      lease.id,
    );
    const moveInTotal = lease.monthlyRent + lease.securityDeposit;
    if (moveInTotal > 0) {
      await this.emails.sendMoveInChargesPosted(
        lease.tenant.email,
        {
          name: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
          propertyName: lease.unit.property.name,
          amount: moveInTotal,
        },
        `lease-activation-${lease.id}`,
      );
    }
    return lease;
  }

  async createPendingFromApplication(
    userId: string,
    applicationId: string,
    tenantId: string,
    data: PendingApplicationLeaseInput,
  ) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    this.assertDateOrder(startDate, endDate);

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "RentalApplication" WHERE "id" = ${applicationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "Unit" WHERE "id" = ${data.unitId} FOR UPDATE`;
      const recovered = await tx.lease.findUnique({
        where: { rentalApplicationId: applicationId },
        include: leaseInclude,
      });
      if (recovered) {
        if (
          recovered.tenantId !== tenantId ||
          recovered.unitId !== data.unitId
        ) {
          throw new ConflictException(
            'This application is already linked to a different lease',
          );
        }
        return recovered;
      }

      const [application, tenant, unit, tenantLease, unitLease] =
        await Promise.all([
          tx.rentalApplication.findUnique({
            where: { id: applicationId },
            select: { id: true, propertyId: true, status: true },
          }),
          tx.tenant.findUnique({ where: { id: tenantId } }),
          tx.unit.findFirst({
            where: {
              id: data.unitId,
              property: { listingType: ListingType.RENT },
            },
          }),
          tx.lease.findFirst({
            where: {
              tenantId,
              status: { in: OCCUPANCY_BLOCKING_LEASE_STATUSES },
            },
            select: { id: true },
          }),
          tx.lease.findFirst({
            where: {
              unitId: data.unitId,
              status: { in: OCCUPANCY_BLOCKING_LEASE_STATUSES },
            },
            select: { id: true },
          }),
        ]);
      if (!application || application.status !== 'APPROVED') {
        throw new ConflictException(
          'Only an approved application can become a lease',
        );
      }
      if (!tenant) throw new BadRequestException('Tenant not found');
      if (!unit || unit.propertyId !== application.propertyId) {
        throw new BadRequestException(
          'Select an available unit from the application property',
        );
      }
      if (tenant.unitId && tenant.unitId !== unit.id) {
        throw new ConflictException('Resident is assigned to a different unit');
      }
      if (tenantLease) {
        throw new ConflictException('Resident already has a current lease');
      }
      if (unitLease || unit.status !== 'vacant') {
        throw new ConflictException('Unit is no longer available');
      }

      const reservedUnit = await tx.unit.updateMany({
        where: { id: unit.id, status: 'vacant' },
        data: { status: 'reserved', availableDate: null },
      });
      if (reservedUnit.count !== 1) {
        throw new ConflictException('Unit is no longer available');
      }
      const assignedTenant = await tx.tenant.updateMany({
        where: { id: tenant.id, OR: [{ unitId: null }, { unitId: unit.id }] },
        data: { unitId: unit.id, status: 'invited' },
      });
      if (assignedTenant.count !== 1) {
        throw new ConflictException('Resident is no longer available');
      }

      const lease = await tx.lease.create({
        data: {
          tenantId,
          unitId: unit.id,
          rentalApplicationId: applicationId,
          startDate,
          endDate,
          monthlyRent: data.monthlyRent,
          securityDeposit: data.securityDeposit,
          rentDueDay: data.rentDueDay,
          gracePeriodDays: data.gracePeriodDays,
          lateFeeAmount: data.lateFeeAmount,
          status: 'pending_signature',
        },
        include: leaseInclude,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'RENTAL_LEASE_PENDING_SIGNATURE_CREATED',
          resource: 'lease',
          resourceId: lease.id,
          newValue: JSON.stringify({
            applicationId,
            tenantId,
            unitId: unit.id,
          }),
        },
      });
      return lease;
    });
  }

  async update(userId: string, id: string, data: UpdateLeaseDto) {
    const current = await this.findOne(id);
    if (
      ['pending_signature', 'signature_action_required'].includes(
        current.status,
      )
    ) {
      throw new ConflictException(
        'This lease is controlled by the application signing workflow',
      );
    }
    if (current.status === 'renewed' || current.status === 'terminated') {
      throw new ConflictException(
        'Signed renewals and completed move-outs cannot be edited from the basic lease form',
      );
    }
    const startDate = data.startDate
      ? new Date(data.startDate)
      : current.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : current.endDate;
    this.assertDateOrder(startDate, endDate);
    const lease = await this.prisma.$transaction(async (tx) => {
      const lease = await tx.lease.update({
        where: { id },
        data: {
          ...data,
          startDate: data.startDate ? startDate : undefined,
          endDate: data.endDate ? endDate : undefined,
        },
        include: leaseInclude,
      });
      if (data.status && ['active', 'expiring'].includes(data.status)) {
        await tx.tenant.update({
          where: { id: current.tenantId },
          data: { unitId: current.unitId, status: 'active' },
        });
        await tx.unit.update({
          where: { id: current.unitId },
          data: { status: 'occupied', availableDate: null },
        });
      }
      await tx.auditLog.create({
        data: {
          userId,
          action: 'RENTAL_LEASE_UPDATED',
          resource: 'lease',
          resourceId: id,
          oldValue: JSON.stringify({ status: current.status }),
          newValue: JSON.stringify({ status: lease.status }),
        },
      });
      return lease;
    });
    if (lease.status !== current.status) {
      await this.emails.sendLeaseStatusUpdated(
        lease.tenant.email,
        {
          name: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
          propertyName: lease.unit.property.name,
          unitNumber: lease.unit.unitNumber,
          status: lease.status,
        },
        `${lease.id}-${lease.status}`,
      );
    }
    return lease;
  }

  async remove(userId: string, id: string) {
    const lease = await this.findOne(id);
    if (
      ['active', 'expiring', 'renewed', 'terminated'].includes(lease.status)
    ) {
      throw new ConflictException(
        'Current and completed leases must remain in lifecycle history; use the move-out workflow instead',
      );
    }
    if (lease.rentalApplicationId) {
      throw new ConflictException(
        'An application-generated lease must remain in its signing history',
      );
    }
    if (lease.payments.length > 0) {
      throw new ConflictException(
        'A lease with payment history cannot be deleted',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          userId,
          action: 'RENTAL_LEASE_DELETED',
          resource: 'lease',
          resourceId: id,
          oldValue: JSON.stringify({
            tenantId: lease.tenantId,
            unitId: lease.unitId,
          }),
        },
      });
      await tx.lease.delete({ where: { id } });
      if (lease.status !== 'terminated') {
        await tx.tenant.updateMany({
          where: { id: lease.tenantId, unitId: lease.unitId },
          data: { unitId: null, status: 'inactive' },
        });
        await tx.unit.update({
          where: { id: lease.unitId },
          data: { status: 'vacant', availableDate: new Date() },
        });
      }
    });
    return { deleted: true };
  }
}
