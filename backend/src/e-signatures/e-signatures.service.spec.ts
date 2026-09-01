import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ESignatureDocumentType,
  ESignatureTargetType,
  Role,
} from '@prisma/client';
import { createHmac } from 'node:crypto';
import { ESignaturesService } from './e-signatures.service';

describe('ESignaturesService', () => {
  const prisma = {
    eSignatureEnvelope: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    eSignatureEvent: { createMany: jest.fn() },
  };
  const verdocs = {
    webhookSecret: jest.fn(),
    envelope: jest.fn(),
    configuration: jest.fn(),
    listTemplates: jest.fn(),
    templateIdFor: jest.fn(),
  };
  const rentalLifecycle = { apply: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  function service(secret = 'phase-9-webhook-secret') {
    verdocs.webhookSecret.mockReturnValue(secret);
    return new ESignaturesService(
      prisma as never,
      new ConfigService({}),
      verdocs as never,
      rentalLifecycle as never,
    );
  }

  it('prevents a sales admin from widening list access to tenant envelopes', async () => {
    await expect(
      service().listAdmin(
        { id: 'admin', email: 'admin@example.com', role: Role.SALES_ADMIN },
        { limit: 25, targetType: ESignatureTargetType.TENANT },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.eSignatureEnvelope.findMany).not.toHaveBeenCalled();
  });

  it('rejects a template that is not pinned to the requested document type', async () => {
    verdocs.templateIdFor.mockReturnValue(
      '11111111-1111-4111-8111-111111111111',
    );
    await expect(
      service().create(
        { id: 'admin', email: 'admin@example.com', role: Role.SUPER_ADMIN },
        {
          clientRequestId: '44444444-4444-4444-8444-444444444444',
          templateId: '22222222-2222-4222-8222-222222222222',
          documentType: ESignatureDocumentType.LEASE,
          targetType: ESignatureTargetType.TENANT,
          targetId: 'tenant-1',
          leaseId: 'lease-1',
          recipientRoleName: 'Tenant',
          title: 'Residential lease',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps admin lists cursor bounded and scoped', async () => {
    prisma.eSignatureEnvelope.findMany.mockResolvedValue([]);
    await service().listAdmin(
      { id: 'admin', email: 'admin@example.com', role: Role.TENANT_ADMIN },
      {
        limit: 100,
        documentType: ESignatureDocumentType.LEASE,
      },
    );

    expect(prisma.eSignatureEnvelope.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          targetType: ESignatureTargetType.TENANT,
          documentType: ESignatureDocumentType.LEASE,
        },
        take: 101,
      }),
    );
  });

  it('rejects an invalid Verdocs HMAC before touching the database', async () => {
    const raw = Buffer.from(
      JSON.stringify({
        event: 'envelope_completed',
        body: { id: 'provider-id' },
      }),
    );

    await expect(
      service().handleWebhook(raw, 'invalid'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.eSignatureEnvelope.findUnique).not.toHaveBeenCalled();
  });

  it('verifies the signature over the exact webhook body and safely ignores unknown envelopes', async () => {
    const payload = {
      event: 'envelope_completed',
      body: { id: 'provider-id', status: 'complete' },
    };
    const signature = createHmac('sha256', 'phase-9-webhook-secret')
      .update(JSON.stringify(payload.body))
      .digest('hex');
    prisma.eSignatureEnvelope.findUnique.mockResolvedValue(null);

    await expect(
      service().handleWebhook(Buffer.from(JSON.stringify(payload)), signature),
    ).resolves.toEqual({ received: true, verified: true, tracked: false });
    expect(prisma.eSignatureEnvelope.findUnique).toHaveBeenCalledWith({
      where: { providerEnvelopeId: 'provider-id' },
    });
    expect(prisma.eSignatureEvent.createMany).not.toHaveBeenCalled();
  });

  it('accepts a prefixed HMAC over the raw webhook payload', async () => {
    const payload = Buffer.from(
      JSON.stringify({
        event: 'envelope_updated',
        body: { envelope_id: 'provider-id', status: 'in progress' },
      }),
    );
    const signature = createHmac('sha256', 'phase-9-webhook-secret')
      .update(payload)
      .digest('hex');
    prisma.eSignatureEnvelope.findUnique.mockResolvedValue(null);

    await expect(
      service().handleWebhook(payload, `sha256=${signature}`),
    ).resolves.toEqual({ received: true, verified: true, tracked: false });
  });
});
