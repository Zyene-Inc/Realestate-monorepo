import type { GenerateLinkProperties } from '@supabase/supabase-js';

export function createAuthActionUrl(
  redirectTo: string,
  properties:
    | Pick<GenerateLinkProperties, 'hashed_token' | 'verification_type'>
    | null
    | undefined,
) {
  if (!properties?.hashed_token || !properties.verification_type) return null;

  const url = new URL(redirectTo);
  url.searchParams.set('token_hash', properties.hashed_token);
  url.searchParams.set('type', properties.verification_type);
  return url.toString();
}
