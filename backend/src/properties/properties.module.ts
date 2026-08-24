import { Module } from '@nestjs/common';
import {
  PropertiesController,
  PublicRentalPropertiesController,
  RentalDashboardController,
} from './properties.controller';
import { PropertiesService } from './properties.service';
import { RentalPhotoService } from './rental-photo.service';

@Module({
  controllers: [
    PropertiesController,
    RentalDashboardController,
    PublicRentalPropertiesController,
  ],
  providers: [PropertiesService, RentalPhotoService],
})
export class PropertiesModule {}
