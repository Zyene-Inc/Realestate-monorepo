# Johnson Realty CRM — Master Architecture & Build Plan

> Implementation status overlay for the master architecture document supplied on August 20, 2026.
>
> Original plan prepared: August 19, 2026  
> Repository audited: `pavanganta0110/coach-johnson-realty` at commit `23bae9e`  
> Audit date: August 20, 2026  
> This repository copy records what is implemented, partially implemented, pending, or blocked by an open business decision.

## Status legend

- **DONE** — implemented end to end in the current code, with a usable backend/data path and corresponding UI or API where required.
- **PARTIAL** — a meaningful foundation exists, but the planned capability is not complete or is not wired end to end.
- **PENDING** — the planned capability is not implemented. A static mockup, empty module, dependency entry, TODO, or database placeholder alone does not count as implementation.
- **BLOCKED** — implementation depends on a business decision identified by the master plan.

## Current progress snapshot

### Phased build plan progress

The phased plan in Part 12 contains 40 separately auditable work items.

| Status | Items | Share |
|---|---:|---:|
| **DONE** | 21 | 52.5% |
| **PARTIAL** | 7 | 17.5% |
| **PENDING** | 12 | 30% |
| **BLOCKED** | 0 | 0% |

Using `DONE = 1`, `PARTIAL = 0.5`, and `PENDING/BLOCKED = 0`, the plan is **61.25% complete**.

Phases 1 through 5 are complete. Agent signup, delivered email verification, pending review, decline, profile correction, audited resubmission, and approval are production-verified through the Vercel web/API deployments and connected Supabase project. The approved-agent listing workflow, role-separated portals, private documents, buyer inquiry routing, audited agent replies/read receipts, Johnson Realty oversight, lifecycle emails, and approved-only public sale feed are implemented and integration-tested. Home-sale funds remain outside the platform; Johnson Realty will record received commissions manually.

### Existing platform foundation

The codebase is not only 20% of a product. Alongside the plan-specific work, it contains a broader generic property-management foundation. Across the 21 baseline capabilities assessed in Part 10, the current code has:

| Status | Capabilities | Share |
|---|---:|---:|
| **DONE** | 8 | 38.1% |
| **PARTIAL** | 8 | 38.1% |
| **PENDING** | 5 | 23.8% |

Weighted the same way, the current baseline capability footprint is **57.1%**. This second metric explains the structural head start without overstating completion of the remaining end-to-end workflows.

## Audit corrections to the original gap analysis

The original plan correctly identified the major missing architecture, but several generic modules are less complete than the module names suggest:

- `maintenance` has an empty controller and service. Tenant maintenance list/create behavior exists inside `TenantsService`, while the admin frontend calls `/admin/maintenance` endpoints that do not exist. Status: **PARTIAL**, not fully built.
- `messages` has a generic Prisma model and service, but its controller is empty; both admin and tenant message pages use static data. Status: **PARTIAL**.
- `announcements` has a Prisma model and service, but its controller is empty and both announcement pages use static data. `notifications` is only an empty module. Status: **PARTIAL**.
- `vendors` has a model and service, but its controller is empty and the admin page is static. Status: **PARTIAL**.
- `documents` is an empty module. Generic tenant document records and S3 upload infrastructure exist, but no document API or end-to-end UI flow exists. Status: **PARTIAL**.
- The Stripe package and PaymentIntent fields are present, but payment code explicitly contains future-integration TODOs. The tenant checkout and admin Stripe settings are static mockups. Stripe/Stripe Connect status: **PENDING**.
- Public properties and multiple admin pages use hard-coded arrays rather than backend data. These pages are useful UI groundwork, not completed workflows.
- Backend dependencies and frontend dependencies are installed. The backend production build and test suite pass, and the frontend production build passes.
- The repository's original migration history incorrectly mixed a PostgreSQL Prisma schema with SQLite migration SQL and a SQLite migration lock. The initial migration and lock are now normalized to PostgreSQL so a fresh environment matches the documented architecture.

---

## Part 1 — Business Model Overview

Johnson Realty operates one public apex website, five role-specific portal subdomains, and two separate business verticals:

1. **Buy/Sell** — approved independent agent companies submit sale listings for Johnson Realty approval; buyers contact the listing agent while Johnson Realty retains oversight.
2. **Rent/Tenant** — Johnson Realty staff directly manage rentals for multiple property owners, serve tenants, collect rent, and route owner proceeds through Stripe Connect after retaining a management commission.

