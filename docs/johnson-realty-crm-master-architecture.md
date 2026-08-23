# Johnson Realty CRM — Master Architecture & Build Plan

> Implementation status overlay for the master architecture document supplied on August 20, 2026.
>
> Original plan prepared: August 19, 2026  
> Repository audited: `pavanganta0110/coach-johnson-realty` at commit `23bae9e`  
> Audit date: August 20, 2026; Phase 7, Phase 10, and Phase 11 production verification: August 22, 2026
> This repository copy records what is implemented, partially implemented, pending, or blocked by an open business decision.

## Status legend

- **DONE** — implemented end to end in the current code, with a usable backend/data path and corresponding UI or API where required.
- **PARTIAL** — a meaningful foundation exists, but the planned capability is not complete or is not wired end to end.
- **PENDING** — the planned capability is not implemented. A static mockup, empty module, dependency entry, TODO, or database placeholder alone does not count as implementation.
- **BLOCKED** — implementation depends on a business decision identified by the master plan.

## Current progress snapshot

### Phased build plan progress

The phased plan in Part 12 contains 40 separately auditable work items.

| Measure                             | Points | Share |
| ----------------------------------- | -----: | ----: |
| **Verified implementation credit**  |     35 | 87.5% |
| **Remaining implementation credit** |      5 | 12.5% |

Using the phase scores recorded in Part 12, the plan is **87.5% complete**.

Phases 1 through 8, Phase 10, and Phase 11 are complete, apart from the separately tracked Phase 6.5 owner-payout work and Phase 9 provider activation. In addition to the verified agent, sale-listing, buyer-inquiry, rental, and email workflows, Super Admin has bounded cross-vertical reporting and the production platform has completed security, reliability, delivery, deployment, and operational-handoff gates. Home-sale funds remain outside the platform.

### Existing platform foundation

The codebase is not only 20% of a product. Alongside the plan-specific work, it contains a broader generic property-management foundation. Across the 21 baseline capabilities assessed in Part 10, the current code has:

| Status      | Capabilities | Share |
| ----------- | -----------: | ----: |
| **DONE**    |           11 | 52.4% |
| **PARTIAL** |            5 | 23.8% |
| **PENDING** |            5 | 23.8% |

Weighted the same way, the current baseline capability footprint is **64.3%**. This second metric explains the structural head start without overstating completion of the remaining end-to-end workflows.

## Audit corrections to the original gap analysis

The original plan correctly identified the major missing architecture, but several generic modules are less complete than the module names suggest:

- `maintenance` now has role-protected tenant/admin controllers, persisted private photos, status management, tenant completion confirmation, live interfaces, and audit events. Status: **DONE for Phase 6**.
- `messages` now provides a tenant thread and shared Rental Admin inbox with bounded cursor pagination, direct routing, read timestamps, no-op-safe read auditing, and live interfaces. Status: **DONE for Phase 6**.
- `announcements` has a Prisma model and service, but its controller is empty and both announcement pages use static data. `notifications` is only an empty module. Status: **PARTIAL**.
- `vendors` has a model and service, but its controller is empty and the admin page is static. Status: **PARTIAL**.
- `documents` is an empty module. Generic tenant document records exist, and completed private-file workflows use Supabase Storage, but no generic tenant-document API or end-to-end UI flow exists. Status: **PARTIAL**.
- The Stripe package and PaymentIntent fields are present, but payment code explicitly contains future-integration TODOs. The tenant checkout and admin Stripe settings are static mockups. Stripe/Stripe Connect status: **PENDING**.
- Public sale/rental properties, Phase 6 rental-admin screens, and Phase 10 Super Admin reporting use backend data. Some later-phase vendor, announcement, document, and online-payment screens still contain static groundwork.
- Backend dependencies and frontend dependencies are installed. The backend production build and test suite pass, and the frontend production build passes.
- The repository's original migration history incorrectly mixed a PostgreSQL Prisma schema with SQLite migration SQL and a SQLite migration lock. The initial migration and lock are normalized to PostgreSQL; the connected Supabase migration history remains authoritative and is mapped to its checked-in SQL sources in the root README.

---

## Part 1 — Business Model Overview

Johnson Realty operates one public apex website, five role-specific portal subdomains, and two separate business verticals:

1. **Buy/Sell** — approved independent agent companies submit sale listings for Johnson Realty approval; buyers contact the listing agent while Johnson Realty retains oversight.
2. **Rent/Tenant** — Johnson Realty staff directly manage rentals for multiple property owners, serve tenants, collect rent, and route owner proceeds through Stripe Connect after retaining a management commission.

The vertical split is **DONE for Phases 1–8 and Phases 10–11**: buy/sell approval and commission routing, rent-side direct publishing, hostname isolation, canonical role routing, backend role gates, cross-vertical reporting, and launch hardening are live.

### Actors required by the target architecture

