import { ConfigService } from '@nestjs/config';
import { VerdocsService } from './verdocs.service';

describe('VerdocsService', () => {
  it('stays disabled and does not expose credential values', () => {
    const config = new ConfigService({
      ESIGNATURES_ENABLED: 'false',
      VERDOCS_CLIENT_ID: 'client-id',
      VERDOCS_CLIENT_SECRET: 'client-secret',
      VERDOCS_WEBHOOK_SECRET: 'webhook-secret',
      VERDOCS_LEASE_TEMPLATE_ID: 'lease-template',
      VERDOCS_DISCLOSURE_TEMPLATE_ID: 'disclosure-template',
      VERDOCS_AGREEMENT_TEMPLATE_ID: 'agreement-template',
    });
    const result = new VerdocsService(config).configuration();

    expect(result).toEqual({
      provider: 'VERDOCS',
      plan: 'FREE_25_ENVELOPES_MONTHLY',
      enabled: false,
      apiConfigured: false,
      webhookConfigured: false,
      templatesConfigured: true,
    });
    expect(JSON.stringify(result)).not.toContain('client-secret');
  });

  it('reports API and webhook readiness only when explicitly enabled', () => {
    const config = new ConfigService({
      ESIGNATURES_ENABLED: 'true',
      VERDOCS_CLIENT_ID: 'client-id',
      VERDOCS_CLIENT_SECRET: 'client-secret',
      VERDOCS_WEBHOOK_SECRET: 'webhook-secret',
      VERDOCS_LEASE_TEMPLATE_ID: 'lease-template',
      VERDOCS_DISCLOSURE_TEMPLATE_ID: 'disclosure-template',
      VERDOCS_AGREEMENT_TEMPLATE_ID: 'agreement-template',
    });

    expect(new VerdocsService(config).configuration()).toMatchObject({
      enabled: true,
      apiConfigured: true,
      webhookConfigured: true,
      templatesConfigured: true,
    });
  });
});
