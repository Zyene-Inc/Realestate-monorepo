import { Global, Module } from '@nestjs/common';
import { StripeClient } from './stripe-client.service';

@Global()
@Module({
  providers: [StripeClient],
  exports: [StripeClient],
})
export class StripeModule {}
