import { IsIn, IsString, Length, MaxLength } from 'class-validator';

export class CreateAgentDocumentUploadDto {
  @IsString()
  @Length(1, 180)
  fileName!: string;

  @IsString()
  @IsIn(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
  contentType!: string;
}

export class AttachAgentDocumentDto {
  @IsString()
  @MaxLength(500)
  path!: string;
}
