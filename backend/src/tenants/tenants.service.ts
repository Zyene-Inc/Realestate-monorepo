import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tenant.findMany({
      include: { user: true, unit: true, leases: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: { user: true, unit: true, leases: true, payments: true, maintenanceRequests: true },
    });
  }

  async create(data: any) {
    return this.prisma.tenant.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.tenant.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.tenant.delete({
      where: { id },
    });
  }

  async getDashboardData(userId: string) {
    return this.prisma.tenant.findUnique({
      where: { userId },
      include: {
        unit: {
          include: { property: true },
        },
        leases: {
          where: { status: 'active' },
          take: 1,
        },
        maintenanceRequests: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  async getMaintenanceRequests(userId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { userId } });
    if (!tenant) return [];
    return this.prisma.maintenanceRequest.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMaintenanceRequest(userId: string, data: any) {
    const tenant = await this.prisma.tenant.findUnique({ 
      where: { userId },
      include: { unit: true }
    });
    
    if (!tenant) {
      throw new NotFoundException('Tenant profile not found');
    }

    if (!tenant.unitId || !tenant.unit) {
      throw new NotFoundException('No active unit assignment found. Please contact management.');
    }
    
    return this.prisma.maintenanceRequest.create({
      data: {
        category: data.category,
        priority: data.priority,
        description: data.description,
        tenantId: tenant.id,
        unitId: tenant.unitId,
        propertyId: tenant.unit.propertyId,
        status: 'submitted',
      },
    });
  }

  async getActiveLease(userId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { userId } });
    if (!tenant) return null;
    return this.prisma.lease.findFirst({
      where: { 
        tenantId: tenant.id,
        status: 'active'
      },
      include: {
        unit: {
          include: { property: true }
        }
      }
    });
  }
}
