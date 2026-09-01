import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  InspectionCondition,
  InspectionKeyType,
  InspectionMeterType,
  MoveInInspectionStatus,
} from '@prisma/client';

export class ListMoveInInspectionsDto {
  @IsOptional() @IsString() @MaxLength(80) cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) take = 25;
  @IsOptional() @IsEnum(MoveInInspectionStatus) status?: MoveInInspectionStatus;
  @IsOptional() @IsString() @MaxLength(80) leaseId?: string;
}

export class CreateMoveInInspectionDto {
  @IsString() @Length(10, 40) leaseId!: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
}

export class UpdateMoveInInspectionDto {
  @Type(() => Number) @IsInt() @Min(1) expectedRevision!: number;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsString() @MaxLength(5000) staffNotes?: string;
  @IsOptional() @IsBoolean() noPhysicalKeys?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) accessMethodNotes?: string;
}

export class InspectionRevisionDto {
  @Type(() => Number) @IsInt() @Min(1) expectedRevision!: number;
}

export class InspectionReasonDto extends InspectionRevisionDto {
  @IsString() @Length(3, 1000) reason!: string;
}

export class CreateInspectionAreaDto extends InspectionRevisionDto {
  @IsString() @Length(1, 100) name!: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(1000) sortOrder!: number;
}

export class UpdateInspectionAreaDto extends InspectionRevisionDto {
  @IsOptional() @IsString() @Length(1, 100) name?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

export class CreateInspectionItemDto extends InspectionRevisionDto {
  @IsString() @Length(10, 40) areaId!: string;
  @IsString() @Length(1, 120) name!: string;
  @IsOptional() @IsEnum(InspectionCondition) condition?: InspectionCondition;
  @IsOptional() @IsString() @MaxLength(2000) staffNotes?: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(1000) sortOrder!: number;
}

export class UpdateInspectionItemDto extends InspectionRevisionDto {
  @IsOptional() @IsString() @Length(1, 120) name?: string;
  @IsOptional() @IsEnum(InspectionCondition) condition?: InspectionCondition;
  @IsOptional() @IsString() @MaxLength(2000) staffNotes?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

export class TenantInspectionObservationDto extends InspectionRevisionDto {
  @IsOptional()
  @IsIn([
    InspectionCondition.EXCELLENT,
    InspectionCondition.GOOD,
    InspectionCondition.FAIR,
    InspectionCondition.POOR,
    InspectionCondition.DAMAGED,
    InspectionCondition.NOT_APPLICABLE,
  ])
  condition?: InspectionCondition;

  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class CreateInspectionMeterDto extends InspectionRevisionDto {
  @IsEnum(InspectionMeterType) type!: InspectionMeterType;
  @IsString() @Length(1, 100) label!: string;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(99999999999.999)
  reading!: number;
  @IsString() @Length(1, 30) unit!: string;
  @IsDateString() readAt!: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(1000) sortOrder!: number;
}

export class UpdateInspectionMeterDto extends InspectionRevisionDto {
  @IsOptional() @IsEnum(InspectionMeterType) type?: InspectionMeterType;
  @IsOptional() @IsString() @Length(1, 100) label?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(99999999999.999)
  reading?: number;
  @IsOptional() @IsString() @Length(1, 30) unit?: string;
  @IsOptional() @IsDateString() readAt?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

export class CreateInspectionKeyDto extends InspectionRevisionDto {
  @IsEnum(InspectionKeyType) type!: InspectionKeyType;
  @IsString() @Length(1, 100) label!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) quantity!: number;
  @IsOptional() @IsString() @MaxLength(100) identifier?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsDateString() handedOverAt?: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(1000) sortOrder!: number;
}

export class UpdateInspectionKeyDto extends InspectionRevisionDto {
  @IsOptional() @IsEnum(InspectionKeyType) type?: InspectionKeyType;
  @IsOptional() @IsString() @Length(1, 100) label?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;
  @IsOptional() @IsString() @MaxLength(100) identifier?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsDateString() handedOverAt?: string;
  @IsOptional() @IsBoolean() clearHandover?: boolean;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

export class InspectionPhotoUploadDto {
  @Type(() => Number) @IsInt() @Min(1) expectedRevision!: number;
  @IsString() @Length(1, 180) fileName!: string;
  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
  contentType!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(8 * 1024 * 1024) sizeBytes!: number;
}

export class AttachInspectionPhotoDto extends InspectionPhotoUploadDto {
  @IsString() @Length(20, 500) path!: string;
  @IsOptional() @IsString() @Length(10, 40) itemId?: string;
  @IsOptional() @IsString() @Length(10, 40) meterReadingId?: string;
  @IsOptional() @IsString() @MaxLength(240) caption?: string;
}

export class AcknowledgeMoveInInspectionDto extends InspectionRevisionDto {
  @IsBoolean() accepted!: boolean;
  @IsString() @Length(2, 160) typedName!: string;
  @IsOptional() @IsString() @MaxLength(3000) tenantNotes?: string;
}