| Actor                                     | Current implementation status                                                                                                                                                                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Johnson Realty main admin / `SUPER_ADMIN` | **DONE through Phase 11** — cross-vertical portal access, agent-chat oversight, filtered audit history, operational/financial/owner reporting, email oversight, and production hardening are live. Phase 6.5 payouts and Phase 9 legal/provider activation remain separate. |
| Sub-agent company / `AGENT`               | **DONE for the current company model** — role, signup, approval, protected listing workspace, company settings, private documents, listing workflow, and buyer messaging are live. Multi-user company membership is not yet modeled.          |
| Buyer/prospect                            | **PARTIAL** — sale listing inquiries and replies are live; rental prospect/application workflows remain pending.                                                                                                                              |
| Property owner                            | **PARTIAL** — owner model and rental-property relationship exist; management UI and payout onboarding do not.                                                                                                                                 |
| Tenant admin staff / `TENANT_ADMIN`       | **DONE for Phase 6** — dedicated rental dashboard, properties, units, tenants, leases, maintenance, and shared tenant inbox are API-backed and role-protected.                                                                                |
| Tenant                                    | **DONE for Phase 6** — invited-only authentication, active lease/dashboard, maintenance with photos, completion confirmation, and direct management messaging are live; later document/announcement/payment work remains.                     |

## Part 2 — Public Website Architecture

| Requirement                                                                 | Status                     | Evidence / pending work                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public apex domain with separate approved sale and published rental feeds   | **DONE for current scope** | `/properties` uses approved-only sale data, while `/rentals` and `/rentals/[id]` use published-only rental data. Rental applications remain a later prospect workflow.                                                                                                                                   |
| Role-specific portal subdomains                                             | **DONE**                   | Hostname routing, canonical role redirects, shared Supabase session cookies, Vercel domain assignment/TLS, production checks, and backend RBAC cover `agents`, `properties-admin`, `rental-admin`, `tenant`, and `admin`. |
| Buy/sell listing page with agent profile and listing-scoped contact action  | **DONE**                   | Approved listings have public detail pages with agent identity, email, and phone actions; CRM chat is a later phase.                                                                                                                                                                                     |
| Rent listing page with availability/specs and Johnson Realty contact action | **DONE**                   | Public rental list/detail pages expose only published rentals, vacant-unit pricing/specs, utilities, photos, and a Johnson Realty availability contact action.                                                                                                                                           |
| Decide whether sale money moves through the platform                        | **DONE**                   | Home purchase funds, loans, escrow, and closing payments remain outside the CRM. Johnson Realty only records commission revenue manually after it is received.                                                                                                                                           |

Production hostname map:

| Hostname                                  | Surface                                       | Role           |
| ----------------------------------------- | --------------------------------------------- | -------------- |
| `coachjohnsonrealty.com`                  | Corporate site, `/properties`, and `/rentals` | Public         |
| `agents.coachjohnsonrealty.com`           | Agent/sub-company portal                      | `AGENT`        |
| `properties-admin.coachjohnsonrealty.com` | Buy/Sell administration                       | `SALES_ADMIN`  |
| `rental-admin.coachjohnsonrealty.com`     | Rental and lease administration               | `TENANT_ADMIN` |
| `tenant.coachjohnsonrealty.com`           | Tenant portal                                 | `TENANT`       |
| `admin.coachjohnsonrealty.com`            | Cross-vertical administration                 | `SUPER_ADMIN`  |

## Part 3 — Buy/Sell Vertical

The buy/sell listing, buyer-messaging, and manual commission workflows are implemented end to end:

- **DONE as a foundation:** `Agent` entity, `AGENT` role, account-status enum, approval metadata, and verification-document references.
- **DONE as a foundation:** sale property classification, agent linkage, listing-status enum, review metadata, price, specs, photos, and document references.
- **DONE:** Agent registration, pending-account creation, Johnson Realty approval queue, approve/decline transitions, reason capture, protected APIs, frontend review UI, and audit events.
- **DONE:** Listing submission/review/rejection state machine with optimistic status transitions and audit events.
- **DONE:** Approved listing edits and asset changes reset the listing to review and immediately remove it from the public feed.
- **DONE:** Private account-level and per-listing documents use direct signed uploads and short-lived server-authorized download links; agents manage their account files and sales reviewers can inspect them.
- **DONE:** Listing-scoped buyer inquiry threads with hashed browser-held access tokens and approved-listing-only creation.
- **DONE:** Agent inbox, buyer and agent replies, open/closed state, read receipts, routing notifications, and message audit events.
- **DONE:** `SUPER_ADMIN` and `SALES_ADMIN` standing read-only access across agent threads; supervisory roles cannot reply as an agent.
- **DONE:** Protected Johnson Realty commission receipts tied to sold listings and their responsible agents, with exact decimal amounts, idempotent creation, correction/void history, and revenue reporting. No online sale payment or agent-payout processing exists.
- **DONE:** Sale listing submitted, resubmitted, approved, and rejected emails are wired through Resend.
- **DONE:** Agent verification, approval, decline, resubmission-received, and reviewer-resubmission emails are wired through Resend. The sender domain and deterministic production delivery are verified.

Generic auth, storage, email, message, and audit services support both completed sale workflows and the Phase 6 rental workflows.

## Part 4 — Rent/Tenant Vertical

