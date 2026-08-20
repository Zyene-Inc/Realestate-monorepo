import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

// Placeholder values keep static builds possible before deployment variables are
// injected. All real requests will fail until the documented environment values
// are configured.
export const supabase = createClient(
  supabaseUrl ?? 'https://not-configured.supabase.co',
  supabasePublishableKey ?? 'not-configured',
)
