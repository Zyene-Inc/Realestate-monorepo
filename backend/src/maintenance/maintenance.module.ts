import { Module } from '@nestjs/common';
import {
  MaintenanceController,
  TenantMaintenanceController,
} from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

@Module({
  controllers: [MaintenanceController, TenantMaintenanceController],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
