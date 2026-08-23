# Tenant-initiated rental payments and owner payouts

## Money flow

1. A tenant signs in and explicitly selects a payment in the tenant portal.
2. The API creates a one-time Stripe-hosted Checkout Session. There is no subscription, saved payment method, Setup Intent, or off-session charge.
3. The payment uses a Stripe Connect destination charge. Johnson Realty's `application_fee_amount` is the property's owner's configured management commission; the remainder is automatically transferred to that owner's connected Stripe balance.
4. Stripe pays the owner bank account under that connected account's payout schedule. Johnson Realty does not create a manual transfer after the tenant's payment succeeds.
5. The verified Stripe webhook, not the browser return URL, marks the rent payment paid and records the destination-transfer reference when Stripe sends it.

Home purchase, loan, escrow, closing, and sale-commission collection remain outside Stripe and outside this workflow.

## Safety controls

- `AutoPay.enabled` is constrained to `false` in the payment migration. No API can enable an automatic debit.
- A payment is available online only when its property's owner has a connected account with active recipient transfer capability.
- The commission rate is set per property owner by `TENANT_ADMIN` or `SUPER_ADMIN` and is snapshotted when Checkout starts.
- Stripe Snapshot and Accounts v2 Thin webhooks use separate preserved raw-body HMAC secrets, replay protection by Stripe event ID, audit records, and transactionally persisted payment updates.
- Rent-payment secrets exist only in the backend Vercel project. Never set a Stripe secret as `NEXT_PUBLIC_*`.

## Production activation

The implementation is intentionally disabled until all of these reviewed steps are complete:

1. Apply `20260823183000_add_tenant_initiated_stripe_rent_payments.sql` through the Supabase migration workflow.
2. In the API Vercel project, add sensitive Production variables: `STRIPE_RENT_PAYMENTS_ENABLED=true`, `STRIPE_SECRET_KEY` (prefer a restricted live `rk_live_` key), `STRIPE_WEBHOOK_SECRET`, and `STRIPE_CONNECT_WEBHOOK_SECRET`.
3. In the Stripe live dashboard, configure two **Your account** event destinations with separate signing secrets: a Snapshot destination at `https://coach-johnson-realty-api-nu.vercel.app/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.succeeded`, `charge.refunded`, and `charge.dispute.created`; and a Thin destination at `https://coach-johnson-realty-api-nu.vercel.app/api/stripe/connect-webhook` for only `v2.core.account[configuration.recipient].capability_status_updated`.
4. Configure eligible one-time payment methods in Stripe Dashboard. The application deliberately does not set `payment_method_types`.
5. Create an owner in Rental Admin, set the Johnson Realty management rate, send payout setup, and complete the owner’s Stripe-hosted onboarding to connect their bank account.
6. Test a tenant-initiated payment in Stripe test mode first, verify the webhook/audit/payment record, refund path, owner transfer, and owner bank payout schedule; then repeat the controlled live verification with a real authorized payment.

Do not enable this feature until the database migration and webhook are active. A successful browser redirect alone is never proof of a payment.
