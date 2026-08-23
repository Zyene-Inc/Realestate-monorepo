import { validateEnvironment } from './environment';

const productionEnvironment = {
  NODE_ENV: 'production',
  DATABASE_URL:
    'postgresql://postgres.project:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=3&pool_timeout=30',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  SUPABASE_SECRET_KEY: 'sb_secret_test',
  RESEND_API_KEY: 're_test',
  RESEND_FROM_EMAIL: 'Coach Johnson Realty <noreply@coachjohnsonrealty.com>',
  RESEND_WEBHOOK_SECRET: 'whsec_test',
  CRON_SECRET: 'test-cron-secret-at-least-16',
  CORS_ORIGINS: 'https://coachjohnsonrealty.com',
  PUBLIC_SITE_URL: 'https://coachjohnsonrealty.com',
  AGENT_PORTAL_URL: 'https://agents.coachjohnsonrealty.com',
  PROPERTIES_ADMIN_URL: 'https://properties-admin.coachjohnsonrealty.com',
  RENTAL_ADMIN_URL: 'https://rental-admin.coachjohnsonrealty.com',
  TENANT_PORTAL_URL: 'https://tenant.coachjohnsonrealty.com',
  SUPER_ADMIN_URL: 'https://admin.coachjohnsonrealty.com',
};

describe('validateEnvironment', () => {
  it('accepts a complete Vercel production environment', () => {
    expect(validateEnvironment(productionEnvironment)).toBe(
      productionEnvironment,
    );
  });

  it('rejects a direct database connection in production', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        DATABASE_URL:
          'postgresql://postgres:password@db.project.supabase.co:5432/postgres?sslmode=require',
      }),
    ).toThrow('Supabase session pooler');
  });

  it('rejects an unbounded Supabase session pool in production', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        DATABASE_URL:
          'postgresql://postgres.project:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres?connection_limit=10',
      }),
    ).toThrow('connection_limit between 1 and 3');
  });

  it('rejects an unverified Resend sender domain in production', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        RESEND_FROM_EMAIL: 'Coach Johnson Realty <onboarding@resend.dev>',
      }),
    ).toThrow('verified coachjohnsonrealty.com domain');
  });

  it('requires every Verdocs secret when e-signatures are enabled', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        ESIGNATURES_ENABLED: 'true',
        VERDOCS_CLIENT_ID: 'client-id',
      }),
    ).toThrow('VERDOCS_CLIENT_SECRET, VERDOCS_WEBHOOK_SECRET');
  });

  it('accepts a fully configured HTTPS Verdocs integration', () => {
    const environment = {
      ...productionEnvironment,
      ESIGNATURES_ENABLED: 'true',
      VERDOCS_API_BASE_URL: 'https://api.verdocs.com',
      VERDOCS_CLIENT_ID: 'client-id',
      VERDOCS_CLIENT_SECRET: 'client-secret',
      VERDOCS_WEBHOOK_SECRET: 'webhook-secret',
      VERDOCS_LEASE_TEMPLATE_ID: '11111111-1111-4111-8111-111111111111',
      VERDOCS_DISCLOSURE_TEMPLATE_ID: '22222222-2222-4222-8222-222222222222',
      VERDOCS_AGREEMENT_TEMPLATE_ID: '33333333-3333-4333-8333-333333333333',
    };
    expect(validateEnvironment(environment)).toBe(environment);
  });
});
