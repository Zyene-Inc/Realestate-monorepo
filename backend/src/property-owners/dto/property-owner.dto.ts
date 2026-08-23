import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const trimOptionalString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;
const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CreatePropertyOwnerDto {
  @IsOptional()
  @Transform(trimOptionalString)
  @IsString()
  @MaxLength(160)
  ownerName?: string;

  @IsOptional()
  @Transform(trimOptionalString)
  @IsString()
  @MaxLength(160)
  companyName?: string;

  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  contactEmail!: string;

  @IsOptional()
  @Transform(trimOptionalString)
  @IsString()
  @Length(7, 32)
  contactPhone?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionRate!: number;
}

export class UpdatePropertyOwnerDto {
  @IsOptional()
  @Transform(trimOptionalString)
  @IsString()
  @MaxLength(160)
  ownerName?: string;

  @IsOptional()
  @Transform(trimOptionalString)
  @IsString()
  @MaxLength(160)
  companyName?: string;

  @IsOptional()
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  contactEmail?: string;

  @IsOptional()
  @Transform(trimOptionalString)
  @IsString()
  @Length(7, 32)
  contactPhone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionRate?: number;
}
