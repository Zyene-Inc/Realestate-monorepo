import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { InquiryStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CursorPageDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateListingInquiryDto {
  @IsString()
  @Length(2, 120)
  buyerName!: string;

  @IsEmail()
  @MaxLength(254)
  buyerEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  buyerPhone?: string;

  @IsString()
  @Length(5, 4000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(0)
  website?: string;
}

export class BuyerInquiryAccessDto extends CursorPageDto {}

export class BuyerInquiryReplyDto extends BuyerInquiryAccessDto {
  @IsString()
  @Length(1, 4000)
  message!: string;
}

export class AgentInquiryReplyDto {
  @IsString()
  @Length(1, 4000)
  message!: string;
}

export class UpdateInquiryStatusDto {
  @IsEnum(InquiryStatus)
  status!: InquiryStatus;
}
