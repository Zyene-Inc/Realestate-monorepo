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
  Min,
} from 'class-validator';

const UNIT_STATUSES = [
  'vacant',
  'occupied',
  'under_maintenance',
  'off_market',
] as const;

export class CreateUnitDto {
  @IsString() @Length(1, 64) propertyId!: string;
  @IsString() @Length(1, 40) unitNumber!: string;
  @IsOptional() @IsString() @Length(1, 40) floor?: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(100) bedrooms!: number;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(100)
  bathrooms!: number;
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000000)
  squareFeet!: number;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  rentAmount!: number;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  depositAmount!: number;
  @IsOptional() @IsIn(UNIT_STATUSES) status?: (typeof UNIT_STATUSES)[number];
  @IsOptional() @IsDateString() availableDate?: string;
}

export class UpdateUnitDto {
  @IsOptional() @IsString() @Length(1, 64) propertyId?: string;
  @IsOptional() @IsString() @Length(1, 40) unitNumber?: string;
  @IsOptional() @IsString() @Length(1, 40) floor?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  bedrooms?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(100)
  bathrooms?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000000)
  squareFeet?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  rentAmount?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  depositAmount?: number;
  @IsOptional() @IsIn(UNIT_STATUSES) status?: (typeof UNIT_STATUSES)[number];
  @IsOptional() @IsDateString() availableDate?: string;
}
