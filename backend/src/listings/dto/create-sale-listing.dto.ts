import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSaleListingDto {
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

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(9999999999.99)
  price!: number;

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
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  amenities?: string[];
}
