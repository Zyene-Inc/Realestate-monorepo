# Phase 11 verification record

Verification date: August 22, 2026.

## Security review

The API controller inventory was reviewed for anonymous, authenticated, and role-restricted routes. Intentional anonymous routes are health, published listings/rentals, buyer inquiry creation/access, signed provider webhooks, and the cron-secret email retry callback. Payment history now explicitly requires `TENANT`; admin, Sales Admin, Rental Admin, agent, and tenant boundaries remain enforced by NestJS guards and canonical hostname routing.

Password signup/recovery is server-controlled and uses strong-character validation plus the padded HIBP range API. Buyer inquiry capability tokens are hash-only in PostgreSQL, expire after 30 days, and are delivered only in host-only HttpOnly cookies. Security headers, request IDs, structured exception logs, disabled framework headers, bounded global throttling, and strict endpoint throttles are enabled.

Supabase Security Advisor reports no ERROR notices. Its leaked-password WARN cannot be enabled on the current plan; equivalent application enforcement is tested. RLS-enabled/no-policy INFO notices are intentional deny-by-default browser access because Prisma uses the server-only role. Supabase Performance Advisor has no remaining unindexed-foreign-key notice after the Phase 11 indexes.

## Financial reliability

`backend/scripts/verify-phase-11-launch-readiness.ts` ran against the connected Supabase database using 20 concurrent identical requests for manual rent creation, rent-status update, and sale-commission creation. Each operation returned one record. Exact audit counts were `PAYMENT_RECORDED=1`, `PAYMENT_UPDATED=1`, and `SALE_COMMISSION_CREATED=1`; email counts were one reminder and one receipt. The repeat run reported p95 latency of 3.821s, 3.389s, and 5.248s respectively, then removed all verification rows.

The test also proved that reusing either financial idempotency key with changed values returns a conflict. Rent reference numbers and request IDs are database-unique, status request IDs are unique, and sale-commission requests persist an immutable fingerprint.

## Email lifecycle

All 38 template/queue/webhook email tests pass. A live Resend password-recovery message was accepted in one attempt, then the signed production webhook persisted `email.sent` and `email.delivered`; the script removed its verification log afterward.

## Release gates

Backend build, Prisma validation, 97 backend tests, full backend lint, frontend lint, the 49-route production build, six-domain routing, and both production dependency audits pass. GitHub Actions reproduces the build/lint/test/domain gates. Vercel Web Analytics and Speed Insights provide browser telemetry; API request IDs support runtime-log correlation.

Operational handoff is recorded in `operations-runbook.md`, `staff-training.md`, and `launch-checklist.md`.
