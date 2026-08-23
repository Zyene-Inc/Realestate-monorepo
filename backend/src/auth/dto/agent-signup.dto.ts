import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  normalizeEmail,
  trimOptionalText,
  trimText,
} from './auth-input.transforms';

const SAFE_DISPLAY_TEXT = /^[^<>]+$/u;

export class AgentSignupDto {
  @IsEmail()
  @MaxLength(254)
  @Transform(normalizeEmail)
  email: string;

  @IsString()
  @MinLength(12)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'Password must include uppercase, lowercase, number, and symbol characters',
  })
  password: string;

  @IsString()
  @Length(2, 120)
  @Matches(SAFE_DISPLAY_TEXT)
  @Transform(trimText)
  companyName: string;

  @IsString()
  @Length(2, 120)
  @Matches(SAFE_DISPLAY_TEXT)
  @Transform(trimText)
  contactName: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9().\-\s]{7,25}$/)
  @Transform(trimOptionalText)
  phone?: string;
}
