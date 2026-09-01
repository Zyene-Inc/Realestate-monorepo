# Rental Application Workflow

## Scope

The application workflow begins only from a published rental. It collects applicant and household information, keeps identity and income evidence private, supports an optional property-specific application fee, and gives Rental Admin or Super Admin a controlled review queue. Approval unlocks a controlled move-in handoff that can invite the resident, reserve the selected unit, create a pending lease, and send a prefilled Verdocs envelope. It never creates recurring payments or automatic debits.

## Applicant lifecycle

1. The applicant selects **Apply now** from a published rental and sees the exact application fee before starting.
2. The public form validates identity/contact, current address, intended move-in date, household, employment, gross income, and rental-history fields. Social Security numbers and bank/card credentials are explicitly excluded.
3. Creation issues an opaque application-access token in a secure HttpOnly cookie. Only the SHA-256 token hash is stored.
4. The applicant uploads a government ID and proof of income. Files go directly to the private `rental-application-documents` Supabase bucket through short-lived signed upload URLs. PDF, JPEG, PNG, and WebP files are allowed up to 10 MB.
5. Certification and both required document categories are mandatory before submission.
6. A zero-fee application enters `SUBMITTED`. A fee-bearing application enters `FEE_PENDING` and the applicant explicitly opens one-time Stripe Checkout. No recurring payment method or automatic debit is created.
7. Signed, replay-safe Stripe webhooks move the fee through paid, failed, expired, refunded, or disputed states. The applicant page briefly polls after Checkout so confirmed payment appears without a manual reload.
8. Status emails contain a single-use, seven-day resume token in the URL fragment. The frontend exchanges and clears the fragment before navigating to the application; the replacement session remains in an HttpOnly cookie.

## Staff review lifecycle

Rental Admin and Super Admin use `/admin/rental-applications`.

- The queue is cursor-bounded, searchable, filterable by status, and exposes a new/pending badge in the admin navigation.
- Staff may assign an eligible active Rental Admin or Super Admin and add private notes.
- Each uploaded file is opened through a five-minute server-authorized signed download URL and independently accepted or rejected with a reason.
- Staff can move an application to `UNDER_REVIEW`, `NEEDS_INFORMATION`, `APPROVED`, or `DENIED` only through the defined transition matrix. Optimistic concurrency rejects stale updates.
- `NEEDS_INFORMATION` and `DENIED` require an applicant-facing reason.
- `APPROVED` is rejected unless the fee is `PAID` or `NOT_REQUIRED` and both government ID and proof-of-income documents are accepted.
- Approval unlocks **Prepare and send the lease** on the application detail page. The handoff remains an explicit staff action; approval alone does not create accounts or contracts.

## Approved application to signed lease

1. Rental Admin or Super Admin selects an available unit and confirms the lease term, rent, deposit, rent-due day, grace period, and late fee.
2. Before any account is created, the API verifies that Verdocs is enabled, its HMAC webhook is configured, the selected UUID is the pinned lease template, the template has exactly one signer/approver, and all required prefill fields exist.
3. The workflow creates or safely reuses the applicant's tenant-only portal identity. An email already belonging to another portal role or resident with a current lease is rejected.
4. The unit becomes `reserved`, the resident remains `invited`, and the lease becomes `pending_signature`. No occupancy or monthly rent charge starts at this point.
5. The server prefills the legal-approved Verdocs template with the resident, property, unit, dates, rent, deposit, due-day, grace-period, and late-fee terms. Verdocs sends the signing invitation.
6. A signed provider envelope is accepted only after the completed PDFs and certificate are archived in private Supabase Storage and verified by SHA-256. In the same database transaction, the handoff becomes `SIGNED`, the lease and resident become `active`, and the reserved unit becomes `occupied`.
7. Declined, canceled, or expired envelopes move the handoff to `ACTION_REQUIRED`, keep the lease in signing history, release the unit to `vacant`, and detach the inactive resident. Staff may review the terms and safely retry without creating a duplicate lease.
8. Client-request fingerprints, one handoff per application, one lease per application, one active lease envelope per lease, row locks, and audit events protect retries and concurrent clicks. An ambiguous provider-creation result is stopped for manual Verdocs verification instead of risking a duplicate envelope.

The Verdocs residential-lease template must contain these exact signer-role fields: `lease_tenant_name`, `lease_property_address`, `lease_unit_number`, `lease_start_date`, `lease_end_date`, `lease_monthly_rent`, `lease_security_deposit`, `lease_rent_due_day`, `lease_grace_period_days`, and `lease_late_fee`.

## Data and security boundaries

- Application tables are RLS-enabled with no direct browser policies; the role-protected API is the only database access path.
- The document bucket is private and has no public or authenticated direct-access policies.
- Public API responses use explicit allowlists and never expose token hashes, storage paths, Stripe object IDs/URLs, assignment internals, or staff notes.
- Admin APIs are restricted to `TENANT_ADMIN` and `SUPER_ADMIN`; document URLs expire after five minutes.
- Material creation, submission, fee, document-review, note, and workflow events write audit records without copying document contents or private note text.
- Tenant invitation, pending-lease creation, signing retries, signed activation, and terminal signature outcomes are audited without storing the lease PDF contents in audit payloads.
- One active application per property and normalized applicant email is enforced in PostgreSQL.

## Configuration and deployment

- `STRIPE_APPLICATION_FEES_ENABLED=true` enables application-fee Checkout independently. When unset, it follows `STRIPE_RENT_PAYMENTS_ENABLED` for backward-compatible deployment.
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` remain server-only. The existing Snapshot webhook events cover Checkout completion/failure/expiry plus charge success/refund/dispute.
- `RENTAL_APPLICATION_ALERT_EMAIL` optionally receives new-submission alerts. The admin queue works even when this address is unset.
- Supabase applied migration `20260824210815_complete_rental_application_workflow` is mapped to `backend/prisma/migrations/20260824210000_complete_rental_application_workflow/migration.sql` in the migration ledger.
- Supabase applied migration `20260824215506_complete_application_lease_signing_handoff` is mapped to both committed `20260824212518_complete_application_lease_signing_handoff` migration sources in the migration ledger.
- Application fees can be illegal or restricted in some jurisdictions. Johnson Realty must confirm the allowed fee and refund policy before entering a non-zero amount; the product defaults every property to zero.
