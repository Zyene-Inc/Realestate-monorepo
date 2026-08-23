import { Type } from 'class-transformer';
import {
  IsDateString,
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

const CATEGORIES = [
  'plumbing',
  'electrical',
  'hvac',
  'appliance',
  'pest',
  'structural',
  'other',
] as const;
const PRIORITIES = ['low', 'medium', 'high', 'emergency'] as const;
const STATUSES = [
  'submitted',
  'reviewed',
  'assigned',
  'scheduled',
  'in_progress',
  'completed',
  'tenant_confirmed',
] as const;

export class CreateMaintenanceRequestDto {
  @IsIn(CATEGORIES) category!: (typeof CATEGORIES)[number];
  @IsIn(PRIORITIES) priority!: (typeof PRIORITIES)[number];
  @IsString() @Length(10, 4000) description!: string;
  @IsOptional() @IsString() @MaxLength(1000) preferredAccessTimes?: string;
}

export class UpdateMaintenanceRequestDto {
  @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
  @IsOptional() @IsString() @Length(1, 64) assignedVendorId?: string;
  @IsOptional() @IsDateString() scheduledDate?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(9999999999.99)
  cost?: number;
  @IsOptional() @IsString() @MaxLength(4000) adminNotes?: string;
}

export class MaintenancePhotoUploadDto {
  @IsString() @Length(1, 180) fileName!: string;
  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType!: string;
}

export class AttachMaintenancePhotoDto {
  @IsString() @Length(10, 500) path!: string;
}

export class MaintenanceListQueryDto {
  @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
