import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { StripeClient } from './stripe-client.service';

describe('StripeClient webhook verification', () => {
  const payload = Buffer.from(
    JSON.stringify({
      id: 'evt_123',
      type: 'checkout.session.completed',
      livemode: true,
      data: { object: { id: 'cs_123' } },
    }),
  );
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'STRIPE_RENT_PAYMENTS_ENABLED') return 'true';
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test_secret';
      if (key === 'STRIPE_CONNECT_WEBHOOK_SECRET') {
        return 'whsec_test_connect_secret';
      }
      return undefined;
    }),
  };

  it('accepts a current valid Stripe signature', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha256', 'whsec_test_secret')
      .update(`${timestamp}.${payload.toString('utf8')}`)
      .digest('hex');
    const event = new StripeClient(config as never).verifyWebhook(
      payload,
      `t=${timestamp},v1=${signature}`,
    );
    expect(event.id).toBe('evt_123');
  });

  it('rejects an invalid signature and disabled payment processing', async () => {
    expect(() =>
      new StripeClient(config as never).verifyWebhook(payload, 't=1,v1=nope'),
    ).toThrow(BadRequestException);
    await expect(
      new StripeClient({
        get: jest.fn(() => 'false'),
      } as never).createCheckoutSession({
        paymentId: 'payment-1',
        tenantEmail: 'tenant@example.com',
        propertyName: 'Property',
        amountCents: 100,
        commissionCents: 10,
        destinationAccountId: 'acct_123',
        successUrl: 'https://tenant.coachjohnsonrealty.com/tenant/pay-rent',
        cancelUrl: 'https://tenant.coachjohnsonrealty.com/tenant/pay-rent',
        idempotencyKey: 'key',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('verifies an Accounts v2 Thin event with its dedicated signing secret', () => {
    const thinPayload = Buffer.from(
      JSON.stringify({
        id: 'evt_thin_123',
        type: 'v2.core.account[configuration.recipient].capability_status_updated',
        livemode: true,
        related_object: { id: 'acct_owner_123', type: 'v2.core.account' },
      }),
    );
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha256', 'whsec_test_connect_secret')
      .update(`${timestamp}.${thinPayload.toString('utf8')}`)
      .digest('hex');

    const event = new StripeClient(config as never).verifyConnectWebhook(
      thinPayload,
      `t=${timestamp},v1=${signature}`,
    );

    expect(event.related_object?.id).toBe('acct_owner_123');
  });
});
