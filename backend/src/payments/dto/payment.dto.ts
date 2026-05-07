import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsNotEmpty, Min } from 'class-validator';
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  PARTIAL = 'PARTIAL',
  WAIVED = 'WAIVED',
  REFUNDED = 'REFUNDED',
}

export class RecordPaymentDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  leaseId: string;

  @IsString()
  @IsNotEmpty()
  unitId: string;

  @IsNumber()
  @Min(0)
  rentAmount: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  lateFee?: number;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  paidAmount?: number;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @IsDateString()
  dueDate: string;

  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsNumber()
  @IsOptional()
  @Min(0)
  paidAmount?: number;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  receiptUrl?: string;
}
