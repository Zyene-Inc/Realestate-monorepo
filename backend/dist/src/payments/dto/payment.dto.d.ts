export declare enum PaymentStatus {
    PENDING = "PENDING",
    PAID = "PAID",
    OVERDUE = "OVERDUE",
    PARTIAL = "PARTIAL",
    WAIVED = "WAIVED",
    REFUNDED = "REFUNDED"
}
export declare class RecordPaymentDto {
    tenantId: string;
    leaseId: string;
    unitId: string;
    rentAmount: number;
    lateFee?: number;
    totalAmount: number;
    paidAmount?: number;
    paymentMethod?: string;
    referenceNumber?: string;
    dueDate: string;
    status?: PaymentStatus;
    notes?: string;
}
export declare class UpdatePaymentStatusDto {
    status: PaymentStatus;
    paidAmount?: number;
    paymentMethod?: string;
    referenceNumber?: string;
    notes?: string;
    receiptUrl?: string;
}
