import { IsIn, IsInt, IsString, Length, Matches, Min } from 'class-validator';

const LISTING_ASSET_KINDS = ['photo', 'document'] as const;
export type ListingAssetKind = (typeof LISTING_ASSET_KINDS)[number];

export class CreateListingUploadDto {
  @IsIn(LISTING_ASSET_KINDS)
  kind!: ListingAssetKind;

  @IsString()
  @Length(1, 180)
  fileName!: string;

  @IsString()
  @Matches(/^(image\/(jpeg|png|webp)|application\/pdf)$/)
  contentType!: string;
}

export class AttachListingAssetDto {
  @IsIn(LISTING_ASSET_KINDS)
  kind!: ListingAssetKind;

  @IsString()
  @Length(10, 500)
  path!: string;
}

export class ReorderListingPhotosDto {
  @IsInt()
  @Min(0)
  fromIndex!: number;

  @IsInt()
  @Min(0)
  toIndex!: number;
}