| Requirement                                                   | Status                   | Evidence / pending work                                                                                                                                                                                |
| ------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Generic `Property`, `Unit`, `Lease`, and `Tenant` data models | **DONE as a foundation** | Prisma relations and basic CRUD/tenant queries exist.                                                                                                                                                  |
| Tenant authentication and invitation                          | **DONE as a foundation** | There is no public tenant signup. Protected Rental/Super Admin invitation creates the Supabase identity, application user, and tenant profile; password reset and RBAC infrastructure are wired.       |
| Tenant dashboard and active lease retrieval                   | **DONE as a foundation** | Backend routes and frontend API calls exist.                                                                                                                                                           |
| Tenant maintenance submission/list                            | **DONE for Phase 6**     | Tenant/admin APIs and UIs persist requests and private photos, support status/cost/notes updates, and allow tenant completion confirmation. Vendor-directory completion remains a separate capability. |
| Manual payment ledger/history                                 | **DONE as a foundation** | Payment records, status updates, overdue lookup, audit events, and tenant history exist. This is not online rent collection.                                                                           |
| Direct rental property publishing                             | **DONE**                 | Rental Admin/Super Admin manage draft/published/unpublished rentals, signed photos, public visibility, and live public rental pages without a sales-style approval gate.                               |
| Property owner entity and property ownership linkage          | **DONE as a foundation** | `PropertyOwner`, payout state, commission rate, owner/property relation, and seeded owner linkage exist.                                                                                               |
| Owner Stripe Connect onboarding and payout status             | **PENDING**              |
| Block rent collection until owner payout setup is active      | **PENDING**              |
| Destination charges and commission split                      | **PENDING**              |
| Owner-attributed manual payment ledger/reporting              | **DONE for Phase 10**    | Paid/partial rent entries snapshot the owner, management rate, Johnson Realty commission, and owner proceeds; this does not execute or confirm an owner payout.                                        |
| Tenant documents, chat, announcements, and autopay end to end | **PARTIAL**              | Tenant chat is complete; documents, announcements, and autopay remain later-phase work.                                                                                                                |

## Part 5 — Payments Architecture

| Requirement                                                   | Status                                                                                                                                                     |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Manual rent payment ledger                                    | **DONE as a foundation**                                                                                                                                   |
| Tenant card/ACH collection                                    | **PENDING**                                                                                                                                                |
| Rent-side Stripe Connect owner onboarding                     | **PENDING**                                                                                                                                                |
| Rent-side destination charge with `transfer_data.destination` | **PENDING**                                                                                                                                                |
| Johnson Realty fee with `application_fee_amount`              | **PENDING**                                                                                                                                                |
| Payment attribution to property owner and net payout          | **PENDING**                                                                                                                                                |
| Webhook processing                                            | **PENDING**                                                                                                                                                |
| Home purchase, loan, escrow, or closing-payment processing    | **OUT OF SCOPE** — handled outside the CRM by the applicable lenders, title/closing parties, and financial institutions.                                   |
| Manual buy/sell commission ledger                             | **DONE** — authorized Sales/Super Admin staff record commission income after receipt against an approved listing marked sold; no Stripe charge is created. |

The manual sale commission record should include the closed property/listing, responsible agent, optional sale price, commission amount, date received, payment method (`ACH`, `CASH`, `CHECK`, `WIRE`, or `OTHER`), optional reference number, notes, recording admin, timestamps, and an auditable void/correction path. The CRM must not collect buyer bank, loan, escrow, or full purchase-payment details.

The `stripe` dependency, `stripePaymentIntentId` placeholder, Stripe-branded UI, and comments for future endpoints are not counted as payment integration.

## Part 6 — Email Architecture

### Implemented foundation

- **DONE:** Resend delivery uses a centralized, typed, versioned template registry with one Coach Johnson Realty brand wrapper.
- **DONE:** Every outbound message is persisted before delivery with a logical and provider idempotency key, attempt limits, provider ID, and lifecycle timestamps.
- **DONE:** Tenant invitation and password reset are wired to protected account flows.
- **DONE:** Rent reminder, late notice, payment recorded, lease creation/status, maintenance creation/status/completion, tenant-message, rental publish/unpublish owner, agent, listing, and buyer-inquiry notifications are wired to their implemented workflow transitions.

### Remaining lifecycle coverage

- **DONE:** Agent signup verification, approval, decline, resubmission confirmation, and reviewer notification
- **DONE:** Sale listing submitted, approved, rejected, edited, and resubmitted notifications
- **DONE:** Buyer inquiry, buyer reply, and agent reply notifications
- **READY FOR THEIR PRODUCERS:** Rental-application submitted/status and owner Stripe onboarding/completion/payout/statement templates are versioned and callable. Their event producers remain intentionally owned by the later rental-application and Phase 6.5 Stripe workflows, which do not yet exist.
- **DONE:** Lease creation and status notifications link tenants to the protected lease portal. Verdocs sends the provider invitation and email-OTP challenge for each Phase 9 envelope.
- **DONE:** Signed Resend webhooks write sent, delayed, delivered, opened, clicked, bounced, complained, failed, and suppressed events to `EmailLog`/`EmailEvent`; duplicate webhook deliveries are ignored by provider event ID and out-of-order events cannot regress terminal state.
- **DONE:** Critical submission failures use bounded retries and Resend idempotency. The Vercel Hobby plan cannot run sub-daily cron, so Supabase Cron invokes the secret-protected Vercel retry endpoint every 10 minutes with the shared secret held in Supabase Vault and Vercel encrypted environment storage.
- **DONE:** Super Admin has cursor-bounded delivery visibility and manual retry without exposing stored HTML or secure links.
- Per-organization branding is **NOT APPLICABLE** to the current single-company model; all templates use the centralized Coach Johnson Realty brand wrapper. If multi-organization tenancy is introduced, branding becomes part of that data-model phase.