The vertical split is now **PARTIAL**: buy/sell classification, workflow routing, approved-only publishing, hostname isolation, and role gates are live, while direct rental publishing and production portal-domain assignment remain pending.

### Actors required by the target architecture

| Actor | Current implementation status |
|---|---|
| Johnson Realty main admin / `SUPER_ADMIN` | **PARTIAL** — cross-vertical portal access and agent-chat oversight exist; remaining rental operations and reporting are incomplete. |
| Sub-agent company / `AGENT` | **DONE for the current company model** — role, signup, approval, protected listing workspace, company settings, private documents, listing workflow, and buyer messaging are live. Multi-user company membership is not yet modeled. |
| Buyer/prospect | **PARTIAL** — sale listing inquiries and replies are live; rental prospect/application workflows remain pending. |
| Property owner | **PARTIAL** — owner model and rental-property relationship exist; management UI and payout onboarding do not. |
| Tenant admin staff / `TENANT_ADMIN` | **PARTIAL** — target role and generic admin surface exist; the dedicated portal and frontend role gating do not. |
| Tenant | **DONE as a foundation** — role, profile, auth, lease/payment views, and tenant portal routes exist; several portal screens are still static or incomplete. |

## Part 2 — Public Website Architecture

| Requirement | Status | Evidence / pending work |
|---|---|---|
| Public apex domain with separate approved sale and published rental feeds | **PARTIAL** | `coachjohnsonrealty.com/properties` uses the approved-only sale API/feed; `/rentals` and its detail/application routes remain pending. |
| Role-specific portal subdomains | **PARTIAL** | Hostname routing, canonical role redirects, shared Supabase session cookies, and environment configuration cover `agents`, `properties-admin`, `rental-admin`, `tenant`, and `admin`. Vercel domain assignment, DNS, and a production cross-domain auth test remain. Backend RBAC remains authoritative. |
| Buy/sell listing page with agent profile and listing-scoped contact action | **DONE** | Approved listings have public detail pages with agent identity, email, and phone actions; CRM chat is a later phase. |
| Rent listing page with availability/specs and Johnson Realty contact action | **PENDING** | Public properties page is hard-coded and has no detail/contact workflow. |
| Decide whether sale money moves through the platform | **DONE** | Home purchase funds, loans, escrow, and closing payments remain outside the CRM. Johnson Realty only records commission revenue manually after it is received. |

Production hostname map:

| Hostname | Surface | Role |
|---|---|---|
| `coachjohnsonrealty.com` | Corporate site, `/properties`, and future `/rentals` | Public |
| `agents.coachjohnsonrealty.com` | Agent/sub-company portal | `AGENT` |
| `properties-admin.coachjohnsonrealty.com` | Buy/Sell administration | `SALES_ADMIN` |
| `rental-admin.coachjohnsonrealty.com` | Rental and lease administration | `TENANT_ADMIN` |
| `tenant.coachjohnsonrealty.com` | Tenant portal | `TENANT` |
| `admin.coachjohnsonrealty.com` | Cross-vertical administration | `SUPER_ADMIN` |

## Part 3 — Buy/Sell Vertical

The buy/sell listing and buyer-messaging workflows are implemented end to end; manual commission recording remains pending:

- **DONE as a foundation:** `Agent` entity, `AGENT` role, account-status enum, approval metadata, and verification-document references.
- **DONE as a foundation:** sale property classification, agent linkage, listing-status enum, review metadata, price, specs, photos, and document references.
- **DONE:** Agent registration, pending-account creation, Johnson Realty approval queue, approve/decline transitions, reason capture, protected APIs, frontend review UI, and audit events.
- **DONE:** Listing submission/review/rejection state machine with optimistic status transitions and audit events.
- **DONE:** Approved listing edits and asset changes reset the listing to review and immediately remove it from the public feed.
- **DONE:** Private account-level and per-listing documents use direct signed uploads and short-lived server-authorized download links; agents manage their account files and sales reviewers can inspect them.
- **DONE:** Listing-scoped buyer inquiry threads with hashed browser-held access tokens and approved-listing-only creation.
- **DONE:** Agent inbox, buyer and agent replies, open/closed state, read receipts, routing notifications, and message audit events.
- **DONE:** `SUPER_ADMIN` and `SALES_ADMIN` standing read-only access across agent threads; supervisory roles cannot reply as an agent.
- Manual Johnson Realty commission records tied to closed sale listings; no online sale payment or agent-payout processing
- **DONE:** Sale listing submitted, resubmitted, approved, and rejected emails are wired through Resend.
- **DONE:** Agent verification, approval, decline, resubmission-received, and reviewer-resubmission emails are wired through Resend. The sender domain and deterministic production delivery are verified.

