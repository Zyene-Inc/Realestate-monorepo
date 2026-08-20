import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class DeclineAgentDto {
  @IsString()
  @Length(3, 500)
  @Transform(({ value }) => String(value).trim())
  reason: string;
}
