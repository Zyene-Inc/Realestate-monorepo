import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class RentalPropertyDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  ownerId?: string;

  @IsString()
  @Length(2, 160)
  name!: string;

  @IsString()
  @Length(3, 200)
  address!: string;

  @IsString()
  @Length(2, 100)
  city!: string;

  @IsString()
  @Length(2, 50)
  state!: string;

  @IsString()
  @Length(3, 12)
  zip!: string;

  @IsString()
  @Length(2, 80)
  propertyType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  rentAmount?: number;

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
  @IsDateString()
  availabilityDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  amenities?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  utilityInfo?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  photos?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  documents?: string[];

  @IsOptional()
  @IsString()
  @Length(2, 40)
  status?: string;
}

export class UpdateRentalPropertyDto {
  @IsOptional() @IsString() @MaxLength(40) ownerId?: string;
  @IsOptional() @IsString() @Length(2, 160) name?: string;
  @IsOptional() @IsString() @Length(3, 200) address?: string;
  @IsOptional() @IsString() @Length(2, 100) city?: string;
  @IsOptional() @IsString() @Length(2, 50) state?: string;
  @IsOptional() @IsString() @Length(3, 12) zip?: string;
  @IsOptional() @IsString() @Length(2, 80) propertyType?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  rentAmount?: number;
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
  @IsOptional() @IsDateString() availabilityDate?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  amenities?: string[];
  @IsOptional() @IsString() @MaxLength(2000) utilityInfo?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  photos?: string[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  documents?: string[];
  @IsOptional() @IsString() @Length(2, 40) status?: string;
}
