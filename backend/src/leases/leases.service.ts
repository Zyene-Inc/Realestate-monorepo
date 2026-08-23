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

const leaseInclude = {
  tenant: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  unit: {
    include: { property: { select: { id: true, name: true } } },
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
            status: { in: ['active', 'expiring', 'renewed'] },
          },
          select: { id: true },
        }),
        this.prisma.lease.findFirst({
          where: {
            unitId: data.unitId,
            status: { in: ['active', 'expiring', 'renewed'] },
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
      await tx.auditLog.create({
        data: {
          userId,
          action: 'RENTAL_LEASE_CREATED',
          resource: 'lease',
          resourceId: lease.id,
          newValue: JSON.stringify({ tenantId: tenant.id, unitId: unit.id }),
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
    return lease;
  }

  async update(userId: string, id: string, data: UpdateLeaseDto) {
    const current = await this.findOne(id);
    if (
      current.status === 'terminated' &&
      data.status &&
      data.status !== 'terminated'
    ) {
      throw new ConflictException(
        'A terminated lease cannot be reactivated; create a new lease instead',
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
      if (data.status === 'terminated') {
        await tx.tenant.updateMany({
          where: { id: current.tenantId, unitId: current.unitId },
          data: { unitId: null, status: 'inactive' },
        });
        await tx.unit.update({
          where: { id: current.unitId },
          data: { status: 'vacant', availableDate: new Date() },
        });
      } else if (
        data.status &&
        ['active', 'expiring', 'renewed'].includes(data.status)
      ) {
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
    if (lease.payments.length > 0) {
      throw new ConflictException(
        'A lease with payment history cannot be deleted; terminate it instead',
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
