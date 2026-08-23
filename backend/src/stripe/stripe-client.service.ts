import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

const STRIPE_API_URL = 'https://api.stripe.com';
const STRIPE_API_VERSION = '2026-07-29.dahlia';
const WEBHOOK_TOLERANCE_SECONDS = 300;

type StripeErrorResponse = {
  error?: { message?: string; type?: string; code?: string };
};

type StripeCheckoutSession = {
  id: string;
  url: string;
  expires_at: number;
  payment_intent?: string | null;
  payment_status?: string;
  amount_total?: number | null;
  metadata?: Record<string, string>;
};

export type StripeEvent = {
  id: string;
  type: string;
  livemode: boolean;
  data: { object: Record<string, unknown> };
};

export type StripeThinEvent = {
  id: string;
  type: string;
  livemode: boolean;
  related_object?: { id?: string; type?: string };
};

type StripeAccount = { id: string };

function appendFormValue(
  form: URLSearchParams,
  key: string,
  value: string | number | boolean | null | undefined,
) {
  if (value !== undefined && value !== null) form.append(key, String(value));
}

@Injectable()
export class StripeClient {
  private readonly logger = new Logger(StripeClient.name);

  constructor(private readonly config: ConfigService) {}

  get enabled() {
    return (
      this.config.get<string>('STRIPE_RENT_PAYMENTS_ENABLED')?.toLowerCase() ===
      'true'
    );
  }

