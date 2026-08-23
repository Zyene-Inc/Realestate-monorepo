import { IsIn } from 'class-validator';

export class UpdateListingAvailabilityDto {
  @IsIn(['active', 'sold'])
  status!: 'active' | 'sold';
}
