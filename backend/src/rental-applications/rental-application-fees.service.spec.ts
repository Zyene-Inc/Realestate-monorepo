import { RentalApplicationFeeStatus } from '@prisma/client';
import { RentalApplicationFeesService } from './rental-application-fees.service';

function fixture() {
  let capturedAuditInput: unknown;
  let capturedStripeEventInput: unknown;
  const rentalApplicationUpdate = jest.fn().mockResolvedValue({});
  const auditCreate = jest.fn((input: unknown) => {
    capturedAuditInput = input;
    return Promise.resolve({});
  });
  const stripeEventUpdate = jest.fn((input: unknown) => {
    capturedStripeEventInput = input;
    return Promise.resolve({});
  });
  const prisma = {
    rentalApplication: {
      findUnique: jest.fn().mockResolvedValue({ id: 'application-1' }),
      update: rentalApplicationUpdate,
    },
    auditLog: { create: auditCreate },
    stripeWebhookEvent: {
      create: jest.fn().mockResolvedValue({}),
      update: stripeEventUpdate,
    },
    $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  const service = new RentalApplicationFeesService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return {
    service,
    rentalApplicationUpdate,
    auditInput: () => capturedAuditInput,
    stripeEventInput: () => capturedStripeEventInput,
  };
}

function refundedEvent(amountRefunded: number) {
  return {
    id: `evt-refund-${amountRefunded}`,
    type: 'charge.refunded',
    livemode: true,
    data: {
      object: {
        id: 'ch_application_fee',
        amount: 5_000,
        amount_refunded: amountRefunded,
        metadata: { rental_application_id: 'application-1' },
      },
    },
  };
}

describe('RentalApplicationFeesService', () => {
  it('records a partial refund without marking the full fee refunded', async () => {
    const { service, rentalApplicationUpdate, auditInput } = fixture();

    await service.processWebhook(refundedEvent(1_000));

    expect(rentalApplicationUpdate).toHaveBeenCalledWith({
      where: { id: 'application-1' },
      data: {
        stripeChargeId: 'ch_application_fee',
        feeStatus: undefined,
      },
    });
    expect(auditInput()).toEqual({
      data: {
        action: 'RENTAL_APPLICATION_FEE_CHARGE_REFUNDED',
        resource: 'rental_application',
        resourceId: 'application-1',
        newValue: JSON.stringify({
          chargeId: 'ch_application_fee',
          amount: 5_000,
          amountRefunded: 1_000,
          fullyRefunded: false,
        }),
      },
    });
  });

  it('marks the application fee refunded only after a full refund', async () => {
    const { service, rentalApplicationUpdate, stripeEventInput } = fixture();

    await service.processWebhook(refundedEvent(5_000));

    expect(rentalApplicationUpdate).toHaveBeenCalledWith({
      where: { id: 'application-1' },
      data: {
        stripeChargeId: 'ch_application_fee',
        feeStatus: RentalApplicationFeeStatus.REFUNDED,
      },
    });
    expect(stripeEventInput()).toMatchObject({
      data: { rentalApplicationId: 'application-1' },
    });
  });
});
