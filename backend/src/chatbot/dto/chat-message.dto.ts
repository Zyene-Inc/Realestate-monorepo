import { IsString, Length, MaxLength } from 'class-validator';

export class SendChatMessageDto {
  @IsString()
  @Length(1, 1000)
  message!: string;

  @IsString()
  @MaxLength(0)
  website!: string;
}
