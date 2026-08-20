import { IsString, Length } from 'class-validator';

export class RejectSaleListingDto {
  @IsString()
  @Length(3, 1000)
  reason!: string;
}