Overall email architecture status: **DONE for Phase 7 and every currently implemented event producer**.

## Part 7 — E-Signature Architecture

Verdocs is the selected provider, using the free 25-envelope-per-month plan. The production code and Supabase foundation are implemented; provider activation is intentionally held until a dedicated API key/HMAC webhook can be created and Johnson Realty supplies the three legal-approved source PDFs.

- Sales Admin can issue disclosure and agent/company agreement envelopes only to approved agents. Rental Admin can issue lease, disclosure, and agreement envelopes only to tenants; Super Admin can operate both areas.
- Each configured document type is pinned to its own Verdocs template UUID, and the server rejects template/type mismatches or templates with anything other than one actionable signer/approver role.
- Tenant and approved-agent portals use the embedded Verdocs signer with email OTP. The in-app invite key is returned only by a rate-limited, authenticated endpoint and is never persisted in browser storage or application logs.
- Signed state requires `envelope.signed=true`, not merely a provider `complete` status. The API archives both the signed PDF and completion certificate in the private Supabase `signed-documents` bucket, enforces PDF/20 MB limits, calculates SHA-256, and serves five-minute signed downloads.
- Local actions, Verdocs history, replay-safe signed webhook deliveries, status changes, reminders, cancellations, and signing-session issuance are exposed through cursor-bounded audit timelines. Role-scoped list and detail endpoints prevent cross-portal access.
- **ACTIVATION INPUT PENDING:** legal-approved residential lease, property disclosure, and agent/company agreement PDFs; Verdocs API credentials; Verdocs HMAC webhook secret; and one real non-production-value signing lifecycle to verify provider delivery and final archive behavior.

## Part 8 — Messaging and Communication Architecture

| Requirement                                         | Status                                                                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Generic direct `Message` model and basic service    | **DONE for tenant management messaging**                                                                                                  |
| Tenant-scoped management inbox                      | **DONE** — tenant threads route to an active Rental Admin and appear in a shared, role-protected admin inbox.                             |
| Listing/agent-scoped buy/sell threads               | **DONE** — approved-listing inquiry creation, ownership routing, buyer access token, both-side replies, and close/reopen state are live.  |
| Main-admin standing oversight                       | **DONE** — Sales and Super Admin have cross-agent read-only conversation visibility and cannot impersonate an agent reply.                |
| Read receipts beyond one `isRead` flag              | **DONE** — both inquiry and tenant messages persist per-message recipient read timestamps and render Seen/Sent indicators.                |
| Message audit events                                | **DONE for implemented chat flows** — inquiry and tenant sends/reads/state changes are audited; no-op reads do not emit duplicate events. |
| Rent announcements                                  | **PARTIAL** — model/service exist; controller and live pages are absent.                                                                  |
| Announcement acknowledgments and agent-wide notices | **PENDING**                                                                                                                               |

## Part 9 — Two Admin Portals

The frontend uses one Vercel deployment with hostname isolation: `properties-admin.coachjohnsonrealty.com` for Buy/Sell staff, `rental-admin.coachjohnsonrealty.com` for rental staff, `admin.coachjohnsonrealty.com` for Super Admin, `agents.coachjohnsonrealty.com` for approved agent companies, and `tenant.coachjohnsonrealty.com` for tenants. Existing path prefixes remain internal route organization within those hostnames.

| Requirement                                                                  | Status                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buy/Sell Admin portal shell                                                  | **DONE** — Sales Admin receives a dedicated live dashboard, sales-only navigation, agent directory, and listing review workspace.                                                                       |
| Tenant Admin portal shell                                                    | **DONE** — Tenant Admin receives rental-management navigation and is denied sales routes; Sales Admin is denied rental routes.                                                                          |
| Tenant-facing portal                                                         | **PARTIAL overall** — Phase 6 lease, maintenance, and messages are live; documents, announcements, and online rent collection remain incomplete.                                                        |
| Route-level frontend role gating                                             | **DONE** — hostname isolation, canonical role redirects, and explicit Agent, Tenant, Sales Admin, Rental Admin, and Super Admin shell guards are implemented. Backend APIs enforce roles independently. |
| Target roles `AGENT`, `SALES_ADMIN`, `TENANT_ADMIN`, `TENANT`, `SUPER_ADMIN` | **DONE as a foundation** — all target enum values exist and rental admin controllers now use `TENANT_ADMIN`.                                                                                            |

## Part 10 — Evidence-Based Gap Analysis

