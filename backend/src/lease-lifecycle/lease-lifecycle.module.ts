import { Module } from '@nestjs/common';
import { ESignaturesModule } from '../e-signatures/e-signatures.module';
import { AdminLeaseLifecycleController } from './admin-lease-lifecycle.controller';
import { LeaseLifecycleService } from './lease-lifecycle.service';
import { TenantLeaseLifecycleController } from './tenant-lease-lifecycle.controller';
import { LeaseLifecycleNotificationsService } from './lease-lifecycle-notifications.service';
import { LeaseMoveOutService } from './lease-move-out.service';
import { LeaseDepositService } from './lease-deposit.service';
import { LeaseDepositProofService } from './lease-deposit-proof.service';
import { LeaseRenewalService } from './lease-renewal.service';

@Module({
  imports: [ESignaturesModule],
  controllers: [AdminLeaseLifecycleController, TenantLeaseLifecycleController],
  providers: [
    LeaseLifecycleService,
    LeaseRenewalService,
    LeaseMoveOutService,
    LeaseDepositService,
    LeaseDepositProofService,
    LeaseLifecycleNotificationsService,
  ],
})
export class LeaseLifecycleModule {}
