import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import {
  ESignatureDocumentType,
  ESignatureEnvelopeStatus,
  ESignatureTargetType,
} from '@prisma/client';

export class CreateESignatureDto {
  @IsUUID()
  clientRequestId!: string;

  @IsUUID()
  templateId!: string;

  @IsEnum(ESignatureDocumentType)
  documentType!: ESignatureDocumentType;

  @IsEnum(ESignatureTargetType)
  targetType!: ESignatureTargetType;

  @IsString()
  @Length(1, 64)
  targetId!: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  leaseId?: string;

  @IsString()
  @Length(1, 100)
  recipientRoleName!: string;

  @IsString()
  @Length(3, 200)
  title!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class ESignatureListQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @IsOptional()
  @IsEnum(ESignatureEnvelopeStatus)
  status?: ESignatureEnvelopeStatus;

  @IsOptional()
  @IsEnum(ESignatureDocumentType)
  documentType?: ESignatureDocumentType;

  @IsOptional()
  @IsEnum(ESignatureTargetType)
  targetType?: ESignatureTargetType;
}

export class ESignatureEventListQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}