| Capability                   | Audited status                                  | Evidence / reasoning                                                                                                                                                                                                                                                                          |
| ---------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role-based auth guards       | **DONE**                                        | JWT guard, roles decorator, and roles guard exist and are used on several admin controllers.                                                                                                                                                                                                  |
| Leases, tenants, units       | **DONE**                                        | Prisma models, services, controllers, and several live frontend API calls exist.                                                                                                                                                                                                              |
| Maintenance                  | **DONE for Phase 6**                            | Dedicated tenant/admin APIs, private photo storage, live UIs, status/cost/notes workflow, completion confirmation, and audit events are implemented.                                                                                                                                          |
| Documents, storage           | **PARTIAL**                                     | Completed private-file workflows use Supabase Storage and generic document records exist; the generic tenant-document module/API and live UI are still missing.                                                                                                                               |
| Messages                     | **DONE for tenant management**                  | Tenant and Rental Admin APIs/UIs provide direct routing, shared inbox oversight, bounded threads, read receipts, and audit events.                                                                                                                                                            |
| Announcements, notifications | **PARTIAL**                                     | Announcement model/service exist; controller/pages are not wired and notification module is empty.                                                                                                                                                                                            |
| Audit logs                   | **DONE**                                        | Generic audit service is used for login, tenant invites, password resets, and manual payment changes.                                                                                                                                                                                         |
| Vendors                      | **PARTIAL**                                     | Model/service exist; controller and live frontend integration are missing.                                                                                                                                                                                                                    |
| Emails                       | **DONE for Phase 7 and implemented producers**  | Centralized versioned Resend templates, durable delivery logs, signed replay-safe webhooks, bounded critical retries, a live ten-minute scheduler, and Super Admin oversight are production-verified. Templates whose workflows do not exist yet remain staged for their owning later phases. |
| Payments                     | **PARTIAL**                                     | Manual payment ledger works; online payment, Connect, owner attribution, and split logic are absent.                                                                                                                                                                                          |
| Properties                   | **DONE for sale/rent publishing**               | Sale listings use approval, rental listings use direct publish state, and both public feeds are API-backed with private fields excluded.                                                                                                                                                      |
| Agent/organization entity    | **DONE as a foundation**                        | `Agent` profile, role, account state, approval metadata, payout reference, and property relationship exist.                                                                                                                                                                                   |
| Property owner entity        | **DONE as a foundation**                        | `PropertyOwner`, payout state, commission rate, Stripe account reference, and property relationship exist.                                                                                                                                                                                    |
| Account approval workflow    | **DONE**                                        | Public agent application, pending profile creation, protected approval queue, approve/decline transitions, reason capture, status UI, and audit events are implemented and integration-tested.                                                                                                |
| Listing approval workflow    | **DONE**                                        | Draft, submit, reject, resubmit, approve, re-review, private uploads, role gates, audit events, emails, and public visibility were verified against Supabase.                                                                                                                                 |
| Sale/rent listing split      | **DONE**                                        | Sale APIs enforce approved-only publication; rental APIs are isolated to `RENT` records and enforce direct draft/published/unpublished visibility.                                                                                                                                            |
| Two admin portal shells      | **DONE**                                        | Sales and rental admins receive role-specific dashboards/navigation, route-level frontend redirects, and matching backend RBAC; Super Admin retains both.                                                                                                                                     |
| Rent-side Stripe Connect     | **PENDING**                                     | Dependency/placeholders only; no Stripe client calls or webhooks. Stripe is not planned for buy/sell.                                                                                                                                                                                         |
| E-signature                  | **PARTIAL — CODE AND DATA FOUNDATION COMPLETE** | Verdocs APIs, embedded signing, RBAC, webhooks, private signed-document archival, and audit UI are implemented. Production provider keys, legal templates, and one real lifecycle verification remain.                                                                                        |
| Main-admin chat oversight    | **DONE**                                        | Sales/Super Admin have an explicit read-only inquiry API and UI, with RBAC preventing replies and Tenant Admin access.                                                                                                                                                                        |
| Owner onboarding             | **PENDING**                                     | No owner or Connect onboarding flow.                                                                                                                                                                                                                                                          |

## Part 11 — Business Decisions

### Resolved

1. **Buy/sell money flow** — the CRM does not process home purchase funds, loans, escrow, or closing payments online.
2. **Buy/sell revenue model** — Johnson Realty earns commission and an authorized admin records the amount and receipt method manually after closing. There is no Stripe sale-payment or agent-payout workflow.
3. **Rejected listing resubmission policy** — the agent edits a rejected listing, then explicitly resubmits it; it stays non-public until Johnson Realty approves it.
4. **Production domain model** — the public sale and rental experience remains on `coachjohnsonrealty.com`; agent, Buy/Sell Admin, Rental Admin, Tenant, and Super Admin experiences use dedicated subdomains on one Vercel frontend deployment.
5. **Tenant access model** — tenants use the dedicated `tenant.coachjohnsonrealty.com` portal.
6. **Agent account approval** — agent companies self-register at `agents.coachjohnsonrealty.com`, verify their email, and remain `PENDING` until a `SALES_ADMIN` (or `SUPER_ADMIN`) approves them. Pending, declined, and suspended agents cannot create or manage sale listings.
7. **Sale listing approval** — approved agents create drafts and explicitly submit them. Every submitted listing remains non-public until a `SALES_ADMIN` (or `SUPER_ADMIN`) approves it; rejected listings require agent changes and resubmission.
8. **Tenant account provisioning** — there is no public tenant registration. A `TENANT_ADMIN` (or `SUPER_ADMIN`) selects the unit and sends the invitation; that protected operation creates the Supabase Auth identity, application user, and tenant profile together.

