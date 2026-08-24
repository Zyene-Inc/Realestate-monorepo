import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  normalizeEmail,
  trimOptionalText,
  trimText,
} from '../../auth/dto/auth-input.transforms';

const SAFE_DISPLAY_TEXT = /^[^<>]+$/u;

export class CreateVendorDto {
  @Transform(trimText)
  @IsString()
  @Length(2, 120)
  @Matches(SAFE_DISPLAY_TEXT)
  name!: string;

  @Transform(trimOptionalText)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(SAFE_DISPLAY_TEXT)
  companyName?: string;

  @Transform(normalizeEmail)
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @Transform(trimOptionalText)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @Transform(trimOptionalText)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(SAFE_DISPLAY_TEXT)
  specialty?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(5)
  rating?: number;

  @Transform(trimOptionalText)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateVendorDto {
  @Transform(trimOptionalText)
  @IsOptional()
  @IsString()
  @Length(2, 120)
  @Matches(SAFE_DISPLAY_TEXT)
  name?: string;

  @Transform(trimOptionalText)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(SAFE_DISPLAY_TEXT)
  companyName?: string;

  @Transform(normalizeEmail)
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @Transform(trimOptionalText)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @Transform(trimOptionalText)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(SAFE_DISPLAY_TEXT)
  specialty?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(5)
  rating?: number;

  @Transform(trimOptionalText)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
