import { validateEnvironment } from './environment';

const productionEnvironment = {
  NODE_ENV: 'production',
  DATABASE_URL:
    'postgresql://postgres.project:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  SUPABASE_SECRET_KEY: 'sb_secret_test',
  RESEND_API_KEY: 're_test',
  RESEND_FROM_EMAIL: 'Coach Johnson Realty <noreply@coachjohnsonrealty.com>',
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
    ).toThrow('Supabase transaction pooler');
  });

  it('rejects an unverified Resend sender domain in production', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        RESEND_FROM_EMAIL: 'Coach Johnson Realty <onboarding@resend.dev>',
      }),
    ).toThrow('verified coachjohnsonrealty.com domain');
  });
});
