import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';

const vendorSelect = {
  id: true,
  name: true,
  companyName: true,
  email: true,
  phone: true,
  specialty: true,
  rating: true,
  notes: true,
  createdAt: true,
  _count: { select: { maintenanceRequests: true } },
} satisfies Prisma.VendorSelect;

@Injectable()
export class VendorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async findAll(query?: string) {
    const search = query?.trim();
    return this.prisma.vendor.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { companyName: { contains: search, mode: 'insensitive' } },
              { specialty: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: vendorSelect,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: 200,
    });
  }

  async create(actorUserId: string, data: CreateVendorDto) {
    const vendor = await this.prisma.vendor.create({
      data: {
        name: data.name,
        companyName: data.companyName,
        email: data.email,
        phone: data.phone,
        specialty: data.specialty,
        rating: data.rating,
        notes: data.notes,
      },
      select: vendorSelect,
    });
    await this.auditLogs.log({
      userId: actorUserId,
      action: 'VENDOR_CREATED',
      resource: 'vendor',
      resourceId: vendor.id,
      newValue: vendor,
    });
    return vendor;
  }

  async update(actorUserId: string, id: string, data: UpdateVendorDto) {
    const existing = await this.prisma.vendor.findUnique({
      where: { id },
      select: vendorSelect,
    });
    if (!existing) throw new NotFoundException('Vendor not found');

    const vendor = await this.prisma.vendor.update({
      where: { id },
      data: {
        name: data.name,
        companyName: data.companyName,
        email: data.email,
        phone: data.phone,
        specialty: data.specialty,
        rating: data.rating,
        notes: data.notes,
      },
      select: vendorSelect,
    });
    await this.auditLogs.log({
      userId: actorUserId,
      action: 'VENDOR_UPDATED',
      resource: 'vendor',
      resourceId: vendor.id,
      oldValue: existing,
      newValue: vendor,
    });
    return vendor;
  }

  async remove(actorUserId: string, id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      select: vendorSelect,
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    if (vendor._count.maintenanceRequests > 0) {
      throw new ConflictException(
        'This vendor is assigned to maintenance requests and cannot be deleted',
      );
    }

    await this.prisma.vendor.delete({ where: { id } });
    await this.auditLogs.log({
      userId: actorUserId,
      action: 'VENDOR_DELETED',
      resource: 'vendor',
      resourceId: id,
      oldValue: vendor,
    });
    return { id };
  }
}
