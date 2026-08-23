import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

const SAFE_DISPLAY_TEXT = /^[^<>]+$/u;

function trimString({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateAgentProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  @Matches(SAFE_DISPLAY_TEXT)
  @Transform(trimString)
  companyName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  @Matches(SAFE_DISPLAY_TEXT)
  @Transform(trimString)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^(?:|\+?[0-9().\-\s]{7,25})$/)
  @Transform(trimString)
  phone?: string;
}
