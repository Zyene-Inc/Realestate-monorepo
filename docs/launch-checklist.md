# Launch checklist

## Automated release gates

- [x] Backend production build passes.
- [x] Prisma schema validates and connected Phase 11 migrations are present.
- [x] Full backend lint passes with zero errors/warnings.
- [x] Full backend unit suite passes.
- [x] Frontend lint and 49-route production build pass.
- [x] Apex plus five portal-domain routing checks pass.
- [x] Production dependency audits report zero known vulnerabilities.
- [x] CI repeats these gates for pull requests and `main`.

## Security and reliability

- [x] Role-protected payment self-service is restricted to `TENANT`.
- [x] Buyer inquiry secrets are removed from localStorage and expire after 30 days in an HttpOnly cookie.
- [x] Signup and recovery enforce strong and non-breached passwords through the protected API.
- [x] Helmet/API and Next.js browser security headers are enabled; framework disclosure headers are disabled.
- [x] Payment and commission create/update retries are idempotent and race-safe.
- [x] Twenty-way live financial retries produce one row, one audit, and one email with bounded p95 latency.
- [x] Supabase has all current foreign-key indexes; remaining advisor entries are intentional INFO/unused-index observations plus the plan-gated native leaked-password warning covered by the API.

## Providers and production

- [x] Resend sender/webhook configuration is present and one live message reached signed `email.sent` and `email.delivered` states.
- [x] Vercel Web Analytics and Speed Insights are installed.
- [x] Vercel production database connectivity uses the bounded Supabase pool configuration.
- [ ] Johnson Realty confirms its operational reviewer mailbox exists and is not suppressed before staff alerts rely on it.
- [ ] Johnson Realty supplies/approves legal Verdocs PDFs; keep production e-signatures disabled until the separate Phase 9 activation gate passes.
- [ ] Keep online rent collection and owner payouts disabled until the separate Phase 6.5 work is complete.

The unchecked business/provider activation items do not reopen Phase 11 code hardening. They define which optional workflows must remain disabled at launch.
