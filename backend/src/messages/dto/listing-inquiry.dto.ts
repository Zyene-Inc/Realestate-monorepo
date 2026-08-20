import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { InquiryStatus } from '@prisma/client';

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

export class BuyerInquiryAccessDto {
  @IsString()
  @Length(32, 200)
  accessToken!: string;
}

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
