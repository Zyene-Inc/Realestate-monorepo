import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Prisma,
  RentalApplicationFeeStatus,
  RentalApplicationStatus,
  StripeWebhookEventStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { getPortalUrls } from '../common/config/portal-urls';
import { PrismaService } from '../prisma/prisma.service';
import { StripeClient, StripeEvent } from '../stripe/stripe-client.service';
import { RentalApplicationsService } from './rental-applications.service';

@Injectable()
export class RentalApplicationFeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeClient,
    private readonly applications: RentalApplicationsService,
    private readonly config: ConfigService,
  ) {}

  private value(record: Record<string, unknown>, key: string) {
    const value = record[key];
    return typeof value === 'string' ? value : undefined;
  }

  private numberValue(record: Record<string, unknown>, key: string) {
    const value = record[key];
    return typeof value === 'number' ? value : undefined;
  }

  private metadata(record: Record<string, unknown>) {
    const value = record.metadata;
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  }

  async createCheckout(id: string, token: string) {
    const application = await this.applications.authenticate(id, token);
    if (!this.stripe.applicationFeesEnabled) {
      throw new ServiceUnavailableException(
        'Online application fees are not available yet',
      );
    }
    if (application.feeStatus === RentalApplicationFeeStatus.NOT_REQUIRED) {
      throw new ConflictException(
        'This property does not require an application fee',
      );
    }
    if (application.feeStatus === RentalApplicationFeeStatus.PAID) {
      return { paid: true, application };
    }
    if (application.status !== RentalApplicationStatus.FEE_PENDING) {
      throw new ConflictException(
        'Submit the application before paying the fee',
      );
    }
    if (
      application.feeStatus === RentalApplicationFeeStatus.OPEN &&
      application.stripeCheckoutUrl &&
      application.stripeCheckoutExpiresAt &&
      application.stripeCheckoutExpiresAt > new Date()
    ) {
      return { url: application.stripeCheckoutUrl, reused: true };
    }
    const requestId = randomUUID();
    const reserved = await this.prisma.rentalApplication.updateMany({
      where: {
        id,
        feeStatus: {
          in: [
            RentalApplicationFeeStatus.PENDING,
            RentalApplicationFeeStatus.FAILED,
            RentalApplicationFeeStatus.EXPIRED,
          ],
        },
      },
      data: {
        feeStatus: RentalApplicationFeeStatus.OPEN,
        feeCheckoutRequestId: requestId,
        stripeCheckoutSessionId: null,
        stripeCheckoutUrl: null,
        stripeCheckoutExpiresAt: null,
      },
    });
    if (reserved.count !== 1) {
      throw new ConflictException(
        'A fee checkout is already being prepared; refresh and retry',
      );
    }
    try {
      const publicUrl = getPortalUrls(this.config).public;
      const session = await this.stripe.createApplicationFeeCheckoutSession({
        applicationId: id,
        applicantEmail: application.email,
        propertyName: application.property.name,
        amountCents: Math.round(Number(application.feeAmount) * 100),
        successUrl: `${publicUrl}/rentals/applications/${id}?payment=success`,
        cancelUrl: `${publicUrl}/rentals/applications/${id}?payment=canceled`,
        idempotencyKey: requestId,
      });
      await this.prisma.$transaction([
        this.prisma.rentalApplication.update({
          where: { id },
          data: {
            stripeCheckoutSessionId: session.id,
            stripeCheckoutUrl: session.url,
            stripeCheckoutExpiresAt: new Date(session.expires_at * 1000),
          },
        }),
        this.prisma.auditLog.create({
          data: {
            action: 'RENTAL_APPLICATION_FEE_CHECKOUT_CREATED',
            resource: 'rental_application',
            resourceId: id,
            newValue: JSON.stringify({ sessionId: session.id }),
          },
        }),
      ]);
      return { url: session.url, reused: false };
    } catch (error) {
      await this.prisma.rentalApplication.updateMany({
        where: { id, feeCheckoutRequestId: requestId },
        data: {
          feeStatus: RentalApplicationFeeStatus.FAILED,
          feeCheckoutRequestId: null,
        },
      });
      throw error;
    }
  }

  async canHandle(event: StripeEvent) {
    const record = event.data.object;
    const applicationId = this.value(
      this.metadata(record),
      'rental_application_id',
    );
    if (applicationId) return true;
    const paymentIntentId = this.value(record, 'payment_intent');
    if (!paymentIntentId) return false;
    return Boolean(
      await this.prisma.rentalApplication.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
        select: { id: true },
      }),
    );
  }

  private async resolveApplication(record: Record<string, unknown>) {
    const metadataId = this.value(
      this.metadata(record),
      'rental_application_id',
    );
    if (metadataId) {
      return this.prisma.rentalApplication.findUnique({
        where: { id: metadataId },
      });
    }
    const paymentIntentId = this.value(record, 'payment_intent');
    if (!paymentIntentId) return null;
    return this.prisma.rentalApplication.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });
  }

  private async settleCheckout(record: Record<string, unknown>) {
    const application = await this.resolveApplication(record);
    if (!application) return undefined;
    const sessionId = this.value(record, 'id');
    const amountTotal = this.numberValue(record, 'amount_total');
    const expectedCents = Math.round(Number(application.feeAmount) * 100);
    if (
      !sessionId ||
      application.stripeCheckoutSessionId !== sessionId ||
      amountTotal !== expectedCents
    ) {
      throw new BadRequestException(
        'Application fee checkout details do not match',
      );
    }
    const paymentIntentId = this.value(record, 'payment_intent');
    await this.prisma.$transaction(async (tx) => {
      await tx.rentalApplication.update({
        where: { id: application.id },
        data: {
          feeStatus: RentalApplicationFeeStatus.PAID,
          status:
            application.status === RentalApplicationStatus.FEE_PENDING
              ? RentalApplicationStatus.SUBMITTED
              : application.status,
          stripePaymentIntentId: paymentIntentId,
          feePaidAt: new Date(),
          stripeCheckoutUrl: null,
          feeCheckoutRequestId: null,
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'RENTAL_APPLICATION_FEE_PAID',
          resource: 'rental_application',
          resourceId: application.id,
          newValue: JSON.stringify({ sessionId, paymentIntentId, amountTotal }),
        },
      });
    });
    return { applicationId: application.id };
  }

  private async failCheckout(
    record: Record<string, unknown>,
    status: RentalApplicationFeeStatus,
  ) {
    const application = await this.resolveApplication(record);
    if (!application) return undefined;
    await this.prisma.rentalApplication.updateMany({
      where: {
        id: application.id,
        feeStatus: RentalApplicationFeeStatus.OPEN,
      },
      data: {
        feeStatus: status,
        stripeCheckoutUrl: null,
        feeCheckoutRequestId: null,
      },
    });
    return { applicationId: application.id };
  }

  private async processCharge(record: Record<string, unknown>, type: string) {
    const application = await this.resolveApplication(record);
    if (!application) return undefined;
    const chargeId = this.value(record, 'id');
    const amount = this.numberValue(record, 'amount');
    const amountRefunded = this.numberValue(record, 'amount_refunded');
    const fullyRefunded =
      type === 'charge.refunded' &&
      amount !== undefined &&
      amountRefunded !== undefined &&
      amountRefunded >= amount;
    const feeStatus = fullyRefunded
      ? RentalApplicationFeeStatus.REFUNDED
      : type === 'charge.dispute.created'
        ? RentalApplicationFeeStatus.DISPUTED
        : undefined;
    await this.prisma.$transaction([
      this.prisma.rentalApplication.update({
        where: { id: application.id },
        data: { stripeChargeId: chargeId, feeStatus },
      }),
      this.prisma.auditLog.create({
        data: {
          action: `RENTAL_APPLICATION_FEE_${type.replaceAll('.', '_').toUpperCase()}`,
          resource: 'rental_application',
          resourceId: application.id,
          newValue: JSON.stringify({
            chargeId,
            amount,
            amountRefunded,
            fullyRefunded,
          }),
        },
      }),
    ]);
    return { applicationId: application.id };
  }

  async processWebhook(event: StripeEvent) {
    try {
      await this.prisma.stripeWebhookEvent.create({
        data: {
          stripeEventId: event.id,
          type: event.type,
          livemode: event.livemode,
          payload: JSON.stringify(event),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { received: true, duplicate: true };
      }
      throw error;
    }
    try {
      let result: { applicationId: string } | undefined;
      if (
        event.type === 'checkout.session.completed' &&
        this.value(event.data.object, 'payment_status') === 'paid'
      ) {
        result = await this.settleCheckout(event.data.object);
      } else if (event.type === 'checkout.session.async_payment_succeeded') {
        result = await this.settleCheckout(event.data.object);
      } else if (event.type === 'checkout.session.async_payment_failed') {
        result = await this.failCheckout(
          event.data.object,
          RentalApplicationFeeStatus.FAILED,
        );
      } else if (event.type === 'checkout.session.expired') {
        result = await this.failCheckout(
          event.data.object,
          RentalApplicationFeeStatus.EXPIRED,
        );
      } else if (
        [
          'charge.succeeded',
          'charge.refunded',
          'charge.dispute.created',
        ].includes(event.type)
      ) {
        result = await this.processCharge(event.data.object, event.type);
      }
      await this.prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: {
          status: result
            ? StripeWebhookEventStatus.PROCESSED
            : StripeWebhookEventStatus.IGNORED,
          rentalApplicationId: result?.applicationId,
          processedAt: new Date(),
        },
      });
      return { received: true, duplicate: false };
    } catch (error) {
      await this.prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: {
          status: StripeWebhookEventStatus.FAILED,
          processingError: (error instanceof Error
            ? error.message
            : String(error)
          ).slice(0, 4000),
        },
      });
      throw error;
    }
  }
}
