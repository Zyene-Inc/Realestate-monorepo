import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';
import { normalizeEmail, trimText } from './auth-input.transforms';

const SAFE_DISPLAY_TEXT = /^[^<>]+$/u;

export class TenantInviteDto {
  @IsEmail()
  @MaxLength(254)
  @Transform(normalizeEmail)
  email!: string;

  @IsString()
  @Length(1, 80)
  @Matches(SAFE_DISPLAY_TEXT)
  @Transform(trimText)
  firstName!: string;

  @IsString()
  @Length(1, 80)
  @Matches(SAFE_DISPLAY_TEXT)
  @Transform(trimText)
  lastName!: string;

  @IsString()
  @Length(1, 64)
  @Matches(/^[A-Za-z0-9_-]+$/)
  unitId!: string;
}
