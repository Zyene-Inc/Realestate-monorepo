import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class UpdateTenantDto {
  @IsOptional() @IsString() @Length(1, 80) firstName?: string;
  @IsOptional() @IsString() @Length(1, 80) lastName?: string;
  @IsOptional() @IsString() @Length(7, 32) phone?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() @MaxLength(160) emergencyContactName?: string;
  @IsOptional() @IsString() @Length(7, 32) emergencyContactPhone?: string;
  @IsOptional() @IsString() @MaxLength(500) vehicleInfo?: string;
  @IsOptional() @IsString() @MaxLength(500) petInfo?: string;
  @IsOptional()
  @IsIn(['invited', 'active', 'inactive'])
  status?: 'invited' | 'active' | 'inactive';
}
