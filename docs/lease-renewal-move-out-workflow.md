# Lease renewal and move-out workflow

## Invariants

- A generic lease edit cannot mark a lease renewed or terminated.
- A signed Verdocs renewal records acceptance immediately; proposed financial terms activate only when the effective date arrives.
- Notice alone never releases the tenant or unit.
- Final inspection completion requires every checklist item, actual move-out time, forwarding address, turnover state, and confirmed key return.
- Security-deposit value comes from paid categorized move-in charges less recorded refunds.
- Deposit deductions and refunds post signed entries to an append-only ledger.
- A return requires an idempotent request UUID; zero-dollar returns are protected by the same disposition-level key.
- Private return proof is uploaded through a signed Supabase Storage URL and served through a five-minute authorized URL.

## Staff sequence

1. Open **Renewals & move-outs** and choose the resident/lease.
2. For renewal: save draft terms, send the Verdocs package, and monitor signed/declined/expired status.
3. For move-out: record notice and forwarding address, then acknowledge it by scheduling the final walkthrough.
4. At physical handover, complete every condition item, record cost estimates and notes, confirm key return, actual move-out, and turnover state.
5. Review the verified deposit held, add supported deductions, and finalize the resident statement.
6. Record the actual return method and reference. The CRM does not move this refund automatically.
7. Upload check/ACH/cash/other proof and mark the return complete.
8. If the resident disputes the statement, preserve the reason and resolution in the workflow and audit trail.

## Tenant sequence

The tenant opens **Renewal & move-out** to review a renewal and continues to **Documents** for Verdocs signing. The same page accepts tenant notice, shows inspection schedule and completed findings, records acknowledgement, displays deposit itemization and deadline, opens return proof, and accepts a dispute while the statement is open.

## Operational verification

After deployment, verify one non-production-value lifecycle from renewal draft through signature status, and one test move-out through deposit proof. Confirm the audit actions, private storage access, email records, unit turnover state, and deposit ledger before staff uses the workflow on a real resident.
