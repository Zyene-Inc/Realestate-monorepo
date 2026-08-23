import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { StripeClient } from '../stripe/stripe-client.service';
import { PaymentsService } from './payments.service';

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller('stripe')
export class StripeWebhooksController {
  constructor(
    private readonly stripe: StripeClient,
    private readonly payments: PaymentsService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  async receive(
    @Req() request: RawBodyRequest,
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!request.rawBody) {
      throw new BadRequestException('Stripe webhook body was not preserved');
    }
    const event = this.stripe.verifyWebhook(request.rawBody, signature);
    return this.payments.processStripeWebhook(event);
  }

  @Post('connect-webhook')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  async receiveConnect(
    @Req() request: RawBodyRequest,
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!request.rawBody) {
      throw new BadRequestException('Stripe webhook body was not preserved');
    }
    const event = this.stripe.verifyConnectWebhook(request.rawBody, signature);
    return this.payments.processStripeConnectWebhook(event);
  }
}
