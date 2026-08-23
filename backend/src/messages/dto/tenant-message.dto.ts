import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class TenantMessagePageDto {
  @IsOptional() @IsString() @MaxLength(64) cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class SendTenantMessageDto {
  @IsOptional() @IsString() @Length(1, 160) subject?: string;
  @IsString() @Length(1, 4000) body!: string;
}
