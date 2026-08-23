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
import { Type } from 'class-transformer';

export class CreatePropertyOwnerDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  ownerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  companyName?: string;

  @IsEmail()
  @MaxLength(254)
  contactEmail!: string;

  @IsOptional()
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
  @IsString()
  @MaxLength(160)
  ownerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  companyName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  contactEmail?: string;

  @IsOptional()
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
