import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import {
  RentalBillingAdminController,
  RentalBillingCronController,
} from './rental-billing.controller';
import { RentalBillingService } from './rental-billing.service';
import { StripeWebhooksController } from './stripe-webhooks.controller';

@Module({
  controllers: [
    PaymentsController,
    StripeWebhooksController,
    RentalBillingCronController,
    RentalBillingAdminController,
  ],
  providers: [PaymentsService, RentalBillingService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
