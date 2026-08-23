import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { WebsiteLeadStatus } from '@prisma/client';

export class CreateWebsiteLeadDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @Length(5, 4000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(0)
  website?: string;
}

export class UpdateWebsiteLeadStatusDto {
  @IsEnum(WebsiteLeadStatus)
  status!: WebsiteLeadStatus;
}
