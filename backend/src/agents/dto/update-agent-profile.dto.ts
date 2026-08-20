import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpdateAgentProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  companyName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
