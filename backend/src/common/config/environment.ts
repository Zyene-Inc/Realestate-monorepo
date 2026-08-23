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
    'RESEND_WEBHOOK_SECRET',
    'CRON_SECRET',
    'CORS_ORIGINS',
    ...productionPortalVariables,
  ];
  if (value(config, 'ESIGNATURES_ENABLED').toLowerCase() === 'true') {
    required.push(
      'VERDOCS_CLIENT_ID',
      'VERDOCS_CLIENT_SECRET',
      'VERDOCS_WEBHOOK_SECRET',
      'VERDOCS_LEASE_TEMPLATE_ID',
      'VERDOCS_DISCLOSURE_TEMPLATE_ID',
      'VERDOCS_AGREEMENT_TEMPLATE_ID',
    );
  }
  if (value(config, 'CHATBOT_ENABLED').toLowerCase() === 'true') {
    required.push('OPENROUTER_API_KEY', 'CHATBOT_FINGERPRINT_SECRET');
  }
  if (value(config, 'STRIPE_RENT_PAYMENTS_ENABLED').toLowerCase() === 'true') {
    required.push(
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_CONNECT_WEBHOOK_SECRET',
    );
  }
  const missing = required.filter((key) => !value(config, key));
  if (missing.length > 0) {
    throw new Error(
      `Missing production environment variables: ${missing.join(', ')}`,
    );
  }

  const databaseUrl = new URL(value(config, 'DATABASE_URL'));
  const connectionLimit = Number(
    databaseUrl.searchParams.get('connection_limit'),
  );
  if (
    !databaseUrl.hostname.endsWith('.pooler.supabase.com') ||
    databaseUrl.port !== '5432' ||
    !Number.isInteger(connectionLimit) ||
    connectionLimit < 1 ||
    connectionLimit > 3
  ) {
    throw new Error(
      'DATABASE_URL must use the Supabase session pooler on port 5432 with connection_limit between 1 and 3 in production',
    );
  }

  const verdocsApiBaseUrl =
    value(config, 'VERDOCS_API_BASE_URL') || 'https://api.verdocs.com';
  if (new URL(verdocsApiBaseUrl).protocol !== 'https:') {
    throw new Error('VERDOCS_API_BASE_URL must use HTTPS in production');
  }
  if (value(config, 'ESIGNATURES_ENABLED').toLowerCase() === 'true') {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (const key of [
      'VERDOCS_LEASE_TEMPLATE_ID',
      'VERDOCS_DISCLOSURE_TEMPLATE_ID',
      'VERDOCS_AGREEMENT_TEMPLATE_ID',
    ]) {
      if (!uuidPattern.test(value(config, key))) {
        throw new Error(`${key} must be a Verdocs template UUID`);
      }
    }
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

  if (value(config, 'CHATBOT_ENABLED').toLowerCase() === 'true') {
    if (value(config, 'CHATBOT_FINGERPRINT_SECRET').length < 32) {
      throw new Error(
        'CHATBOT_FINGERPRINT_SECRET must be at least 32 characters',
      );
    }
    const openRouterKey = value(config, 'OPENROUTER_API_KEY');
    if (
      openRouterKey === 'sk-or-v1-replace-with-openrouter-key' ||
      openRouterKey.length < 20
    ) {
      throw new Error('OPENROUTER_API_KEY is not a usable OpenRouter API key');
    }
  }

  if (value(config, 'STRIPE_RENT_PAYMENTS_ENABLED').toLowerCase() === 'true') {
    const stripeKey = value(config, 'STRIPE_SECRET_KEY');
    if (!/^(rk|sk)_live_/.test(stripeKey)) {
      throw new Error(
        'STRIPE_SECRET_KEY must be a live restricted or secret Stripe key when rent payments are enabled',
      );
    }
    if (!value(config, 'STRIPE_WEBHOOK_SECRET').startsWith('whsec_')) {
      throw new Error('STRIPE_WEBHOOK_SECRET must be a Stripe webhook secret');
    }
    if (!value(config, 'STRIPE_CONNECT_WEBHOOK_SECRET').startsWith('whsec_')) {
      throw new Error(
        'STRIPE_CONNECT_WEBHOOK_SECRET must be a Stripe webhook secret',
      );
    }
  }

  return config;
}
