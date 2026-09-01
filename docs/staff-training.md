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

Create tenant accounts; tenants cannot self-register. Keep rental publication, unit occupancy, tenant assignment, and lease dates consistent. Record cash, check, ACH, Zelle, bank-transfer, or other receipts only after receipt is independently confirmed. Tenants must initiate every online rent payment themselves; staff must never promise automatic debit. For a Stripe-confirmed correction, use **Refund online payment**, enter the approved amount and reason, and wait for the verified webhook to update the ledger—never change the paid amount manually. Use a new request ID for a genuinely new payment and the same ID only for a network retry. Manage maintenance photos and private tenant messages within the portal.

### Maintenance and vendors

Open **Service & communication → Maintenance**, triage urgent requests first, and use **Manage work order** for the entire job. A scheduled request requires both a vendor and appointment time; completion requires the verified final cost. Keep staff observations in the private notes field, using the minimum information required; never store reusable access codes there.

When you complete a request, the system posts the final cost to the property's owner-expense ledger. If the invoice changes later, update the final cost on the same completed request: the system appends the difference instead of replacing history. Reopening a completed request reverses its posted total. Confirm the displayed ledger impact before saving. After tenant confirmation, do not reopen the request—create a new work order for additional service.

### Move-in inspections and key handover

Use **Rental portfolio → Move-in inspections** after a lease becomes active. Open the automatically prepared draft, schedule the walkthrough, complete every room condition, add private evidence photos and utility readings, then record each physical key as handed over. For a keyless home, select the keyless option and describe how access was delivered without entering a reusable door or alarm code.

Select **Send to resident** only after all readiness indicators are complete. The staff record locks while the resident reviews it. If a correction is required before acknowledgement, reopen the draft with a reason; resident observations remain preserved. After the resident types their full name and acknowledges the record, the inspection is immutable and displays its SHA-256 evidence digest in both portals.

### Renewals, move-outs, and deposits

Use **Residents & payments → Renewals & move-outs**. Never select a renewed or terminated status manually. Draft the renewal, verify all proposed terms, then send it through Verdocs; signed terms activate on the effective date. For move-out, record notice, schedule the final walkthrough, complete every condition item, confirm actual move-out and key return, and select the correct turnover state. The unit remains occupied until this checklist is completed.

Start deposit deductions from the verified amount held. Describe each deduction plainly, finalize the itemization once, record the real return method/reference, and attach proof before marking returned. Treat the displayed deadline as an operational alert and escalate any disputed or overdue return immediately. Do not interpret the software as legal advice or alter ledger history.

## Agent company

Verify email, wait for Sales Admin approval, and keep company documents current. Submit complete sale listings and respond to rejection reasons before resubmission. Buyer conversations are listing-scoped and visible to Johnson Realty oversight. Do not copy buyer messages or contact details into unapproved systems.

## Tenant

Use the invitation sent by Rental Admin, choose a strong unique password, and do not forward recovery, lease, or signed-document links. Use the portal for maintenance and management messages. To pay online, open the current charge and start the one-time Stripe Checkout yourself; Johnson Realty will not debit you automatically. The displayed payment ledger is Johnson Realty's record; report discrepancies to Rental Admin.

## Super Admin

Use cross-vertical reports and audit history for oversight, not to impersonate operational roles. Review email failures, owner attribution, combined revenue, and security/runtime alerts. Rotate compromised credentials, control production feature flags, and follow the incident and rollback runbook.

Training is complete when each staff member can demonstrate sign-in/sign-out, password recovery, their primary workflow, one rejected unauthorized action, correction/void handling where applicable, and the incident-reporting path.
