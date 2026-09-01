# Categorized move-in charge workflow

## Purpose

Move-in money is not one undifferentiated rent payment. The system keeps first-month rent, the security deposit, pet fees, utility charges, move-in fees, and other approved charges as separate receivables with independent balances, statuses, payout treatment, and audit history.

## Lifecycle

1. Activating a manually signed lease posts first-month rent and the lease security deposit automatically. Completing a Verdocs lease-signing handoff posts the same two items when occupancy activates. Replayed activation events cannot duplicate either item.
2. Rental Admin or Super Admin can post additional categorized charges from **Rental payments → Move-in charge ledger**. First-month rent always uses the owner’s snapshotted management commission; the security deposit always routes fully to the owner. Other charges explicitly select owner less commission, owner in full, or Johnson Realty.
3. Staff can edit a charge only before payment activity. Staff can waive the remaining balance, or void a charge that has no payment history. Every action requires an idempotency key and every correction requires an audit reason.
4. Staff can record cash, check, ACH, Zelle, bank-transfer, or other receipts against a specific charge. A receipt can allocate across multiple charges through the API; the admin UI records a selected charge at a time for clarity.
5. A tenant can select one or several open move-in charges and explicitly launch one-time Stripe Checkout. No subscription, saved payment method, or automatic debit is created.
6. Stripe receives one line item per selected charge. If owner proceeds are due, the destination charge routes them to the active owner account and retains the calculated Johnson Realty amount. Charges belonging fully to Johnson Realty do not require a destination account.
7. A signed, replay-safe webhook settles the receipt and allocations atomically. Refund webhooks restore the affected categorized balances in reverse allocation order; disputes are audited for staff follow-up.
8. Tenant history and printable receipts identify move-in receipts and show their categorized allocations separately from monthly rent.

## Accounting and safety rules

- `MoveInCharge` is the receivable ledger; `Payment` is the receipt/Checkout record; `PaymentAllocation` is the immutable link between them.
- `amount = net paid + waived + balance due` is enforced by a database check constraint. Refunds reduce net paid and reopen the balance.
- Money columns on the categorized ledger use exact `DECIMAL(12,2)` values.
- First-month rent is unique by lease and billing month; security deposit is unique by active lease. The monthly billing job checks the first-month ledger before creating that month’s recurring rent charge.
- Active Checkout attempts lock their selected charges against staff edits and competing Checkout attempts.
- Financial records are corrected or waived, never deleted.
- The tables are service-role-only. RLS is enabled and direct `anon`/`authenticated` table privileges are revoked; tenant and admin access goes through role-protected API endpoints.

## Production verification

Apply `supabase/migrations/20260824222906_complete_move_in_charge_ledger.sql`, then verify the two tables, five enums, check constraints, partial uniqueness rules, indexes, RLS, and grants. Use Stripe test mode to verify one mixed-category Checkout, its destination split, webhook settlement, receipt, and refund before handling a real resident balance. Do not create test charges on a real production lease.
