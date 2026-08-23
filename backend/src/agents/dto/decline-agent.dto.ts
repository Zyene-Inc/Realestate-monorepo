import { Transform, type TransformFnParams } from 'class-transformer';
import { IsString, Length } from 'class-validator';

function trimReason({ value }: TransformFnParams): unknown {
  const input: unknown = value;
  return typeof input === 'string' ? input.trim() : input;
}

export class DeclineAgentDto {
  @IsString()
  @Length(3, 500)
  @Transform(trimReason)
  reason: string;
}
