import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  RentalApplicationDocumentStatus,
  RentalApplicationDocumentType,
  RentalApplicationStatus,
} from '@prisma/client';

export class CreateRentalApplicationDto {
  @IsString() @Length(10, 40) propertyId!: string;
  @IsOptional() @IsString() @Length(10, 40) unitId?: string;
  @IsString() @Length(1, 80) firstName!: string;
  @IsString() @Length(1, 80) lastName!: string;
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @Length(7, 30) phone!: string;
  @IsDateString() dateOfBirth!: string;
  @IsString() @Length(3, 200) currentAddress!: string;
  @IsString() @Length(2, 100) currentCity!: string;
  @IsString() @Length(2, 50) currentState!: string;
  @IsString() @Length(3, 12) currentZip!: string;
  @IsDateString() moveInDate!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(20) householdSize!: number;
  @IsOptional() @IsString() @MaxLength(1500) occupantsDescription?: string;
  @IsOptional() @IsString() @MaxLength(1500) petsDescription?: string;
  @IsString() @Length(2, 80) employmentStatus!: string;
  @IsOptional() @IsString() @MaxLength(160) employerName?: string;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  monthlyGrossIncome!: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  additionalIncome?: number;
  @IsOptional() @IsString() @MaxLength(3000) rentalHistory?: string;
  @IsOptional() @IsString() @MaxLength(160) priorLandlordName?: string;
  @IsOptional() @IsEmail() @MaxLength(254) priorLandlordEmail?: string;
  @IsOptional() @IsString() @MaxLength(30) priorLandlordPhone?: string;
}

export class UpdateRentalApplicationDto {
  @IsOptional() @IsString() @Length(1, 80) firstName?: string;
  @IsOptional() @IsString() @Length(1, 80) lastName?: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsString() @Length(7, 30) phone?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() @Length(3, 200) currentAddress?: string;
  @IsOptional() @IsString() @Length(2, 100) currentCity?: string;
  @IsOptional() @IsString() @Length(2, 50) currentState?: string;
  @IsOptional() @IsString() @Length(3, 12) currentZip?: string;
  @IsOptional() @IsDateString() moveInDate?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  householdSize?: number;
  @IsOptional() @IsString() @MaxLength(1500) occupantsDescription?: string;
  @IsOptional() @IsString() @MaxLength(1500) petsDescription?: string;
  @IsOptional() @IsString() @Length(2, 80) employmentStatus?: string;
  @IsOptional() @IsString() @MaxLength(160) employerName?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  monthlyGrossIncome?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  additionalIncome?: number;
  @IsOptional() @IsString() @MaxLength(3000) rentalHistory?: string;
  @IsOptional() @IsString() @MaxLength(160) priorLandlordName?: string;
  @IsOptional() @IsEmail() @MaxLength(254) priorLandlordEmail?: string;
  @IsOptional() @IsString() @MaxLength(30) priorLandlordPhone?: string;
  @IsDateString() expectedUpdatedAt!: string;
}

export class ExchangeRentalApplicationSessionDto {
  @IsString() @Length(10, 40) applicationId!: string;
  @IsString() @Length(32, 100) accessToken!: string;
}

export class CreateApplicationDocumentUploadDto {
  @IsEnum(RentalApplicationDocumentType)
  type!: RentalApplicationDocumentType;
  @IsString() @Length(1, 180) fileName!: string;
  @IsString()
  @IsIn(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
  contentType!: string;
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  sizeBytes!: number;
}

export class AttachApplicationDocumentDto extends CreateApplicationDocumentUploadDto {
  @IsString() @Length(20, 500) path!: string;
}

export class SubmitRentalApplicationDto {
  @IsBoolean() certified!: boolean;
  @IsDateString() expectedUpdatedAt!: string;
}

export class ListRentalApplicationsDto {
  @IsOptional() @IsString() @MaxLength(80) cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) take = 25;
  @IsOptional()
  @IsEnum(RentalApplicationStatus)
  status?: RentalApplicationStatus;
  @IsOptional() @IsString() @MaxLength(80) assignedToUserId?: string;
  @IsOptional() @IsString() @MaxLength(160) search?: string;
}

export class UpdateRentalApplicationWorkflowDto {
  @IsOptional()
  @IsEnum(RentalApplicationStatus)
  status?: RentalApplicationStatus;
  @IsOptional() @IsString() @MaxLength(80) assignedToUserId?: string;
  @IsOptional() @IsBoolean() clearAssignment?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) decisionReason?: string;
  @IsDateString() expectedUpdatedAt!: string;
}

export class ReviewRentalApplicationDocumentDto {
  @IsEnum(RentalApplicationDocumentStatus)
  status!: RentalApplicationDocumentStatus;
  @IsOptional() @IsString() @MaxLength(1000) rejectionReason?: string;
}

export class CreateRentalApplicationNoteDto {
  @IsString() @Length(1, 3000) body!: string;
}

export class StartRentalApplicationHandoffDto {
  @IsUUID()
  clientRequestId!: string;

  @IsString()
  @Length(1, 64)
  unitId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monthlyRent!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  securityDeposit!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(28)
  rentDueDay!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  gracePeriodDays!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  lateFeeAmount!: number;

  @IsUUID()
  templateId!: string;

  @IsString()
  @Length(1, 100)
  recipientRoleName!: string;

  @IsString()
  @Length(3, 200)
  title!: string;
}
