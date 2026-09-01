import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

const WEBHOOK_TOLERANCE_SECONDS = 300;

type StripeWebhookSecretName =
  | 'STRIPE_WEBHOOK_SECRET'
  | 'STRIPE_CONNECT_WEBHOOK_SECRET';

export function verifyStripeWebhookPayload(
  config: ConfigService,
  paymentsEnabled: boolean,
  payload: Buffer,
  signatureHeader: string | undefined,
  signingSecretName: StripeWebhookSecretName,
) {
  const secret = config.get<string>(signingSecretName)?.trim();
  if (!paymentsEnabled || !secret || !signatureHeader) {
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
  if (!matches) {
    throw new BadRequestException('Invalid Stripe webhook signature');
  }
  return JSON.parse(payload.toString('utf8')) as Record<string, unknown>;
}
