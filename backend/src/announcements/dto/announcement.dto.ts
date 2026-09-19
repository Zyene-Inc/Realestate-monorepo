import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { AnnouncementAudience } from '@prisma/client';
import {
  trimOptionalText,
  trimText,
} from '../../auth/dto/auth-input.transforms';

const SAFE_DISPLAY_TEXT = /^[^<>]+$/u;

export class CreateAnnouncementDto {
  @Transform(trimText)
  @IsString()
  @Length(3, 140)
  @Matches(SAFE_DISPLAY_TEXT)
  title!: string;

  @Transform(trimText)
  @IsString()
  @Length(3, 5000)
  content!: string;

  @IsEnum(AnnouncementAudience)
  audience!: AnnouncementAudience;

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  requiresAcknowledgement!: boolean;

  @Transform(trimOptionalText)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  propertyId?: string;

  @Transform(trimOptionalText)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  unitId?: string;
}

export class UpdateAnnouncementDto {
  @Transform(trimOptionalText)
  @IsOptional()
  @IsString()
  @Length(3, 140)
  @Matches(SAFE_DISPLAY_TEXT)
  title?: string;

  @Transform(trimOptionalText)
  @IsOptional()
  @IsString()
  @Length(3, 5000)
  content?: string;
}
