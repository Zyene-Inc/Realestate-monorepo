# Production operations runbook

## System boundaries

Coach Johnson Realty runs two Vercel projects: the Next.js web project and the NestJS API project. Supabase is the only authentication, PostgreSQL, and object-storage provider. Resend sends transactional email. Verdocs is feature-gated and must remain disabled in production until Johnson Realty approves the three legal templates.

The platform records rent receipts and sale commissions manually. It does not move home-sale funds, originate loans, process escrow, or confirm owner payouts.

## Daily checks

1. Open `https://coach-johnson-realty-api-nu.vercel.app/api/health`; require HTTP 200 and `database: connected`.
2. Review Vercel Runtime Errors for both projects and inspect API logs by `x-request-id` when a user reports a failure.
3. Review the Super Admin email-operations page for failed or exhausted deliveries.
4. Review pending agent, sale-listing, maintenance, and e-signature queues appropriate to the enabled features.
5. Review the Rental Admin payment ledger for overdue balances, billing-cycle failures, and any staff-entered late-fee adjustments.
6. Review Supabase Security and Performance Advisors after every schema migration. RLS-with-no-policy informational notices are intentional because browser database access is denied and all application access goes through the role-protected API.

Vercel Web Analytics and Speed Insights are installed in the root web layout. They provide traffic and performance telemetry without adding a separate analytics secret. Do not place passwords, access tokens, message bodies, or signed file URLs in logs or analytics events.

## Deployment and rollback

1. Merge only after `.github/workflows/quality.yml` passes backend validation/build/lint/tests and frontend lint/build/domain routing.
2. Apply reviewed Supabase migrations before deploying code that requires the new columns. Never run both migration histories blindly.
3. Deploy the API first, verify `/api/health`, then deploy the web project.
4. Verify the apex and five portal domains, the same-origin `/api` rewrite, security headers, sign-in, and one representative role-protected API.
5. Review Vercel build logs and Runtime Errors for at least the first 15 minutes.

For an application regression, promote the last known-good Vercel deployment for the affected project. Database changes are forward-only: create and apply a corrective migration instead of editing or deleting an applied migration. If a new release depends on an unsafe schema change, disable the affected feature and restore the previous application deployment while the corrective migration is prepared.

## Database connectivity and recovery

Production uses the Supabase session pooler on port 5432 with `connection_limit=3` and `pool_timeout=30`. This configuration passed the 20-way Phase 11 financial retry test and stays below the current pool's 15-session ceiling. Never use an unbounded Prisma connection string in Vercel.

Before a high-risk migration, take the database backup/export available to the current Supabase plan and verify that the migration has a forward recovery statement. Current operational targets are RPO 24 hours and RTO 4 hours. If the business requires a lower RPO, upgrade to a Supabase plan with the required backup/PITR capability before promising that target.

For suspected database corruption or accidental deletion:

1. Stop the affected write path by disabling the feature or rolling back the API.
2. Record the incident time, affected tables, request IDs, and last known-good timestamp.
3. Preserve logs and contact Supabase support before attempting restoration.
4. Restore to a separate environment when possible and validate row counts and critical workflows before production cutover.

## Authentication and security incidents

Agent signup and password recovery require 12–72 characters with uppercase, lowercase, number, and symbol characters. The API performs a padded Have I Been Pwned range lookup; raw passwords are never sent to that service. Supabase's native leaked-password advisor remains plan-gated on the current project, so this API control must not be bypassed.

Buyer inquiry access uses a 30-day, host-only, HttpOnly, Secure, SameSite=Strict cookie. Browser storage contains only the inquiry ID and non-secret expiry. A user who loses the browser cookie must submit a new inquiry; staff must never send or reconstruct an access token.

For a suspected credential leak: rotate the affected Vercel secret, Supabase key, Resend key/webhook secret, Verdocs credential, or cron secret; redeploy; invalidate provider credentials; review audit/runtime logs; and document the time window. Never paste secret values into tickets or chat.

## Email operations

Resend events are signature-verified and stored against durable `EmailLog` records. Critical templates retry through the protected Supabase Cron callback. For a failed message:

1. Confirm the recipient address and provider status in Super Admin.
2. Check suppression/bounce details in Resend.
3. Correct the mailbox or suppression before retrying; do not repeatedly send to a known bad address.
4. Use the existing retry control so the attempt remains idempotent and auditable.

The deterministic delivery address is only for verification. Before launch communications rely on a Johnson Realty operations mailbox, confirm that mailbox exists and is not suppressed in Resend.

## Financial corrections and rental billing

Every manual rent receipt and sale commission requires a client request UUID. Retrying the same request returns one record; reusing the UUID with different values is rejected. Reference numbers are unique for rent receipts. Corrections must use the supported status/correction/void workflows so audit history remains intact. Never delete financial records to correct them, and never represent a manual record as proof that a bank, owner, escrow agent, or closing party moved funds.

The daily rental-billing callback is idempotent: it creates at most one payment record per lease/month and transitions an unpaid record to overdue only once. A five-day grace period on rent due the first applies a late fee on the sixth; a zero-day period applies it the next day. Staff may run **Rental payments → Run billing check** after a deployment, then confirm the returned created/overdue counts. Staff can adjust a late fee only with an audit reason. Lease-term changes apply to future payment cycles; do not edit an issued payment to make it match a new lease term. Automatic tenant debits are prohibited—every Stripe checkout requires an explicit tenant action.

## Severity and escalation

- **SEV-1:** unauthorized access, suspected secret leak, corrupted financial data, or complete production outage. Disable the affected path immediately and notify the Super Admin owner within 15 minutes.
- **SEV-2:** one portal or critical workflow unavailable, repeated email failures, or severe performance degradation. Begin investigation within 30 minutes.
- **SEV-3:** isolated user error or non-critical display defect. Record request ID and handle in the normal engineering queue.

Close an incident only after the root cause, affected data/users, remediation, verification, and follow-up owner are recorded.
