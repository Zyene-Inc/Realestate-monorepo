# Staff training guide

## Shared rules

- Use only your assigned portal and individual account. Never share credentials or approve your own work through another role.
- Confirm the hostname before entering credentials. Johnson Realty portals are the apex domain plus `agents`, `properties-admin`, `rental-admin`, `tenant`, and `admin` subdomains.
- Treat buyer, tenant, lease, maintenance, financial, and signed-document data as confidential.
- Use correction, void, status, and approval actions; never ask engineering to erase an audit trail.
- Report suspicious sign-in, unexpected password-reset email, exposed link, or incorrect role immediately.

## Sales Admin

Review agent applications and verification documents before approval. A pending agent cannot list properties. Review every submitted or resubmitted sale listing, including media and documents; approval publishes it, rejection must include a usable reason, and any approved-listing edit returns it to review. Use inquiry oversight as read-only supervision; only the assigned agent replies to the buyer. Record a sale commission only after Johnson Realty has actually received it, select the real manual method, and enter the closing reference. Home price and loan/escrow money never move through this CRM.

## Rental Admin

Create tenant accounts; tenants cannot self-register. Keep rental publication, unit occupancy, tenant assignment, and lease dates consistent. Record cash, check, ACH, Zelle, bank-transfer, or other receipts only after receipt is independently confirmed. Use a new request ID for a genuinely new payment and the same ID only for a network retry. Manage maintenance photos and private tenant messages within the portal.

## Agent company

Verify email, wait for Sales Admin approval, and keep company documents current. Submit complete sale listings and respond to rejection reasons before resubmission. Buyer conversations are listing-scoped and visible to Johnson Realty oversight. Do not copy buyer messages or contact details into unapproved systems.

## Tenant

Use the invitation sent by Rental Admin, choose a strong unique password, and do not forward recovery, lease, or signed-document links. Use the portal for maintenance and management messages. The displayed payment ledger is Johnson Realty's record; report discrepancies to Rental Admin.

## Super Admin

Use cross-vertical reports and audit history for oversight, not to impersonate operational roles. Review email failures, owner attribution, combined revenue, and security/runtime alerts. Rotate compromised credentials, control production feature flags, and follow the incident and rollback runbook.

Training is complete when each staff member can demonstrate sign-in/sign-out, password recovery, their primary workflow, one rejected unauthorized action, correction/void handling where applicable, and the incident-reporting path.
