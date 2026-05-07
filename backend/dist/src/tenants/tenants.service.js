"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let TenantsService = class TenantsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.tenant.findMany({
            include: { user: true, unit: true, leases: true },
        });
    }
    async findOne(id) {
        return this.prisma.tenant.findUnique({
            where: { id },
            include: { user: true, unit: true, leases: true, payments: true, maintenanceRequests: true },
        });
    }
    async create(data) {
        return this.prisma.tenant.create({
            data,
        });
    }
    async update(id, data) {
        return this.prisma.tenant.update({
            where: { id },
            data,
        });
    }
    async remove(id) {
        return this.prisma.tenant.delete({
            where: { id },
        });
    }
    async getDashboardData(userId) {
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
    async getMaintenanceRequests(userId) {
        const tenant = await this.prisma.tenant.findUnique({ where: { userId } });
        if (!tenant)
            return [];
        return this.prisma.maintenanceRequest.findMany({
            where: { tenantId: tenant.id },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createMaintenanceRequest(userId, data) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { userId },
            include: { unit: true }
        });
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant profile not found');
        }
        if (!tenant.unitId || !tenant.unit) {
            throw new common_1.NotFoundException('No active unit assignment found. Please contact management.');
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
    async getActiveLease(userId) {
        const tenant = await this.prisma.tenant.findUnique({ where: { userId } });
        if (!tenant)
            return null;
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
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map