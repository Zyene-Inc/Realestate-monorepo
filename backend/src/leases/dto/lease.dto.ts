import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';

const LEASE_STATUSES = ['active', 'expiring'] as const;

export class CreateLeaseDto {
  @IsString() @Length(1, 64) tenantId!: string;
  @IsString() @Length(1, 64) unitId!: string;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @Type(() => Number) @IsNumber() @Min(0) monthlyRent!: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(28)
  rentDueDay?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  gracePeriodDays?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) lateFeeAmount?: number;
  @Type(() => Number) @IsNumber() @Min(0) securityDeposit!: number;
  @IsOptional() @IsUrl({ require_protocol: true }) leasePdfUrl?: string;
}

export class UpdateLeaseDto {
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) monthlyRent?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(28)
  rentDueDay?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  gracePeriodDays?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) lateFeeAmount?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  securityDeposit?: number;
  @IsOptional() @IsUrl({ require_protocol: true }) leasePdfUrl?: string;
  @IsOptional() @IsIn(LEASE_STATUSES) status?: (typeof LEASE_STATUSES)[number];
}