### Still open

1. **Agent verification requirements** — exact documents and checks.
2. **Rent-side commission model** — global or owner-specific.

These remaining choices should be finalized before their related implementation to avoid rework. None blocks the completed Phase 3 listing workflow.

---

## Part 12 — Complete Phased Build Plan with Status

### Phase 1 — Foundational Data Model Corrections — **DONE**

- **DONE** — Added `Agent` entity with account state, approval metadata, user relation, verification references, payout reference, and property relation.
- **DONE** — Added `PropertyOwner` entity with payout state, Stripe account reference, commission rate, onboarding metadata, and property relation.
- **DONE** — Added `listingType: SALE | RENT` and nullable `ownerId`/`agentId` property linkages, with query indexes.
- **DONE** — Added sale listing status and review metadata plus a separate rental publish status.
- **DONE** — Added `AGENT`, `SALES_ADMIN`, and `TENANT_ADMIN`, retained `TENANT` and `SUPER_ADMIN`, and migrated existing backend rental-admin authorization from `LEASING_ADMIN` to `TENANT_ADMIN`.

Phase score: **5 / 5**.

### Phase 2 — Agent Onboarding and Account Approval — **DONE**

- **DONE** — Agent signup flow with delivered email verification and `PENDING` account state; Sales Admin approval is rejected until Supabase reports the email as confirmed.
- **DONE** — Johnson Realty approval queue with approve/decline, required decline reason, role protection, and audit events.
- **DONE** — Declined agents can update company details/documents and atomically resubmit to `PENDING`; duplicate or invalid transitions are rejected and `AGENT_RESUBMITTED` is audited.
- **DONE** — Verification, approval, decline, resubmission confirmation, and reviewer-resubmission emails are wired through Resend. The API and web Vercel production projects are configured, the sender domain is verified, and a deterministic production message reached `delivered` state.

Phase score: **3 / 3**. Verified by backend unit tests and `backend/scripts/verify-agent-onboarding.ts` against the production Vercel API, including pending-account enforcement, verified sign-in, session retrieval, sign-out, password reset, decline, edit, resubmission, approval, and exact audit ordering. All six Phase 2 email types reached Resend's deterministic `delivered` state, and all verification users and audit rows were removed afterward.

### Phase 3 — Listing Creation and Approval Workflow — **DONE**

- **DONE** — Approved-agent draft creation, direct signed photo upload, private document upload/download, and submission.
- **DONE** — Johnson Realty sales review queue with role protection, approve/reject, required reason, and an API-backed audit timeline visible in the Sales Admin interface.
- **DONE** — Edits or new assets on approved listings trigger optimistic re-review and remove public visibility until re-approved.
- **DONE** — Submitted, resubmitted, approved, and rejected lifecycle emails are wired through Resend.
- **DONE** — Public Buy/Sell list and detail APIs/UI expose only approved listings and exclude private documents.

Phase score: **5 / 5**. Verified with `backend/scripts/verify-listing-workflow.ts`, Prisma validation, backend and frontend production builds, scoped lint for the Phase 1/3 files, and the connected Supabase project. Repository-wide frontend lint is clean. Repository-wide backend lint is not clean: the August 22 baseline contains 21 errors and 3 warnings in older announcement, payment, vendor, framework-support, and lease-test files outside the completed Phase 1–5 and Phase 7 scope.

### Phase 4 — Buy/Sell Admin Portal — **DONE**

- **DONE** — Split Buy/Sell and Tenant Admin experiences with role-specific dashboards, navigation, frontend redirects, and backend role denial; `SUPER_ADMIN` retains cross-vertical access.
- **DONE** — Approved-agent company/profile settings are live for company name, primary contact, and phone. Bank and payout collection is intentionally excluded from buy/sell.
- **DONE** — Agent account and per-listing document upload, private signed access, agent removal, and sales-reviewer inspection are live through Supabase Storage. Document removal commits the database/audit change before Storage cleanup so a failed database write cannot leave a reference to a deleted object.

Phase score: **3 / 3**. Verified through live Supabase uploads/downloads, cross-role denial tests, audit records, backend tests/build, and the frontend production build.

### Phase 5 — Buyer Chat Routing and Oversight — **DONE**

- **DONE** — Public inquiries are accepted only for approved sale listings and routed to the listing's owning approved agent; another agent cannot access the thread.
- **DONE** — Johnson Realty Sales/Super Admin receives cross-agent read-only oversight while Tenant Admin is denied and supervisors cannot reply as agents.
- **DONE** — Inquiry creation, buyer/agent messages, visible both-side read receipts, and close/reopen transitions are audit-logged and lifecycle emails are wired through Resend. Read audit events are emitted only when unread rows change.
- **DONE** — Agent and Sales Admin inquiry lists and all message threads use bounded cursor pagination, backed by agent/timestamp and global timestamp indexes.

Phase score: **3 / 3**. Verified through the live buyer-to-agent-to-oversight lifecycle, invalid-token and cross-agent denial tests, audit-count assertions, backend tests/build, and the frontend production build.