Generic auth, storage, email, message, and audit services support the completed sale workflows and remain reusable for future rental workflows.

## Part 4 — Rent/Tenant Vertical

| Requirement | Status | Evidence / pending work |
|---|---|---|
| Generic `Property`, `Unit`, `Lease`, and `Tenant` data models | **DONE as a foundation** | Prisma relations and basic CRUD/tenant queries exist. |
| Tenant authentication and invitation | **DONE as a foundation** | There is no public tenant signup. Protected Rental/Super Admin invitation creates the Supabase identity, application user, and tenant profile; password reset and RBAC infrastructure are wired. |
| Tenant dashboard and active lease retrieval | **DONE as a foundation** | Backend routes and frontend API calls exist. |
| Tenant maintenance submission/list | **PARTIAL** | Tenant endpoints exist; photos are not persisted by create flow, admin endpoints are missing, and vendor workflow is not wired. |
| Manual payment ledger/history | **DONE as a foundation** | Payment records, status updates, overdue lookup, audit events, and tenant history exist. This is not online rent collection. |
| Direct rental property publishing | **PARTIAL** | Generic admin property CRUD exists, but admin/public pages are static and there is no `publishStatus` or public API. |
| Property owner entity and property ownership linkage | **DONE as a foundation** | `PropertyOwner`, payout state, commission rate, owner/property relation, and seeded owner linkage exist. |
| Owner Stripe Connect onboarding and payout status | **PENDING** |
| Block rent collection until owner payout setup is active | **PENDING** |
| Destination charges and commission split | **PENDING** |
| Owner-attributed payment ledger/reporting | **PENDING** |
| Tenant documents, chat, announcements, and autopay end to end | **PARTIAL** | Models/pages or UI groundwork exist, but several pages are static and APIs are missing. |

## Part 5 — Payments Architecture

| Requirement | Status |
|---|---|
| Manual rent payment ledger | **DONE as a foundation** |
| Tenant card/ACH collection | **PENDING** |
| Rent-side Stripe Connect owner onboarding | **PENDING** |
| Rent-side destination charge with `transfer_data.destination` | **PENDING** |
| Johnson Realty fee with `application_fee_amount` | **PENDING** |
| Payment attribution to property owner and net payout | **PENDING** |
| Webhook processing | **PENDING** |
| Home purchase, loan, escrow, or closing-payment processing | **OUT OF SCOPE** — handled outside the CRM by the applicable lenders, title/closing parties, and financial institutions. |
| Manual buy/sell commission ledger | **PENDING** — Johnson Realty staff record commission income after receipt; no Stripe charge is created. |

The manual sale commission record should include the closed property/listing, responsible agent, optional sale price, commission amount, date received, payment method (`ACH`, `CASH`, `CHECK`, `WIRE`, or `OTHER`), optional reference number, notes, recording admin, timestamps, and an auditable void/correction path. The CRM must not collect buyer bank, loan, escrow, or full purchase-payment details.

The `stripe` dependency, `stripePaymentIntentId` placeholder, Stripe-branded UI, and comments for future endpoints are not counted as payment integration.

## Part 6 — Email Architecture

### Implemented foundation

- **DONE as a foundation:** Resend service integration.
- **DONE as a foundation:** tenant invitation and password-reset email calls are wired to auth flows.
- **PARTIAL:** templates exist for rent reminder, late notice, payment recorded, and maintenance update, but their full event-trigger wiring was not found.

### Remaining lifecycle coverage

- **DONE:** Agent signup verification, approval, decline, resubmission confirmation, and reviewer notification
- **DONE:** Sale listing submitted, approved, rejected, edited, and resubmitted notifications
- **DONE:** Buyer inquiry, buyer reply, and agent reply notifications
- Rental prospect/application status notifications
- Lease signing invitations
- Owner Stripe onboarding, onboarding completion, payout, and statement emails
- Centralized/versioned template registry
- Delivery, bounce, and open tracking written to `EmailLog`
- Retry strategy for critical emails
- Optional per-organization branding

