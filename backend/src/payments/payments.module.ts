import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import {
  RentalBillingAdminController,
  RentalBillingCronController,
} from './rental-billing.controller';
import { RentalBillingService } from './rental-billing.service';
import { StripeWebhooksController } from './stripe-webhooks.controller';
import { RentalApplicationsModule } from '../rental-applications/rental-applications.module';
import { MoveInChargesController } from './move-in-charges.controller';
import { MoveInChargesService } from './move-in-charges.service';
import { MoveInPaymentsService } from './move-in-payments.service';
import { MoveInCheckoutService } from './move-in-checkout.service';
import { MoveInPaymentNotificationsService } from './move-in-payment-notifications.service';
import { MoveInStripeWebhookService } from './move-in-stripe-webhook.service';
import { StripePaymentLedgerService } from './stripe-payment-ledger.service';

@Module({
  imports: [RentalApplicationsModule],
  controllers: [
    PaymentsController,
    StripeWebhooksController,
    RentalBillingCronController,
    RentalBillingAdminController,
    MoveInChargesController,
  ],
  providers: [
    PaymentsService,
    RentalBillingService,
    MoveInChargesService,
    MoveInPaymentsService,
    MoveInCheckoutService,
    MoveInPaymentNotificationsService,
    MoveInStripeWebhookService,
    StripePaymentLedgerService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
