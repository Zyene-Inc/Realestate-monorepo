const productionPortalVariables = [
  'PUBLIC_SITE_URL',
  'AGENT_PORTAL_URL',
  'PROPERTIES_ADMIN_URL',
  'RENTAL_ADMIN_URL',
  'TENANT_PORTAL_URL',
  'SUPER_ADMIN_URL',
] as const;

function value(config: Record<string, unknown>, key: string) {
  const result = config[key];
  return typeof result === 'string' ? result.trim() : '';
}

export function validateEnvironment(config: Record<string, unknown>) {
  const production =
    value(config, 'NODE_ENV') === 'production' ||
    value(config, 'VERCEL_ENV') === 'production';
  if (!production) return config;

  const required = [
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SECRET_KEY',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'CORS_ORIGINS',
    ...productionPortalVariables,
  ];
  const missing = required.filter((key) => !value(config, key));
  if (missing.length > 0) {
    throw new Error(
      `Missing production environment variables: ${missing.join(', ')}`,
    );
  }

  const databaseUrl = new URL(value(config, 'DATABASE_URL'));
  if (
    !databaseUrl.hostname.endsWith('.pooler.supabase.com') ||
    databaseUrl.port !== '6543' ||
    databaseUrl.searchParams.get('pgbouncer') !== 'true'
  ) {
    throw new Error(
      'DATABASE_URL must use the Supabase transaction pooler on port 6543 with pgbouncer=true in production',
    );
  }

  for (const key of productionPortalVariables) {
    const url = new URL(value(config, key));
    if (url.protocol !== 'https:') {
      throw new Error(`${key} must use HTTPS in production`);
    }
  }

  const resendKey = value(config, 'RESEND_API_KEY');
  if (!resendKey.startsWith('re_') || resendKey === 're_your_api_key_here') {
    throw new Error('RESEND_API_KEY is not a production Resend API key');
  }
  if (
    !/<[^<>\s]+@coachjohnsonrealty\.com>$/i.test(
      value(config, 'RESEND_FROM_EMAIL'),
    )
  ) {
    throw new Error(
      'RESEND_FROM_EMAIL must use the verified coachjohnsonrealty.com domain',
    );
  }

  return config;
}
