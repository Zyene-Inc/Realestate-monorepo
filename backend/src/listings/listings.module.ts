import { Module } from '@nestjs/common';
import {
  AdminSaleListingsController,
  AgentSaleListingsController,
  PublicSaleListingsController,
} from './sale-listings.controller';
import { SaleListingsService } from './sale-listings.service';
import { SaleListingAssetsService } from './sale-listing-assets.service';

@Module({
  controllers: [
    AgentSaleListingsController,
    AdminSaleListingsController,
    PublicSaleListingsController,
  ],
  providers: [SaleListingsService, SaleListingAssetsService],
})
export class ListingsModule {}
