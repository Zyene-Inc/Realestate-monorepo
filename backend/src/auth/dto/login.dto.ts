import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizeEmail } from './auth-input.transforms';

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  @Transform(normalizeEmail)
  email!: string;

  // Passwords are validated but never trimmed or otherwise transformed because
  // whitespace may be an intentional part of a user's password.
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsIn(['admin', 'agent', 'tenant'])
  portal?: 'admin' | 'agent' | 'tenant';
}