  private secretKey() {
    const key = this.config.get<string>('STRIPE_SECRET_KEY')?.trim();
    if (!this.enabled || !key || key.includes('replace_with')) {
      throw new ServiceUnavailableException(
        'Online rent payments are not configured yet',
      );
    }
    return key;
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    idempotencyKey?: string,
  ) {
    const timeout = new AbortController();
    const timeoutId = setTimeout(() => timeout.abort(), 15_000);
    try {
      const response = await fetch(`${STRIPE_API_URL}${path}`, {
        ...init,
        signal: timeout.signal,
        headers: {
          Authorization: `Bearer ${this.secretKey()}`,
          'Stripe-Version': STRIPE_API_VERSION,
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
          ...init.headers,
        },
      });
      const payload = (await response.json().catch(() => ({}))) as T &
        StripeErrorResponse;
      if (!response.ok) {
        const message = payload.error?.message || 'Stripe request failed';
        this.logger.error(
          `Stripe ${init.method ?? 'GET'} ${path} failed: ${response.status} ${payload.error?.type ?? 'unknown'}`,
        );
        throw new BadRequestException(message);
      }
      return payload as T;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Stripe ${init.method ?? 'GET'} ${path} unavailable`);
      throw new ServiceUnavailableException(
        'The payment processor is temporarily unavailable. Please try again.',
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private postForm<T>(
    path: string,
    form: URLSearchParams,
    idempotencyKey?: string,
  ) {
    return this.request<T>(
      path,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      },
      idempotencyKey,
    );
  }

  async createCheckoutSession(input: {
    paymentId: string;
    tenantEmail: string;
    propertyName: string;
    amountCents: number;
    commissionCents: number;
    destinationAccountId: string;
    successUrl: string;
    cancelUrl: string;
    idempotencyKey: string;
  }) {
    const form = new URLSearchParams();
    appendFormValue(form, 'mode', 'payment');
    appendFormValue(form, 'customer_email', input.tenantEmail);
    appendFormValue(form, 'client_reference_id', input.paymentId);
    appendFormValue(form, 'success_url', input.successUrl);
    appendFormValue(form, 'cancel_url', input.cancelUrl);
    appendFormValue(
      form,
      'integration_identifier',
      'coach_johnson_rent_checkout',
    );
    appendFormValue(form, 'metadata[payment_id]', input.paymentId);
    appendFormValue(
      form,
      'payment_intent_data[metadata][payment_id]',
      input.paymentId,
    );
    appendFormValue(
      form,
      'payment_intent_data[transfer_data][destination]',
      input.destinationAccountId,
    );
    appendFormValue(
      form,
      'payment_intent_data[application_fee_amount]',
      input.commissionCents,
    );
    appendFormValue(form, 'line_items[0][quantity]', 1);
    appendFormValue(form, 'line_items[0][price_data][currency]', 'usd');
    appendFormValue(
      form,
      'line_items[0][price_data][unit_amount]',
      input.amountCents,
    );
    appendFormValue(
      form,
      'line_items[0][price_data][product_data][name]',
      `Rent payment — ${input.propertyName}`.slice(0, 250),
    );
    // Intentionally omit payment_method_types. Stripe Dashboard dynamic payment
    // methods decide which eligible one-time methods are offered to the tenant.
    return this.postForm<StripeCheckoutSession>(
      '/v1/checkout/sessions',
      form,
      input.idempotencyKey,
    );
  }

  async createRecipientAccount(input: {
    ownerId: string;
    email: string;
    businessName?: string | null;
    idempotencyKey: string;
  }) {
    return this.request<StripeAccount>(
      '/v2/core/accounts',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_email: input.email,
          dashboard: 'express',
          defaults: {
            responsibilities: {
              fees_collector: 'application',
              losses_collector: 'application',
            },
          },
          configuration: {
            recipient: {
              capabilities: {
                stripe_balance: { stripe_transfers: { requested: true } },
              },
            },
          },
          identity: input.businessName
            ? { business_details: { doing_business_as: input.businessName } }
            : undefined,
          metadata: { property_owner_id: input.ownerId },
        }),
      },
      input.idempotencyKey,
    );
  }

  async createAccountOnboardingLink(input: {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
    idempotencyKey: string;
  }) {
    const form = new URLSearchParams();
    appendFormValue(form, 'account', input.accountId);
    appendFormValue(form, 'refresh_url', input.refreshUrl);
    appendFormValue(form, 'return_url', input.returnUrl);
    appendFormValue(form, 'type', 'account_onboarding');
    return this.postForm<{ url: string }>(
      '/v1/account_links',
      form,
      input.idempotencyKey,
    );
  }

  private verifyWebhookPayload(
    payload: Buffer,
    signatureHeader: string | undefined,
    signingSecretName:
      | 'STRIPE_WEBHOOK_SECRET'
      | 'STRIPE_CONNECT_WEBHOOK_SECRET',
  ) {
    const secret = this.config.get<string>(signingSecretName)?.trim();
    if (!this.enabled || !secret || !signatureHeader) {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }
    const entries = signatureHeader.split(',').map((entry) => entry.split('='));
    const timestamp = entries.find(([key]) => key === 't')?.[1];
    const signatures = entries
      .filter(([key]) => key === 'v1')
      .map(([, signature]) => signature)
      .filter((signature): signature is string => Boolean(signature));
    const timestampNumber = Number(timestamp);
    if (
      !Number.isInteger(timestampNumber) ||
      Math.abs(Date.now() / 1000 - timestampNumber) > WEBHOOK_TOLERANCE_SECONDS
    ) {
      throw new BadRequestException('Expired Stripe webhook signature');
    }
    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${payload.toString('utf8')}`)
      .digest('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const matches = signatures.some((signature) => {
      const candidate = Buffer.from(signature, 'hex');
      return (
        candidate.length === expectedBuffer.length &&
        timingSafeEqual(candidate, expectedBuffer)
      );
    });
    if (!matches)
      throw new BadRequestException('Invalid Stripe webhook signature');
    return JSON.parse(payload.toString('utf8')) as Record<string, unknown>;
  }

  verifyWebhook(payload: Buffer, signatureHeader?: string) {
    const event = this.verifyWebhookPayload(
      payload,
      signatureHeader,
      'STRIPE_WEBHOOK_SECRET',
    ) as StripeEvent;
    if (!event.id || !event.type || !event.data?.object) {
      throw new BadRequestException('Invalid Stripe webhook payload');
    }
    return event;
  }

  verifyConnectWebhook(payload: Buffer, signatureHeader?: string) {
    const event = this.verifyWebhookPayload(
      payload,
      signatureHeader,
      'STRIPE_CONNECT_WEBHOOK_SECRET',
    ) as StripeThinEvent;
    if (!event.id || !event.type || !event.related_object?.id) {
      throw new BadRequestException('Invalid Stripe Connect webhook payload');
    }
    return event;
  }

  async retrieveConnectedAccount(accountId: string) {
    return this.request<Record<string, unknown>>(
      `/v2/core/accounts/${encodeURIComponent(accountId)}`,
      { method: 'GET' },
    );
  }
}
