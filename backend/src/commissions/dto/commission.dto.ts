import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { CommissionPaymentMethod, SaleCommissionStatus } from '@prisma/client';

const MONEY_PATTERN = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;

export class CreateSaleCommissionDto {
  @IsUUID() clientRequestId!: string;
  @IsString() @Length(1, 64) propertyId!: string;
  @IsOptional() @Matches(MONEY_PATTERN) salePrice?: string;
  @Matches(MONEY_PATTERN) commissionAmount!: string;
  @IsDateString() receivedAt!: string;
  @IsEnum(CommissionPaymentMethod)
  paymentMethod!: CommissionPaymentMethod;
  @IsOptional() @IsString() @Length(1, 100) referenceNumber?: string;
  @IsOptional() @IsString() @Length(1, 2000) notes?: string;
}

export class CorrectSaleCommissionDto {
  @IsOptional() @Matches(MONEY_PATTERN) salePrice?: string;
  @IsOptional() @Matches(MONEY_PATTERN) commissionAmount?: string;
  @IsOptional() @IsDateString() receivedAt?: string;
  @IsOptional()
  @IsEnum(CommissionPaymentMethod)
  paymentMethod?: CommissionPaymentMethod;
  @IsOptional() @IsString() @Length(1, 100) referenceNumber?: string;
  @IsOptional() @IsString() @Length(1, 2000) notes?: string;
  @IsString() @Length(3, 500) reason!: string;
}

export class VoidSaleCommissionDto {
  @IsString() @Length(3, 500) reason!: string;
}

export class SaleCommissionListQueryDto {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
  @IsOptional()
  @IsEnum(SaleCommissionStatus)
  status?: SaleCommissionStatus;
  @IsOptional() @IsString() @Length(1, 64) agentId?: string;
  @IsOptional() @IsString() @Length(1, 64) propertyId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class SaleCommissionReportQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class EligibleSaleListingQueryDto {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
}
