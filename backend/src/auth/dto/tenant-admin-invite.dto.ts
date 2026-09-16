import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';
import { normalizeEmail, trimText } from './auth-input.transforms';

const SAFE_DISPLAY_TEXT = /^[^<>]+$/u;

export class TenantAdminInviteDto {
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
}
