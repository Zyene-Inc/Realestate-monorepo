import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  MoveInChargeCategory,
  MoveInChargePayoutTreatment,
  MoveInChargeStatus,
} from '@prisma/client';

export class CreateMoveInChargeItemDto {
  @IsUUID()
  clientRequestId!: string;

  @IsEnum(MoveInChargeCategory)
  category!: MoveInChargeCategory;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsDateString()
  dueDate!: string;

  @IsEnum(MoveInChargePayoutTreatment)
  payoutTreatment!: MoveInChargePayoutTreatment;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class CreateMoveInChargesDto {
  @IsString()
  @Length(1, 64)
  leaseId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateMoveInChargeItemDto)
  charges!: CreateMoveInChargeItemDto[];
}

export enum MoveInChargeAdjustmentAction {
  UPDATE = 'UPDATE',
  WAIVE = 'WAIVE',
  VOID = 'VOID',
}

export class AdjustMoveInChargeDto {
  @IsUUID()
  clientRequestId!: string;

  @IsEnum(MoveInChargeAdjustmentAction)
  action!: MoveInChargeAdjustmentAction;

  @IsString()
  @Length(3, 1000)
  reason!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(MoveInChargePayoutTreatment)
  payoutTreatment?: MoveInChargePayoutTreatment;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class MoveInPaymentAllocationDto {
  @IsString()
  @Length(1, 64)
  chargeId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;
}

export class RecordMoveInPaymentDto {
  @IsUUID()
  clientRequestId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MoveInPaymentAllocationDto)
  allocations!: MoveInPaymentAllocationDto[];

  @IsString()
  @IsIn(['cash', 'check', 'ach', 'zelle', 'bank_transfer', 'other'])
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class StartMoveInCheckoutDto {
  @IsUUID()
  clientRequestId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  chargeIds!: string[];
}

export class ListMoveInChargesDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  leaseId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  tenantId?: string;

  @IsOptional()
  @IsEnum(MoveInChargeStatus)
  status?: MoveInChargeStatus;
}
