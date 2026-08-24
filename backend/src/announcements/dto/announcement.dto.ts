import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
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