Overall email architecture status: **PARTIAL**.

## Part 7 — E-Signature Architecture

Provider selection, envelope creation, webhooks, signing UI, audit trail, and immutable completed-document storage are all **PENDING**. No e-signature integration exists.

## Part 8 — Messaging and Communication Architecture

| Requirement | Status |
|---|---|
| Generic direct `Message` model and basic service | **PARTIAL foundation** |
| Tenant-scoped management inbox | **PARTIAL** — schema has `tenantId`, but controller/API and live UI are absent. |
| Listing/agent-scoped buy/sell threads | **DONE** — approved-listing inquiry creation, ownership routing, buyer access token, both-side replies, and close/reopen state are live. |
| Main-admin standing oversight | **DONE** — Sales and Super Admin have cross-agent read-only conversation visibility and cannot impersonate an agent reply. |
| Read receipts beyond one `isRead` flag | **PARTIAL** — inquiry messages have per-message recipient read timestamps; generic tenant messages still use one boolean. |
| Message audit events | **PARTIAL** — inquiry creation, messages, reads, and state transitions are audited; tenant messaging remains incomplete. |
| Rent announcements | **PARTIAL** — model/service exist; controller and live pages are absent. |
| Announcement acknowledgments and agent-wide notices | **PENDING** |

## Part 9 — Two Admin Portals

The frontend uses one Vercel deployment with hostname isolation: `properties-admin.coachjohnsonrealty.com` for Buy/Sell staff, `rental-admin.coachjohnsonrealty.com` for rental staff, `admin.coachjohnsonrealty.com` for Super Admin, `agents.coachjohnsonrealty.com` for approved agent companies, and `tenant.coachjohnsonrealty.com` for tenants. Existing path prefixes remain internal route organization within those hostnames.

| Requirement | Status |
|---|---|
| Buy/Sell Admin portal shell | **DONE** — Sales Admin receives a dedicated live dashboard, sales-only navigation, agent directory, and listing review workspace. |
| Tenant Admin portal shell | **DONE** — Tenant Admin receives rental-management navigation and is denied sales routes; Sales Admin is denied rental routes. |
| Tenant-facing portal | **PARTIAL** — several real API-backed views exist; messages/documents/announcements/pay-rent remain static or incomplete. |
| Route-level frontend role gating | **DONE** — hostname isolation, canonical role redirects, and explicit Agent, Tenant, Sales Admin, Rental Admin, and Super Admin shell guards are implemented. Backend APIs enforce roles independently. |
| Target roles `AGENT`, `SALES_ADMIN`, `TENANT_ADMIN`, `TENANT`, `SUPER_ADMIN` | **DONE as a foundation** — all target enum values exist and rental admin controllers now use `TENANT_ADMIN`. |

## Part 10 — Evidence-Based Gap Analysis

