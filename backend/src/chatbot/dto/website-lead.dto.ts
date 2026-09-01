import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  WebsiteLeadIntent,
  WebsiteLeadScreeningStatus,
  WebsiteLeadStatus,
  WebsiteLeadTourStatus,
} from '@prisma/client';

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

export class CreateWebsiteContactLeadDto extends CreateWebsiteLeadDto {
  @IsString()
  @Length(2, 100)
  name!: string;

  @IsEnum(WebsiteLeadIntent)
  intent!: WebsiteLeadIntent;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  propertyId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  unitId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  moveInDate?: string;
}

export class UpdateWebsiteLeadWorkflowDto {
  @IsOptional()
  @IsEnum(WebsiteLeadStatus)
  status?: WebsiteLeadStatus;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  assignedToUserId?: string | null;

  @IsOptional()
  @IsEnum(WebsiteLeadScreeningStatus)
  screeningStatus?: WebsiteLeadScreeningStatus;

  @IsOptional()
  @IsString()
  @Length(1, 4000)
  screeningSummary?: string | null;

  @IsOptional()
  @IsEnum(WebsiteLeadTourStatus)
  tourStatus?: WebsiteLeadTourStatus;

  @IsOptional()
  @IsISO8601({ strict: true })
  tourScheduledAt?: string | null;

  @IsISO8601({ strict: true })
  expectedUpdatedAt!: string;
}

export class CreateWebsiteLeadNoteDto {
  @IsString()
  @Length(1, 4000)
  body!: string;
}
