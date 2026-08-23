import { Module } from '@nestjs/common';
import {
  PropertiesController,
  PublicRentalPropertiesController,
  RentalDashboardController,
} from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  controllers: [
    PropertiesController,
    RentalDashboardController,
    PublicRentalPropertiesController,
  ],
  providers: [PropertiesService],
})
export class PropertiesModule {}
