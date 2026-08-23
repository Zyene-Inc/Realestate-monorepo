import { Module } from '@nestjs/common';
import { SaleCommissionsController } from './sale-commissions.controller';
import { SaleCommissionsService } from './sale-commissions.service';

@Module({
  controllers: [SaleCommissionsController],
  providers: [SaleCommissionsService],
  exports: [SaleCommissionsService],
})
export class CommissionsModule {}