| Capability | Audited status | Evidence / reasoning |
|---|---|---|
| Role-based auth guards | **DONE** | JWT guard, roles decorator, and roles guard exist and are used on several admin controllers. |
| Leases, tenants, units | **DONE** | Prisma models, services, controllers, and several live frontend API calls exist. |
| Maintenance | **PARTIAL** | Tenant list/create works through `TenantsService`; dedicated module is empty and admin API is missing. |
| Documents, storage | **PARTIAL** | S3 upload service and document records exist; document module/API and live UI are missing. |
| Messages | **PARTIAL** | Generic model/service exist; controller is empty and pages are static. |
| Announcements, notifications | **PARTIAL** | Announcement model/service exist; controller/pages are not wired and notification module is empty. |
| Audit logs | **DONE** | Generic audit service is used for login, tenant invites, password resets, and manual payment changes. |
| Vendors | **PARTIAL** | Model/service exist; controller and live frontend integration are missing. |
| Emails | **PARTIAL** | Resend integration and some templates exist; target lifecycle, tracking, and retries are incomplete. |
| Payments | **PARTIAL** | Manual payment ledger works; online payment, Connect, owner attribution, and split logic are absent. |
| Properties | **PARTIAL** | Sale workflow APIs and its live public feed exist; rental admin/public screens remain static. Legacy rental CRUD is constrained so it cannot bypass sale approvals. |
| Agent/organization entity | **DONE as a foundation** | `Agent` profile, role, account state, approval metadata, payout reference, and property relationship exist. |
| Property owner entity | **DONE as a foundation** | `PropertyOwner`, payout state, commission rate, Stripe account reference, and property relationship exist. |
| Account approval workflow | **DONE** | Public agent application, pending profile creation, protected approval queue, approve/decline transitions, reason capture, status UI, and audit events are implemented and integration-tested. |
| Listing approval workflow | **DONE** | Draft, submit, reject, resubmit, approve, re-review, private uploads, role gates, audit events, emails, and public visibility were verified against Supabase. |
| Sale/rent listing split | **PARTIAL** | Sale APIs enforce the approved-only workflow and rental CRUD cannot access sale records; rental publishing remains incomplete. |
| Two admin portal shells | **DONE** | Sales and rental admins receive role-specific dashboards/navigation, route-level frontend redirects, and matching backend RBAC; Super Admin retains both. |
| Rent-side Stripe Connect | **PENDING** | Dependency/placeholders only; no Stripe client calls or webhooks. Stripe is not planned for buy/sell. |
| E-signature | **PENDING** | No provider integration. |
| Main-admin chat oversight | **DONE** | Sales/Super Admin have an explicit read-only inquiry API and UI, with RBAC preventing replies and Tenant Admin access. |
| Owner onboarding | **PENDING** | No owner or Connect onboarding flow. |

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

Phase score: **3 / 3**. Verified by backend unit tests, `backend/scripts/verify-agent-onboarding.ts` locally and against the production Vercel API, plus a production signup → Resend delivery → Supabase verification link → sign-in → pending-account smoke test. All verification users and audit rows were removed afterward.

### Phase 3 — Listing Creation and Approval Workflow — **DONE**

- **DONE** — Approved-agent draft creation, direct signed photo upload, private document upload/download, and submission.
- **DONE** — Johnson Realty sales review queue with role protection, approve/reject, required reason, and an API-backed audit timeline visible in the Sales Admin interface.
- **DONE** — Edits or new assets on approved listings trigger optimistic re-review and remove public visibility until re-approved.
- **DONE** — Submitted, resubmitted, approved, and rejected lifecycle emails are wired through Resend.
- **DONE** — Public Buy/Sell list and detail APIs/UI expose only approved listings and exclude private documents.

Phase score: **5 / 5**. Verified with `backend/scripts/verify-listing-workflow.ts`, Prisma validation, backend and frontend production builds, scoped lint for the Phase 1/3 files, and the connected Supabase project. Repository-wide lint is not clean: the existing baseline contains 111 backend errors and 51 frontend errors in older rental/tenant modules outside the Phase 1/3 scope.

### Phase 4 — Buy/Sell Admin Portal — **DONE**

- **DONE** — Split Buy/Sell and Tenant Admin experiences with role-specific dashboards, navigation, frontend redirects, and backend role denial; `SUPER_ADMIN` retains cross-vertical access.
- **DONE** — Approved-agent company/profile settings are live for company name, primary contact, and phone. Bank and payout collection is intentionally excluded from buy/sell.
- **DONE** — Agent account and per-listing document upload, private signed access, agent removal, and sales-reviewer inspection are live through Supabase Storage. Document removal commits the database/audit change before Storage cleanup so a failed database write cannot leave a reference to a deleted object.

Phase score: **3 / 3**. Verified through live Supabase uploads/downloads, cross-role denial tests, audit records, backend tests/build, and the 43-route frontend production build.

### Phase 5 — Buyer Chat Routing and Oversight — **DONE**

- **DONE** — Public inquiries are accepted only for approved sale listings and routed to the listing's owning approved agent; another agent cannot access the thread.
- **DONE** — Johnson Realty Sales/Super Admin receives cross-agent read-only oversight while Tenant Admin is denied and supervisors cannot reply as agents.
- **DONE** — Inquiry creation, buyer/agent messages, visible both-side read receipts, and close/reopen transitions are audit-logged and lifecycle emails are wired through Resend. Read audit events are emitted only when unread rows change.
- **DONE** — Agent and Sales Admin inquiry lists and all message threads use bounded cursor pagination, backed by agent/timestamp and global timestamp indexes.

