import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsArray,
  ArrayMinSize,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  InspectionCondition,
  MoveOutTurnoverStatus,
  NoticeToVacateSource,
  SecurityDepositDeductionCategory,
  SecurityDepositReturnMethod,
} from '@prisma/client';

export class CreateRenewalDto {
  @IsDateString() proposedStartDate!: string;
  @IsDateString() proposedEndDate!: string;
  @Type(() => Number) @IsNumber() @Min(0) proposedMonthlyRent!: number;
  @Type(() => Number) @IsNumber() @Min(0) proposedSecurityDeposit!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(28) proposedRentDueDay!: number;
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  proposedGracePeriodDays!: number;
  @Type(() => Number) @IsNumber() @Min(0) proposedLateFeeAmount!: number;
  @IsDateString() offerExpiresAt!: string;
  @IsOptional() @IsString() @MaxLength(4000) internalNotes?: string;
}

export class CreateVacateNoticeDto {
  @IsOptional() @IsEnum(NoticeToVacateSource) source?: NoticeToVacateSource;
  @IsDateString() noticeDate!: string;
  @IsDateString() plannedMoveOutDate!: string;
  @IsOptional() @IsString() @MaxLength(4000) reason?: string;
  @IsString() @Length(10, 1000) forwardingAddress!: string;
}

export class ScheduleMoveOutInspectionDto {
  @IsDateString() scheduledAt!: string;
}

export class MoveOutInspectionItemDto {
  @IsString() @Length(1, 64) id!: string;
  @IsEnum(InspectionCondition) condition!: InspectionCondition;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(9999999999.99)
  estimatedCost!: number;
}

export class CompleteMoveOutInspectionDto {
  @Type(() => Number) @IsInt() @Min(1) expectedRevision!: number;
  @IsDateString() actualMoveOutAt!: string;
  @IsEnum(MoveOutTurnoverStatus) turnoverStatus!: MoveOutTurnoverStatus;
  @IsBoolean() keysReturned!: boolean;
  @IsOptional() @IsString() @MaxLength(4000) staffNotes?: string;
  @IsString() @Length(10, 1000) forwardingAddress!: string;
  @Type(() => MoveOutInspectionItemDto)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  items!: MoveOutInspectionItemDto[];
}

export class AcknowledgeMoveOutInspectionDto {
  @IsOptional() @IsString() @MaxLength(4000) tenantNotes?: string;
}

export class LifecycleReasonDto {
  @IsString() @Length(3, 2000) reason!: string;
}

export class CreateDepositDeductionDto {
  @IsEnum(SecurityDepositDeductionCategory)
  category!: SecurityDepositDeductionCategory;
  @IsString() @Length(3, 2000) description!: string;
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(9999999999.99)
  amount!: number;
}

export class IssueDepositReturnDto {
  @IsEnum(SecurityDepositReturnMethod)
  returnMethod!: SecurityDepositReturnMethod;
  @IsString() @Length(2, 200) returnReference!: string;
  @IsOptional() @IsString() @MaxLength(4000) internalNotes?: string;
  @IsUUID() requestId!: string;
}

export class DepositProofUploadDto {
  @IsString() @Length(1, 180) fileName!: string;
  @IsString()
  @Length(3, 100)
  contentType!: string;
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  sizeBytes!: number;
}

export class AttachDepositProofDto extends DepositProofUploadDto {
  @IsString() @Length(10, 500) path!: string;
}

export class LifecycleListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit = 100;
}