### Phase 6 — Rent-Side Direct Publishing — **DONE**

- **DONE** — Rental Admin/Super Admin create, edit, publish, unpublish, and photograph rental listings directly without a sales approval gate; draft/unpublished records remain private and `/rentals` is API-backed.
- **DONE** — Units, invited-only tenant accounts, leases, occupancy synchronization, tenant dashboard/lease access, maintenance photos/status/cost/notes, and completion confirmation are wired end to end with role gates and audit events.
- **DONE** — Tenant messages route to an active Rental Admin and appear in the shared admin inbox with cursor-bounded threads, unread counts, persisted read timestamps, Seen/Sent UI, replies, and no-op-safe read auditing.

Phase score: **3 / 3**. Verified by 34 backend tests, scoped backend lint, Prisma validation and zero schema drift, Supabase migration/index/storage checks, `backend/scripts/verify-rental-workflow.ts`, frontend lint/production build, domain-routing checks, React Doctor, and browser verification of the public rental feed/detail and tenant login. Verification records and Storage objects were removed afterward.

### Phase 6.5 — Property Owner Payout Accounts — **PARTIAL, HIGH PRIORITY**

- **DONE** — Add `PropertyOwner` entity and property linkage.
- **PENDING** — Owner onboarding UI, Stripe Connect invitation, and `payoutStatus` tracking.
- **PENDING** — Block rent collection until the property's owner payout setup is active.
- **PENDING** — Destination charges with `transfer_data.destination` and `application_fee_amount`.
- **PENDING** — Provider payout settlement/status and commission-transfer reporting. Phase 10 manual owner attribution does not execute or confirm payouts.

Phase score: **1 / 5**.

### Phase 7 — Email Architecture Completion — **DONE**

- **DONE** — All implemented account, sale listing, buyer inquiry, rental publish, owner publish-state, lease, manual rent ledger, maintenance, and tenant-message transitions have versioned Resend notifications. Template contracts also exist for later rental-application and owner-Stripe producers without pretending those later workflows are implemented.
- **DONE** — Durable email logs, provider IDs, idempotency, signed and replay-safe delivery/bounce/open webhooks, bounded critical retries, a Supabase Cron scheduler compatible with the Vercel Hobby plan, and Super Admin delivery oversight are implemented and production-configured.

Phase score: **2 / 2**. Verified by the template-matrix and email-service tests, Prisma validation, backend build/tests/scoped lint, live Supabase migrations and cron configuration, Resend webhook registration, frontend lint/production build, domain routing, production deployment, and a deterministic delivered-email/webhook lifecycle check.

### Phase 8 — Manual Buy/Sell Commission Ledger — **DONE**

- **DONE** — Resolved the buy/sell commercial model: sale funds stay outside the CRM and Johnson Realty records received commission manually.
- **DONE** — Protected Sales/Super Admin APIs and UI record exact USD commission receipts only for approved sale listings marked sold. The responsible agent is derived from the listing, create retries are idempotent, and buyer bank, loan, escrow, and purchase-payment data are not collected.
- **DONE** — Corrections require a reason and preserve before/after event snapshots; voids are terminal, remain visible, and are excluded from active revenue without deleting history. Generic audit actions mirror the dedicated event timeline.
- **DONE** — Receipt and eligible-listing APIs use bounded keyset pagination. Revenue reporting provides current-range, month-to-date, year-to-date, lifetime, monthly, payment-method, and agent attribution summaries backed by query-specific indexes.

Phase score: **2 / 2**. Verified by 75 backend tests, Prisma validation, backend and frontend production builds, scoped lint, Supabase schema/index/RLS checks, and `backend/scripts/verify-sale-commission-workflow.ts` against the connected Supabase database. The live check covered anonymous and wrong-role denial, sold-listing eligibility, unsold rejection, idempotency, pagination, correction, reporting, voiding, exact audit ordering, and complete cleanup.

### Phase 9 — E-Signature Integration — **PARTIAL, ACTIVATION INPUT REQUIRED**

- **DONE** — Verdocs selected on the free 25-envelope plan and integrated through server-only client credentials, exact template/type pinning, role-scoped APIs, HMAC webhooks, idempotent local records, reminders, cancellation, and status synchronization.
- **PARTIAL** — Lease, disclosure, and agreement issuance plus tenant/agent embedded email-OTP signing are implemented and pass production builds. Activation waits on Johnson Realty's three legal-approved PDFs and their resulting Verdocs template UUIDs.
- **PARTIAL** — Private Supabase signed-PDF/certificate storage, SHA-256 integrity, five-minute downloads, generic audits, provider history, replay protection, and visible audit timelines are implemented. One live completed envelope must verify Verdocs delivery and final-document archival before this item can be marked done.

Phase score: **1 / 3**. The connected Supabase migration, RLS, private bucket, Prisma validation, 83 backend tests, backend/scoped lint builds, frontend lint/production build, domain routing, dependency audits, and React Doctor pass. Provider-side activation and one real envelope lifecycle remain deliberately unclaimed.

### Phase 10 — Compliance, Audit, and Cross-Vertical Reporting — **DONE**