Phase score: **3 / 3**. Verified through the live buyer-to-agent-to-oversight lifecycle, invalid-token and cross-agent denial tests, audit-count assertions, backend tests/build, and the 43-route frontend production build.

### Phase 6 — Rent-Side Direct Publishing — **PARTIAL**

- **PARTIAL** — Tenant admin creates/publishes rental listings directly without an approval gate. Generic protected property CRUD exists, but there is no publish state, live admin form submission, or public API-backed feed.
- **PARTIAL** — Wire leases, tenants, units, and maintenance fully into the direct-publish flow. The core models and several APIs exist, but admin maintenance is missing and several frontend screens are static.
- **PARTIAL** — Tenant-side messages route directly to the Tenant Admin inbox. The generic message model includes tenant linkage and a service exists, but there is no controller/API or live inbox UI.

Phase score: **1.5 / 3**.

### Phase 6.5 — Property Owner Payout Accounts — **PARTIAL, HIGH PRIORITY**

- **DONE** — Add `PropertyOwner` entity and property linkage.
- **PENDING** — Owner onboarding UI, Stripe Connect invitation, and `payoutStatus` tracking.
- **PENDING** — Block rent collection until the property's owner payout setup is active.
- **PENDING** — Destination charges with `transfer_data.destination` and `application_fee_amount`.
- **PENDING** — Owner-level payout and commission reporting.

Phase score: **1 / 5**.

### Phase 7 — Email Architecture Completion — **PARTIAL**

- **PARTIAL** — Cover every account, listing, buyer/lead, rent/tenant, and owner event. Resend and several tenant templates exist, but most target events and trigger wiring are missing.
- **PENDING** — Delivery/bounce tracking and retry logic for critical emails.

Phase score: **0.5 / 2**.

### Phase 8 — Manual Buy/Sell Commission Ledger — **PARTIAL**

- **DONE** — Resolved the buy/sell commercial model: sale funds stay outside the CRM and Johnson Realty records received commission manually.
- **PENDING** — Implement the protected manual commission ledger, correction/void audit trail, listing and agent attribution, and revenue reporting. Do not implement Stripe or online purchase-money collection for buy/sell.

Phase score: **1 / 2**.

### Phase 9 — E-Signature Integration — **PENDING**

- **PENDING** — Select and integrate an e-signature provider.
- **PENDING** — Lease, disclosure, and agreement signing flows.
- **PENDING** — Store signed documents with a complete audit trail.

Phase score: **0 / 3**.

### Phase 10 — Compliance, Audit, and Cross-Vertical Reporting — **PENDING**

- **PARTIAL** — Account approvals and listing creation/submission/review decisions are audited; payout-event auditing waits on rent-side payout implementation.
- **PENDING** — Admin reporting for pending agents/listings, rentals by owner, occupancy, and commission/revenue split. The current reports page is static.

Phase score: **0.5 / 2**.

### Phase 11 — Hardening and Launch Readiness — **PENDING**

- **PARTIAL** — Security review of role-based access across all portals. Backend RBAC, rate limiting, hostname isolation, canonical role redirects, portal shell guards, and chat oversight exist; production-domain verification and broader endpoint review remain.
- **PENDING** — Load and reliability testing of rent-side payment flows and the manual sale-commission recording workflow.
- **PENDING** — Full lifecycle email-delivery audit.
- **PARTIAL** — Vercel deployment documentation exists; broader operations documentation and staff training remain pending.

Phase score: **1 / 4**.

### Total phased score

`24.5 weighted points / 40 items = 61.25% complete`.

---

## Part 13 — Recommended Next Implementation Order

The next work should follow dependency order:

1. Replace static rental admin/public property data with real direct-publishing APIs and complete the Tenant Admin workflows in Phase 6.
2. Complete Phase 6.5 before enabling real rent collection; owner payout readiness is a safety requirement.
3. Implement the manual buy/sell commission ledger after adding a listing-close state; do not add Stripe to buy/sell.
4. Complete remaining email triggers alongside each workflow and add delivery/bounce handling in Phase 7.
5. Select and integrate the e-signature provider in Phase 9 after document workflows stabilize.
6. Attach the six custom Johnson Realty hostnames after `coachjohnsonrealty.com` is owned or DNS-verified in the Vercel team, then replace the working Vercel-alias auth callbacks with the custom-domain callback set.

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
