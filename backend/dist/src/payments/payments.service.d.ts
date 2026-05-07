import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
export declare enum PaymentStatus {
    PENDING = "PENDING",
    PAID = "PAID",
    OVERDUE = "OVERDUE",
    PARTIAL = "PARTIAL",
    WAIVED = "WAIVED",
    REFUNDED = "REFUNDED"
}
export declare class PaymentsService {
    private prisma;
    private auditLogs;
    constructor(prisma: PrismaService, auditLogs: AuditLogsService);
    findAll(): Promise<({
        unit: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            unitNumber: string;
            floor: string | null;
            bedrooms: number;
            bathrooms: number;
            squareFeet: number;
            rentAmount: number;
            depositAmount: number;
            availableDate: Date | null;
            propertyId: string;
        };
        tenant: {
            id: string;
            email: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            firstName: string;
            lastName: string;
            phone: string | null;
            dateOfBirth: Date | null;
            emergencyContactName: string | null;
            emergencyContactPhone: string | null;
            vehicleInfo: string | null;
            petInfo: string | null;
            userId: string | null;
            unitId: string | null;
        };
        lease: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            unitId: string;
            startDate: Date;
            endDate: Date;
            monthlyRent: number;
            rentDueDay: number;
            gracePeriodDays: number;
            lateFeeAmount: number;
            securityDeposit: number;
            leasePdfUrl: string | null;
            tenantId: string;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
        updatedAt: Date;
        rentAmount: number;
        unitId: string;
        tenantId: string;
        lateFee: number;
        totalAmount: number;
        paidAmount: number;
        balanceDue: number;
        paymentMethod: string | null;
        referenceNumber: string | null;
        paidAt: Date | null;
        dueDate: Date;
        receiptUrl: string | null;
        notes: string | null;
        stripeCustomerId: string | null;
        stripePaymentIntentId: string | null;
        leaseId: string;
    })[]>;
    findByTenant(tenantId: string): Promise<({
        unit: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            unitNumber: string;
            floor: string | null;
            bedrooms: number;
            bathrooms: number;
            squareFeet: number;
            rentAmount: number;
            depositAmount: number;
            availableDate: Date | null;
            propertyId: string;
        };
        lease: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            unitId: string;
            startDate: Date;
            endDate: Date;
            monthlyRent: number;
            rentDueDay: number;
            gracePeriodDays: number;
            lateFeeAmount: number;
            securityDeposit: number;
            leasePdfUrl: string | null;
            tenantId: string;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
        updatedAt: Date;
        rentAmount: number;
        unitId: string;
        tenantId: string;
        lateFee: number;
        totalAmount: number;
        paidAmount: number;
        balanceDue: number;
        paymentMethod: string | null;
        referenceNumber: string | null;
        paidAt: Date | null;
        dueDate: Date;
        receiptUrl: string | null;
        notes: string | null;
        stripeCustomerId: string | null;
        stripePaymentIntentId: string | null;
        leaseId: string;
    })[]>;
    findByUser(userId: string): Promise<({
        unit: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            unitNumber: string;
            floor: string | null;
            bedrooms: number;
            bathrooms: number;
            squareFeet: number;
            rentAmount: number;
            depositAmount: number;
            availableDate: Date | null;
            propertyId: string;
        };
        lease: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            unitId: string;
            startDate: Date;
            endDate: Date;
            monthlyRent: number;
            rentDueDay: number;
            gracePeriodDays: number;
            lateFeeAmount: number;
            securityDeposit: number;
            leasePdfUrl: string | null;
            tenantId: string;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
        updatedAt: Date;
        rentAmount: number;
        unitId: string;
        tenantId: string;
        lateFee: number;
        totalAmount: number;
        paidAmount: number;
        balanceDue: number;
        paymentMethod: string | null;
        referenceNumber: string | null;
        paidAt: Date | null;
        dueDate: Date;
        receiptUrl: string | null;
        notes: string | null;
        stripeCustomerId: string | null;
        stripePaymentIntentId: string | null;
        leaseId: string;
    })[]>;
    recordPayment(data: {
        tenantId: string;
        leaseId: string;
        unitId: string;
        rentAmount: number;
        lateFee?: number;
        totalAmount: number;
        paidAmount?: number;
        paymentMethod?: string;
        referenceNumber?: string;
        dueDate: Date;
        status?: PaymentStatus;
        notes?: string;
    }, userId?: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
        updatedAt: Date;
        rentAmount: number;
        unitId: string;
        tenantId: string;
        lateFee: number;
        totalAmount: number;
        paidAmount: number;
        balanceDue: number;
        paymentMethod: string | null;
        referenceNumber: string | null;
        paidAt: Date | null;
        dueDate: Date;
        receiptUrl: string | null;
        notes: string | null;
        stripeCustomerId: string | null;
        stripePaymentIntentId: string | null;
        leaseId: string;
    }>;
    updatePaymentStatus(paymentId: string, data: {
        status: PaymentStatus;
        paidAmount?: number;
        paymentMethod?: string;
        referenceNumber?: string;
        notes?: string;
        receiptUrl?: string;
    }, userId?: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
        updatedAt: Date;
        rentAmount: number;
        unitId: string;
        tenantId: string;
        lateFee: number;
        totalAmount: number;
        paidAmount: number;
        balanceDue: number;
        paymentMethod: string | null;
        referenceNumber: string | null;
        paidAt: Date | null;
        dueDate: Date;
        receiptUrl: string | null;
        notes: string | null;
        stripeCustomerId: string | null;
        stripePaymentIntentId: string | null;
        leaseId: string;
    }>;
    findOverdue(): Promise<({
        tenant: {
            id: string;
            email: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            firstName: string;
            lastName: string;
            phone: string | null;
            dateOfBirth: Date | null;
            emergencyContactName: string | null;
            emergencyContactPhone: string | null;
            vehicleInfo: string | null;
            petInfo: string | null;
            userId: string | null;
            unitId: string | null;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
        updatedAt: Date;
        rentAmount: number;
        unitId: string;
        tenantId: string;
        lateFee: number;
        totalAmount: number;
        paidAmount: number;
        balanceDue: number;
        paymentMethod: string | null;
        referenceNumber: string | null;
        paidAt: Date | null;
        dueDate: Date;
        receiptUrl: string | null;
        notes: string | null;
        stripeCustomerId: string | null;
        stripePaymentIntentId: string | null;
        leaseId: string;
    })[]>;
}