- **DONE** — Super Admin has a read-only, filtered, cursor-paginated audit API and visible timeline covering account, listing, inquiry, rental, manual-payment, commission, email, and e-signature events. Actor identity and normalized before/after payloads are visible. Future payout actions will be audited when the separately scoped Phase 6.5 payout producer exists.
- **DONE** — The live cross-vertical report covers pending agent/listing queues, published rentals, rentals by owner, occupied/vacant units, manual rent collected, snapshotted Johnson Realty management commission and owner proceeds, sale commissions, combined company revenue, audit activity, owner-level cursor pagination, date filtering, and CSV export. Access is restricted to `SUPER_ADMIN` in both the API and portal/domain routing.

Phase score: **2 / 2**. Verified by Prisma validation, 92 backend tests, Phase 10 scoped lint, backend and frontend production builds, the connected Supabase migration/index checks, and `backend/scripts/verify-phase-10-reporting.ts` against the live database. The deterministic check covered anonymous and wrong-role denial, exact combined revenue and owner split calculations, both cursor boundaries, audit history, and complete cleanup. Production deployment `dpl_C9ivQSYbiZGcbfKPY72i9npEhTgJ` serves the report only on `admin.coachjohnsonrealty.com`; public, Sales Admin, and Rental Admin hosts redirect to that canonical Super Admin domain.

### Phase 11 — Hardening and Launch Readiness — **DONE**

- **DONE** — Completed the controller/role/domain security review; restricted tenant payment history explicitly; moved buyer inquiry access from localStorage to 30-day host-only HttpOnly cookies; routed password updates through a strong, HIBP-checked backend; added Helmet/browser headers, request correlation, structured failures, bounded throttling, dependency audits, and CI gates. Supabase's native leaked-password warning is plan-gated, with equivalent tested API enforcement.
- **DONE** — Manual rent create/status and sale-commission create now have immutable request fingerprints, database uniqueness, race-safe audit/email behavior, and bounded Supabase pooling. A 20-way live retry test produced one record and one exact audit/email per action with p95 latency below seven seconds.
- **DONE** — All 38 email architecture tests pass; one live Resend message completed signed `email.sent` and `email.delivered` handling in one attempt, followed by verified cleanup.
- **DONE** — API/web production deployments, health/security-header/domain checks, Vercel Analytics/Speed Insights, zero-5xx runtime scans, operations/incident/rollback guidance, staff training, and launch checklist are complete. Unapproved Verdocs legal templates and future online rent/payout workflows remain explicitly disabled under their separate phases.

Phase score: **4 / 4**. Verified by connected migrations `complete_phase_11_launch_hardening` and `index_remaining_foreign_keys_phase_11`, Prisma validation, 97 backend tests, zero-error full backend/frontend lint, backend and 49-route frontend production builds, six-domain routing, zero production dependency vulnerabilities, live Phase 2 and Phase 3–5 workflows, exact 20-way financial reliability assertions, signed Resend delivery, clean verification-data counts, and production deployments API `dpl_D6r1f1PCkzmoM1vMuxgGbyESmDGD` / web `dpl_HxLXdoQMTnXZJn7oCPYuMfTLLVbb`.

### Total phased score

`35 weighted points / 40 items = 87.5% complete`.

---

## Part 13 — Recommended Next Implementation Order

The next work should follow dependency order:

1. Complete Phase 6.5 before enabling real rent collection; owner payout readiness is a safety requirement.
2. Wire the already-defined rental-application and owner-payout templates when those later event-producing workflows are implemented.
3. Activate the implemented Phase 9 Verdocs integration after Johnson Realty supplies the three legal-approved PDFs; create the dedicated API key/HMAC webhook, configure Vercel, and verify one complete envelope lifecycle.

## Code evidence reviewed

- `backend/prisma/schema.prisma`
- `backend/src/auth/*`
- `backend/src/properties/*`
- `backend/src/listings/*`
- `backend/src/messages/*`
- `backend/src/units/*`
- `backend/src/tenants/*`
- `backend/src/leases/*`
- `backend/src/payments/*`
- `backend/src/maintenance/*`
- `backend/src/messages/*`
- `backend/src/announcements/*`
- `backend/src/documents/*`
- `backend/src/notifications/*`
- `backend/src/vendors/*`
- `backend/src/audit-logs/*`
- `backend/src/emails/*`
- `backend/src/storage/*`
- `frontend/src/app/admin/*`
- `frontend/src/app/tenant/*`
- `frontend/src/app/properties/page.tsx`
- `frontend/src/app/properties/[id]/page.tsx`
- `frontend/src/app/agent/listings/*`
- `frontend/src/app/admin/listings/*`
- `frontend/src/app/admin/inquiries/*`
- `frontend/src/app/agent/inquiries/*`
- `frontend/src/context/auth-context.tsx`
- `frontend/src/proxy.ts`
- `frontend/src/lib/portal-domains.ts`
- `frontend/src/lib/auth-routing.ts`
- `backend/src/common/config/portal-urls.ts`

This file should be updated whenever a checklist item becomes fully wired and verified. A status should move to **DONE** only after the required data model, backend behavior, authorization, frontend/API integration, and relevant tests are all present.
