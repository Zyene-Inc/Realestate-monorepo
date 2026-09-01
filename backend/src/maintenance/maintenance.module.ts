import { Module } from '@nestjs/common';
import {
  MaintenanceController,
  TenantMaintenanceController,
} from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceExpenseLedgerService } from './maintenance-expense-ledger.service';

@Module({
  controllers: [MaintenanceController, TenantMaintenanceController],
  providers: [MaintenanceService, MaintenanceExpenseLedgerService],
  exports: [MaintenanceExpenseLedgerService],
})
export class MaintenanceModule {}
