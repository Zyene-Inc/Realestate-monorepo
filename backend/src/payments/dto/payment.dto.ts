import { PaymentStatus } from '@prisma/client';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNotEmpty,
  MaxLength,
  Min,
  IsUUID,
} from 'class-validator';

export class RecordPaymentDto {
  @IsUUID()
  clientRequestId: string;

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
  @Min(0)
  totalAmount: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  paidAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  lateFee?: number;

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
  @IsUUID()
  clientRequestId: string;

  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsNumber()
  @IsOptional()
  @Min(0)
  paidAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  lateFee?: number;

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

  @IsString()
  @IsOptional()
  adjustmentReason?: string;
}

export class RefundStripePaymentDto {
  @IsUUID()
  clientRequestId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  adjustmentReason: string;
}
