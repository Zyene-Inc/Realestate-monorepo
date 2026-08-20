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

export class AgentSignupDto {
  @IsEmail()
  @Transform(({ value }) => String(value).trim().toLowerCase())
  email: string;

  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password: string;

  @IsString()
  @Length(2, 120)
  @Transform(({ value }) => String(value).trim())
  companyName: string;

  @IsString()
  @Length(2, 120)
  @Transform(({ value }) => String(value).trim())
  contactName: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9().\-\s]{7,25}$/)
  @Transform(({ value }) => {
    const normalized = String(value ?? '').trim();
    return normalized || undefined;
  })
  phone?: string;
}
