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
exports.PaymentsService = exports.PaymentStatus = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["PAID"] = "PAID";
    PaymentStatus["OVERDUE"] = "OVERDUE";
    PaymentStatus["PARTIAL"] = "PARTIAL";
    PaymentStatus["WAIVED"] = "WAIVED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
let PaymentsService = class PaymentsService {
    prisma;
    auditLogs;
    constructor(prisma, auditLogs) {
        this.prisma = prisma;
        this.auditLogs = auditLogs;
    }
    async findAll() {
        return this.prisma.payment.findMany({
            include: { tenant: true, lease: true, unit: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findByTenant(tenantId) {
        return this.prisma.payment.findMany({
            where: { tenantId },
            include: { lease: true, unit: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findByUser(userId) {
        const tenant = await this.prisma.tenant.findUnique({ where: { userId } });
        if (!tenant)
            return [];
        return this.findByTenant(tenant.id);
    }
    async recordPayment(data, userId) {
        if (data.referenceNumber) {
            const existing = await this.prisma.payment.findFirst({
                where: { referenceNumber: data.referenceNumber },
            });
            if (existing) {
                throw new common_1.BadRequestException(`Payment with reference number ${data.referenceNumber} already exists`);
            }
        }
        const paidAmount = data.paidAmount || 0;
        const balanceDue = Math.max(0, data.totalAmount - paidAmount);
        let status = data.status || PaymentStatus.PENDING;
        if (paidAmount >= data.totalAmount) {
            status = PaymentStatus.PAID;
        }
        else if (paidAmount > 0) {
            status = PaymentStatus.PARTIAL;
        }
        const payment = await this.prisma.payment.create({
            data: {
                ...data,
                paidAmount,
                balanceDue,
                status,
                paidAt: status === PaymentStatus.PAID ? new Date() : null,
            },
        });
        await this.auditLogs.log({
            userId,
            action: 'PAYMENT_RECORDED',
            resource: 'payment',
            resourceId: payment.id,
            newValue: JSON.stringify(payment),
        });
        return payment;
    }
    async updatePaymentStatus(paymentId, data, userId) {
        const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment)
            throw new common_1.NotFoundException('Payment not found');
        const paidAmount = data.paidAmount !== undefined ? data.paidAmount : payment.paidAmount;
        const balanceDue = Math.max(0, payment.totalAmount - paidAmount);
        const updatedPayment = await this.prisma.payment.update({
            where: { id: paymentId },
            data: {
                ...data,
                paidAmount,
                balanceDue,
                paidAt: data.status === PaymentStatus.PAID ? new Date() : payment.paidAt,
            },
        });
        await this.auditLogs.log({
            userId,
            action: 'PAYMENT_UPDATED',
            resource: 'payment',
            resourceId: paymentId,
            oldValue: JSON.stringify(payment),
            newValue: JSON.stringify(updatedPayment),
        });
        return updatedPayment;
    }
    async findOverdue() {
        return this.prisma.payment.findMany({
            where: {
                status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
                dueDate: { lt: new Date() },
            },
            include: { tenant: true },
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_logs_service_1.AuditLogsService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map