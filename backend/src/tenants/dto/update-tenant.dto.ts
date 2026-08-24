import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

const emptyStringToNull = ({ value }: { value: unknown }) =>
  value === '' ? null : value;

export class UpdateTenantDto {
  @IsOptional() @IsString() @Length(1, 80) firstName?: string;
  @IsOptional() @IsString() @Length(1, 80) lastName?: string;
  @Transform(emptyStringToNull)
  @IsOptional()
  @IsString()
  @Length(7, 32)
  phone?: string | null;
  @Transform(emptyStringToNull)
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string | null;
  @Transform(emptyStringToNull)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  emergencyContactName?: string | null;
  @Transform(emptyStringToNull)
  @IsOptional()
  @IsString()
  @Length(7, 32)
  emergencyContactPhone?: string | null;
  @Transform(emptyStringToNull)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  vehicleInfo?: string | null;
  @Transform(emptyStringToNull)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  petInfo?: string | null;
  @IsOptional()
  @IsIn(['invited', 'active', 'inactive'])
  status?: 'invited' | 'active' | 'inactive';
}

export class UpdateTenantProfileDto {
  @IsOptional() @IsString() @Length(1, 80) firstName?: string;
  @IsOptional() @IsString() @Length(1, 80) lastName?: string;
  @Transform(emptyStringToNull)
  @IsOptional()
  @IsString()
  @Length(7, 32)
  phone?: string | null;
  @Transform(emptyStringToNull)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  emergencyContactName?: string | null;
  @Transform(emptyStringToNull)
  @IsOptional()
  @IsString()
  @Length(7, 32)
  emergencyContactPhone?: string | null;
  @Transform(emptyStringToNull)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  vehicleInfo?: string | null;
  @Transform(emptyStringToNull)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  petInfo?: string | null;
}
