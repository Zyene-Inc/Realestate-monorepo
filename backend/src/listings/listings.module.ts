import { Module } from '@nestjs/common';
import {
  AdminSaleListingsController,
  AgentSaleListingsController,
  PublicSaleListingsController,
} from './sale-listings.controller';
import { SaleListingsService } from './sale-listings.service';

@Module({
  controllers: [
    AgentSaleListingsController,
    AdminSaleListingsController,
    PublicSaleListingsController,
  ],
  providers: [SaleListingsService],
})
export class ListingsModule {}
