# Full codebase audit — 2026-08-23

## Scope and method

The complete repository was enumerated before edits and re-enumerated after the standards pass. Every existing tracked or unignored file was opened structurally and read successfully (source/config/document text via parser or checksum; binary assets via file metadata and reference search). The final standards gate covers 359 files, including this report. Generated dependencies, build output, Git internals, local secrets, and coverage output are excluded.

Skills applied:

1. `full-codebase-audit-and-micro-completion` — architecture, correctness, security, performance, tests, incomplete behavior, dependencies, migrations, and configuration.
2. `codebase-standards-auditor` — naming, structure, file size, dead code, duplication, generated files, and repository hygiene.
3. `react-doctor` — React/Next.js correctness, performance, security, and maintainability diagnostics.
4. `supabase` — Supabase Auth, Storage, database, migration, and RLS review.
5. `supabase-postgres-best-practices` — schema, index, RLS, and query-pattern review.

## Changes made

| Final file and lines | Change |
| --- | --- |
| `.gitignore:4` | Ignore generated `frontend/next-env.d.ts`. |
| `backend/package.json:14,26,38-73,109`; `backend/package-lock.json` | Removed unused `stripe` and `patch-package`, removed unsafe seed wiring, and retained only `prisma generate` in postinstall. |
| `backend/prisma/seed.ts` (deleted, formerly 1-192) | Removed destructive seed that deleted production tables and created predictable-password Supabase users. |
| `backend/src/auth/authenticated-request.ts:4-19` | Centralized optional guard request and required controller request types. |
| `backend/src/auth/auth.controller.ts:22,54-71` | Adopted required authenticated request type. |
| `backend/src/agents/agents.controller.ts:26,35-122` | Adopted required authenticated request type. |
| `backend/src/commissions/sale-commissions.controller.ts:25,55-72` | Adopted required authenticated request type. |
| `backend/src/e-signatures/e-signatures.controller.ts:15,32-208` | Adopted required authenticated request type and removed repeated non-null assertions. |
| `backend/src/leases/leases.controller.ts:18,28-58` | Adopted required authenticated request type. |
| `backend/src/listings/sale-listings.controller.ts:27,36-155` | Adopted required authenticated request type. |
| `backend/src/maintenance/maintenance.controller.ts:24,44-94` | Adopted required authenticated request type. |
| `backend/src/messages/messages.controller.ts:36,46-204` | Adopted required authenticated request type. |
| `backend/src/payments/payments.controller.ts:17,34-63` | Adopted required authenticated request type. |
| `backend/src/properties/properties.controller.ts:23,33-100` | Adopted required authenticated request type. |
| `backend/src/tenants/tenant-portal.controller.ts:7,16-21` | Adopted required authenticated request type. |
| `backend/src/tenants/tenants.controller.ts:16,36-39` | Adopted required authenticated request type. |
| `backend/src/units/units.controller.ts:18,28-58` | Adopted required authenticated request type. |
| `backend/src/emails/emails.controller.ts:1-19` | Consolidated the duplicate Nest import. |
| `backend/src/agents/agents.service.ts:195-229` | Preserved database-first document deletion and made post-commit Storage deletion best-effort, avoiding a false request failure after the database commit. |
| `backend/src/agents/agents.service.spec.ts:43-103` | Covers DB-failure ordering, DB-before-Storage order, and Storage-cleanup failure semantics. |
| `frontend/src/lib/portal-domains.ts:68-90` | Correctly normalizes raw and bracketed IPv6 loopback hosts. |
| `frontend/scripts/verify-domain-routing.mjs:37-38` | Added raw/bracketed IPv6 routing regression checks. |
| `frontend/src/lib/e-signatures.ts:52-60`; `frontend/src/components/signatures/signature-portal-page.tsx:103` | Replaced repeated terminal-status array scans with a typed Set lookup. |
| `frontend/src/lib/sale-commissions.ts:104-119` | Hoisted reusable currency/date formatters out of render-time paths. |
| `frontend/src/app/admin/e-signatures/page.tsx:1-298` | Reduced page to data loading and orchestration. |
| `frontend/src/app/admin/e-signatures/_components/e-signature-dialogs.tsx:1-359` | Extracted typed create/details dialogs and changed template filtering to a single pass. |
| `frontend/src/app/admin/sales/commissions/page.tsx:1-418` | Replaced related ledger state with a reducer and reduced page to workflow orchestration. |
| `frontend/src/app/admin/sales/commissions/_components/commission-dialog-types.ts:1-65` | Centralized dialog models, constants, and form types. |
| `frontend/src/app/admin/sales/commissions/_components/commission-dialogs.tsx:1-27` | Added the focused dialog composition boundary. |
| `frontend/src/app/admin/sales/commissions/_components/commission-entry-dialog.tsx:1-211` | Extracted receipt-entry workflow. |
| `frontend/src/app/admin/sales/commissions/_components/commission-details-dialog.tsx:1-156` | Extracted detail/audit workflow. |
| `frontend/src/app/admin/sales/commissions/_components/commission-correction-dialog.tsx:1-163` | Extracted correction workflow. |
| `frontend/src/app/admin/sales/commissions/_components/commission-void-dialog.tsx:1-66` | Extracted void workflow. |
| `frontend/src/app/admin/sales/commissions/_components/commission-ledger-content.tsx:1-352` | Extracted report cards, filters, analytics, and paginated receipt table. |
| `frontend/src/components/public/home-inventory.tsx:87-120,188-300` | Replaced chained list scans with bounded single-pass preview builders and reduced the parent renderer. |
| `frontend/src/components/public/home-inventory-sections.tsx:1-188` | Extracted reusable inventory and featured-area sections. |
| `docs/johnson-realty-crm-master-architecture.md:53,291` | Corrected Stripe-package status and documented the verified repository-wide zero-error lint result. |
| `frontend/public/hero-community.png`, `frontend/public/hero_exterior.png`, `frontend/public/neyans_place_building.png` (deleted) | Removed assets proven unreferenced by source, config, seed/scripts, templates, dynamically-built paths, and live property/database records. They remain recoverable from Git. |
| `frontend/src/components/ui/button-variants.ts:1-39`; `frontend/src/components/ui/button.tsx:1-22` | Separated the non-component variant API from the Button component, eliminating the Fast Refresh module-boundary warning and updating every consumer. |
| `frontend/src/app/admin/reports/_components/audit-timeline.tsx:1-157`; `owner-report-table.tsx:1-115`; `report-sections.tsx:1-326` | Split the 582-line multi-responsibility report module into audit, owner-ledger, and summary boundaries. |
| `frontend/src/app/admin/properties/page.tsx:1-257`; `_components/rental-property-types.ts:1-80`; `rental-property-grid.tsx:1-92`; `rental-property-dialog.tsx:1-184` | Split the 579-line rental-property page into typed domain state, list rendering, dialog rendering, and orchestration. |
| `frontend/public/about-interior.png`; `frontend/src/app/about/page.tsx:31` | Renamed the final active snake-case asset to kebab-case and updated its only reference. |
| `backend/src/listings/sale-listings.service.ts:620-622` | Removed an unreachable duplicate asset-membership branch. |
| `backend/src/listings/sale-listings.service.spec.ts:1-436`; `tenants/tenants.service.spec.ts:1-147`; `units/units.service.spec.ts:1-224` | Added repeatable sale-listing, tenant, and unit workflow/failure-path tests. |
| `backend/src/auth/jwt-auth.guard.spec.ts:1-143`; `roles.guard.spec.ts:1-45`; `common/filters/all-exceptions.filter.spec.ts:1-68` | Added direct security-boundary coverage for Supabase identity validation, role authorization, and safe exception responses. |
| `backend/package.json:24,94-145`; `.github/workflows/quality.yml:27-34` | Added non-hanging coverage reporters, regression thresholds, migration/standards gates, and mandatory CI coverage/e2e tests. |
| `docs/database-migration-ledger.json:1-33`; `scripts/verify-migration-ledger.mjs:1-95`; `README.md:26` | Mapped all 19 live Supabase migration records to checked-in SQL, made unmapped SQL a CI failure, and explicitly recorded the one legacy history exception without rewriting production history. |
| `scripts/repository-standards.config.mjs:1-35`; `scripts/verify-repository-standards.mjs:1-95` | Enforced source/directory/public-asset naming, path hygiene, production debug removal, a 500-line default, and reviewed limits for six cohesive backend aggregates. |

Pre-existing working-tree changes were preserved, not authored by this audit: `backend/src/common/config/portal-urls.ts:1-73`, `backend/src/main.ts:7-51`, and `backend/src/common/config/portal-urls.spec.ts:1-85`. They implement/test CORS origin configuration and passed the final checks.

## Boundaries intentionally not changed

1. **One production migration-history decision remains explicit.** All 19 live entries now map to checked-in SQL and CI verifies the map. `20260822132441_add_auth_login_lockout_fields.sql` represents columns present in the schema but lacks a matching live ledger entry. Repairing the production history table is intentionally not performed without a separately reviewed production change.
2. **Coverage is now risk-based and enforced, not comprehensive.** The suite increased from 101 to 142 tests. Overall instrumented coverage is 35.86% lines, 34.8% statements, 31.74% branches, and 31.32% functions because Nest modules, thin controllers, DTO decorators, and provider-heavy legacy modules remain in the denominator. Critical gates now enforce 100% lines/functions for tenant workflows and auth guards, 89.74% unit-service lines, 62.2% sale-listing lines, and non-regressing global minimums.
3. **Static placeholder features remain product work:** admin vendors, admin/tenant announcements, tenant online payment/autopay, and Stripe settings contain demo/static behavior. They were not deleted because routes and phase documentation still reference them; implementing them requires product/business decisions.
4. **Payment status/amount combinations need business rules.** The service can represent combinations whose accounting meaning is ambiguous. No rule was invented because Johnson Realty’s manual receipt/refund semantics must be confirmed.
5. **Supabase advisors:** server-only tables have RLS enabled with no public policies (intentional deny-by-default); leaked-password protection remains unavailable/disabled at the Supabase plan level while application-side compromised-password checks remain active. Unused-index advisories are expected on the nearly empty project.
6. **React Doctor full-repository residuals (reviewed, not suppressed):**
   - Three client redirects are required by the browser-held Supabase session and render only “Checking access…” until resolved, so the reported wrong-page flash does not occur.
   - The browser artifact contains the expected public Supabase URL/publishable key and role labels. No service-role key or backend secret is present; all data authority remains behind Nest endpoints and deny-by-default RLS.
7. **Duplication:** jscpd reports 4.07% duplicated lines (103 small clones after adding test coverage). Most are test fixtures, decorators/imports, DTO validators, pagination shapes, or intentionally parallel agent/admin and tenant/admin workflows. Mechanical merging would couple domains more than it would simplify them.
8. **Large cohesive files are governed exceptions:** all frontend production files are below 500 lines. Six backend aggregate services have documented per-file ceilings and architectural reasons in `scripts/repository-standards.config.mjs`; CI fails if any exceeds its reviewed ceiling.
9. **Live verification fixtures were not deleted automatically.** Existing rows matching prior demo data were observed, but the admin account and property/tenant records may now be legitimate. External data deletion requires explicit record-level approval.

## Verification evidence

| Check | Result |
| --- | --- |
| Repository standards | PASS — `REPOSITORY_STANDARDS_VERIFIED (359 repository files)`; naming, path, asset, debug, temporary-file, and file-size gates clean. |
| Migration ledger | PASS — `MIGRATION_LEDGER_VERIFIED (19 applied, 1 explicit exception)`; every checked-in migration SQL file is mapped. |
| Backend lint | PASS — zero errors/warnings. |
| Backend build | PASS — Nest production compile. |
| Prisma validation | PASS — schema valid. |
| Backend unit tests | PASS — 27 suites, 142 tests, including enforced coverage thresholds. |
| Backend e2e | PASS — 1 suite, 1 test. |
| Backend coverage | PASS — 35.86% lines, 34.8% statements, 31.74% branches, 31.32% functions; targeted and global thresholds pass. JSON/text-only reporting exits normally without force termination. |
| Backend dead-code analysis | PASS — Knip has no unused files/exports/dependencies; one informational generated `.prisma` hint. |
| Frontend TypeScript | PASS — `tsc --noEmit`. |
| Frontend lint | PASS — zero errors/warnings. |
| Frontend dead-code analysis | PASS — Knip clean. |
| Frontend production build | PASS — Next.js 16.3.1, 49 routes generated. |
| Domain routing | PASS — `DOMAIN_ROUTING_VERIFIED`, including IPv6 loopback. |
| React Doctor, changed scope | PASS — 100/100, no issues. |
| React Doctor, full repository | REVIEWED — 75/100, four intentional diagnostics classified above; changed scope is clean. |
| Dependency security | PASS — npm audit reports zero vulnerabilities for backend and frontend. |
| Circular dependencies | PASS — none across 126 backend or 130 frontend source files. |
| Duplication | REVIEWED — 4.07%, below the 5% review threshold used for this audit. |
| Secret/debug scan | PASS — no production keys, private keys, debugger statements, unsafe eval, or production console logging. Verification-script success/error output is intentional. |
| Binary integrity | PASS — the active public image, favicon, and three two-page demo PDFs have valid file signatures. |
| Git whitespace check | PASS — `git diff --check`. |

## Anything not fully verifiable

- No production deployment or destructive live-database workflow was executed.
- Verdocs, Resend, and Supabase end-to-end external delivery were not repeated because they mutate external state and require live quotas/credentials; their configuration and existing verification scripts were inspected.
- The exact intent of legacy live fixture rows cannot be inferred safely.
- The one legacy login-lockout migration-history exception cannot be repaired without an explicit production ledger decision.

## Initial file inspection manifest

Every file below was covered in the initial pass. Source files were parsed and reference-searched; configs/docs/migrations were read; scripts were checked for cleanup and destructive behavior; assets were validated and reference-searched. The final re-scan additionally covered all files added during remediation: the six new backend specs, three rental-property components and their type module, two report components, extracted e-signature/commission/home sections, `button-variants.ts`, `about-interior.png`, the migration ledger/verifier, and the repository-standards configuration. The final automated inventory is the 359-file standards result above.

```text
.agents/skills/coach-johnson-design-system/SKILL.md
.agents/skills/coach-johnson-design-system/agents/openai.yaml
.github/workflows/quality.yml
.gitignore
DESIGN.md
PRODUCT.md
README.md
backend/.env.example
backend/.gitignore
backend/.prettierrc
backend/.vercelignore
backend/eslint.config.mjs
backend/nest-cli.json
backend/package-lock.json
backend/package.json
backend/patches/@verdocs+js-sdk+6.10.6.patch
backend/prisma/migrations/20260427180016_init/migration.sql
backend/prisma/migrations/20260820161000_use_supabase_auth/migration.sql
backend/prisma/migrations/20260820172000_lock_down_rls_trigger/migration.sql
backend/prisma/migrations/20260820215103_add_inquiry_pagination_indexes/migration.sql
backend/prisma/migrations/20260822172932_complete_phase_6_rental_workflows/migration.sql
backend/prisma/migrations/20260822180600_index_maintenance_unit/migration.sql
backend/prisma/migrations/20260822183141_complete_phase_7_email_architecture/migration.sql
backend/prisma/migrations/20260822184704_add_email_provider_attempt_key/migration.sql
backend/prisma/migrations/20260822184920_schedule_phase_7_email_retries/migration.sql
backend/prisma/migrations/20260822190600_move_pg_net_out_of_public/migration.sql
backend/prisma/migrations/20260822191000_align_email_log_defaults/migration.sql
backend/prisma/migrations/20260822192238_complete_phase_8_sale_commission_ledger/migration.sql
backend/prisma/migrations/20260822210321_complete_phase_9_verdocs_esignatures/migration.sql
backend/prisma/migrations/20260822224826_complete_phase_10_reporting/migration.sql
backend/prisma/migrations/20260822235105_complete_phase_11_launch_hardening/migration.sql
backend/prisma/migrations/20260823000325_index_remaining_foreign_keys_phase_11/migration.sql
backend/prisma/migrations/migration_lock.toml
backend/prisma/schema.prisma
backend/scripts/bootstrap-verdocs.ts
backend/scripts/sync-verdocs-env.ts
backend/scripts/verify-agent-onboarding.ts
backend/scripts/verify-email-architecture.ts
backend/scripts/verify-listing-workflow.ts
backend/scripts/verify-phase-10-reporting.ts
backend/scripts/verify-phase-11-launch-readiness.ts
backend/scripts/verify-rental-workflow.ts
backend/scripts/verify-sale-commission-workflow.ts
backend/scripts/verify-verdocs-activation.ts
backend/src/agents/agents.controller.ts
backend/src/agents/agents.module.ts
backend/src/agents/agents.service.spec.ts
backend/src/agents/agents.service.ts
backend/src/agents/dto/agent-document.dto.ts
backend/src/agents/dto/agent-input.dto.spec.ts
backend/src/agents/dto/decline-agent.dto.ts
backend/src/agents/dto/update-agent-profile.dto.ts
backend/src/announcements/announcements.controller.ts
backend/src/announcements/announcements.module.ts
backend/src/announcements/announcements.service.ts
backend/src/app.controller.spec.ts
backend/src/app.controller.ts
backend/src/app.module.ts
backend/src/app.service.ts
backend/src/audit-logs/audit-logs.controller.ts
backend/src/audit-logs/audit-logs.module.ts
backend/src/audit-logs/audit-logs.service.spec.ts
backend/src/audit-logs/audit-logs.service.ts
backend/src/audit-logs/dto/audit-log-query.dto.ts
backend/src/auth/auth.controller.ts
backend/src/auth/auth.module.ts
backend/src/auth/auth.service.spec.ts
backend/src/auth/auth.service.ts
backend/src/auth/authenticated-request.ts
backend/src/auth/dto/agent-signup.dto.ts
backend/src/auth/dto/auth-input.dto.spec.ts
backend/src/auth/dto/auth-input.transforms.ts
backend/src/auth/dto/login.dto.ts
backend/src/auth/dto/password-reset-request.dto.ts
backend/src/auth/dto/tenant-invite.dto.ts
backend/src/auth/dto/update-password.dto.ts
backend/src/auth/jwt-auth.guard.ts
backend/src/auth/password-security.service.spec.ts
backend/src/auth/password-security.service.ts
backend/src/auth/roles.decorator.ts
backend/src/auth/roles.guard.ts
backend/src/commissions/commissions.module.ts
backend/src/commissions/dto/commission.dto.ts
backend/src/commissions/sale-commissions.controller.ts
backend/src/commissions/sale-commissions.service.spec.ts
backend/src/commissions/sale-commissions.service.ts
backend/src/common/config/environment.spec.ts
backend/src/common/config/environment.ts
backend/src/common/config/portal-urls.spec.ts
backend/src/common/config/portal-urls.ts
backend/src/common/filters/all-exceptions.filter.ts
backend/src/documents/documents.module.ts
backend/src/e-signatures/dto/e-signature.dto.ts
backend/src/e-signatures/e-signatures.controller.ts
backend/src/e-signatures/e-signatures.module.ts
backend/src/e-signatures/e-signatures.service.spec.ts
backend/src/e-signatures/e-signatures.service.ts
backend/src/e-signatures/verdocs.service.spec.ts
backend/src/e-signatures/verdocs.service.ts
backend/src/emails/email-template.registry.spec.ts
backend/src/emails/email-template.registry.ts
backend/src/emails/emails.controller.ts
backend/src/emails/emails.module.ts
backend/src/emails/emails.service.spec.ts
backend/src/emails/emails.service.ts
backend/src/health/health.controller.ts
backend/src/leases/dto/lease.dto.ts
backend/src/leases/leases.controller.ts
backend/src/leases/leases.module.ts
backend/src/leases/leases.service.spec.ts
backend/src/leases/leases.service.ts
backend/src/listings/dto/create-sale-listing.dto.ts
backend/src/listings/dto/listing-asset.dto.ts
backend/src/listings/dto/reject-sale-listing.dto.ts
backend/src/listings/dto/update-listing-availability.dto.ts
backend/src/listings/dto/update-sale-listing.dto.ts
backend/src/listings/listings.module.ts
backend/src/listings/sale-listings.controller.ts
backend/src/listings/sale-listings.service.ts
backend/src/main.ts
backend/src/maintenance/dto/maintenance.dto.ts
backend/src/maintenance/maintenance.controller.ts
backend/src/maintenance/maintenance.module.ts
backend/src/maintenance/maintenance.service.spec.ts
backend/src/maintenance/maintenance.service.ts
backend/src/messages/dto/listing-inquiry.dto.ts
backend/src/messages/dto/tenant-message.dto.ts
backend/src/messages/listing-inquiries.service.spec.ts
backend/src/messages/listing-inquiries.service.ts
backend/src/messages/messages.controller.ts
backend/src/messages/messages.module.ts
backend/src/messages/messages.service.spec.ts
backend/src/messages/messages.service.ts
backend/src/notifications/notifications.module.ts
backend/src/payments/dto/payment.dto.ts
backend/src/payments/payments.controller.ts
backend/src/payments/payments.module.ts
backend/src/payments/payments.service.spec.ts
backend/src/payments/payments.service.ts
backend/src/prisma/prisma.module.ts
backend/src/prisma/prisma.service.ts
backend/src/properties/dto/rental-property.dto.ts
backend/src/properties/properties.controller.ts
backend/src/properties/properties.module.ts
backend/src/properties/properties.service.spec.ts
backend/src/properties/properties.service.ts
backend/src/reports/dto/report-query.dto.ts
backend/src/reports/reports.controller.ts
backend/src/reports/reports.module.ts
backend/src/reports/reports.service.spec.ts
backend/src/reports/reports.service.ts
backend/src/tenants/dto/update-tenant.dto.ts
backend/src/tenants/tenant-portal.controller.ts
backend/src/tenants/tenants.controller.ts
backend/src/tenants/tenants.module.ts
backend/src/tenants/tenants.service.ts
backend/src/types/express.d.ts
backend/src/units/dto/unit.dto.ts
backend/src/units/units.controller.ts
backend/src/units/units.module.ts
backend/src/units/units.service.ts
backend/src/vendors/vendors.controller.ts
backend/src/vendors/vendors.module.ts
backend/src/vendors/vendors.service.ts
backend/test/app.e2e-spec.ts
backend/test/jest-e2e.json
backend/tsconfig.build.json
backend/tsconfig.json
docs/full-codebase-audit-2026-08-23.md
docs/johnson-realty-crm-master-architecture.md
docs/launch-checklist.md
docs/operations-runbook.md
docs/phase-11-launch-readiness.md
docs/staff-training.md
docs/vercel-deployment.md
frontend/.env.example
frontend/.gitignore
frontend/.vercelignore
frontend/AGENTS.md
frontend/CLAUDE.md
frontend/components.json
frontend/eslint.config.mjs
frontend/next.config.ts
frontend/package-lock.json
frontend/package.json
frontend/postcss.config.mjs
frontend/public/about_interior.png
frontend/public/images/coach-johnson/missouri-brick-rental.webp
frontend/public/images/coach-johnson/missouri-craftsman.webp
frontend/public/images/coach-johnson/missouri-home-interior.webp
frontend/public/images/coach-johnson/missouri-neighborhood.webp
frontend/scripts/verify-domain-routing.mjs
frontend/src/app/about/page.tsx
frontend/src/app/admin/agents/layout.tsx
frontend/src/app/admin/agents/page.tsx
frontend/src/app/admin/announcements/page.tsx
frontend/src/app/admin/dashboard/page.tsx
frontend/src/app/admin/e-signatures/_components/e-signature-dialogs.tsx
frontend/src/app/admin/e-signatures/page.tsx
frontend/src/app/admin/emails/page.tsx
frontend/src/app/admin/inquiries/layout.tsx
frontend/src/app/admin/inquiries/page.tsx
frontend/src/app/admin/layout.tsx
frontend/src/app/admin/leases/page.tsx
frontend/src/app/admin/listings/layout.tsx
frontend/src/app/admin/listings/page.tsx
frontend/src/app/admin/login/page.tsx
frontend/src/app/admin/maintenance/page.tsx
frontend/src/app/admin/messages/page.tsx
frontend/src/app/admin/payments/page.tsx
frontend/src/app/admin/properties/page.tsx
frontend/src/app/admin/reports/_components/report-sections.tsx
frontend/src/app/admin/reports/page.tsx
frontend/src/app/admin/sales/commissions/_components/commission-correction-dialog.tsx
frontend/src/app/admin/sales/commissions/_components/commission-details-dialog.tsx
frontend/src/app/admin/sales/commissions/_components/commission-dialog-types.ts
frontend/src/app/admin/sales/commissions/_components/commission-dialogs.tsx
frontend/src/app/admin/sales/commissions/_components/commission-entry-dialog.tsx
frontend/src/app/admin/sales/commissions/_components/commission-ledger-content.tsx
frontend/src/app/admin/sales/commissions/_components/commission-void-dialog.tsx
frontend/src/app/admin/sales/commissions/page.tsx
frontend/src/app/admin/sales/layout.tsx
frontend/src/app/admin/sales/page.tsx
frontend/src/app/admin/settings/page.tsx
frontend/src/app/admin/tenants/page.tsx
frontend/src/app/admin/units/page.tsx
frontend/src/app/admin/vendors/page.tsx
frontend/src/app/agent/documents/page.tsx
frontend/src/app/agent/inquiries/layout.tsx
frontend/src/app/agent/inquiries/page.tsx
frontend/src/app/agent/listings/[id]/page.tsx
frontend/src/app/agent/listings/layout.tsx
frontend/src/app/agent/listings/new/page.tsx
frontend/src/app/agent/listings/page.tsx
frontend/src/app/agent/login/page.tsx
frontend/src/app/agent/settings/layout.tsx
frontend/src/app/agent/settings/page.tsx
frontend/src/app/agent/signup/page.tsx
frontend/src/app/agent/status/page.tsx
frontend/src/app/auth/forgot-password/page.tsx
frontend/src/app/auth/reset-password/page.tsx
frontend/src/app/contact/page.tsx
frontend/src/app/favicon.ico
frontend/src/app/globals.css
frontend/src/app/layout.tsx
frontend/src/app/page.tsx
frontend/src/app/properties/[id]/page.tsx
frontend/src/app/properties/page.tsx
frontend/src/app/rentals/[id]/page.tsx
frontend/src/app/rentals/page.tsx
frontend/src/app/tenant/announcements/page.tsx
frontend/src/app/tenant/autopay/page.tsx
frontend/src/app/tenant/dashboard/page.tsx
frontend/src/app/tenant/documents/page.tsx
frontend/src/app/tenant/layout.tsx
frontend/src/app/tenant/lease/page.tsx
frontend/src/app/tenant/login/page.tsx
frontend/src/app/tenant/maintenance/page.tsx
frontend/src/app/tenant/messages/page.tsx
frontend/src/app/tenant/pay-rent/page.tsx
frontend/src/app/tenant/payments/page.tsx
frontend/src/app/tenant/profile/page.tsx
frontend/src/components/admin/sales-route-guard.tsx
frontend/src/components/admin/sidebar.tsx
frontend/src/components/agent/agent-portal-shell.tsx
frontend/src/components/agent/agent-settings.tsx
frontend/src/components/agent/listing-availability-control.tsx
frontend/src/components/agent/sale-listing-details-fields.tsx
frontend/src/components/agent/sale-listing-form.tsx
frontend/src/components/auth/auth-shell.tsx
frontend/src/components/auth/portal-login-form.tsx
frontend/src/components/logo.tsx
frontend/src/components/page-transition.tsx
frontend/src/components/portal/metric.tsx
frontend/src/components/portal/page-header.tsx
frontend/src/components/portal/portal-sidebar.tsx
frontend/src/components/public/buyer-inquiry-panel.tsx
frontend/src/components/public/home-inventory-sections.tsx
frontend/src/components/public/home-inventory.tsx
frontend/src/components/public/listing-rail.tsx
frontend/src/components/public/property-card.tsx
frontend/src/components/public/property-slideshow.tsx
frontend/src/components/public/site-footer.tsx
frontend/src/components/public/site-header.tsx
frontend/src/components/signatures/signature-portal-page.tsx
frontend/src/components/signatures/verdocs-signing-panel.tsx
frontend/src/components/tenant/sidebar.tsx
frontend/src/components/theme-provider.tsx
frontend/src/components/theme-toggle.tsx
frontend/src/components/ui/badge.tsx
frontend/src/components/ui/button.tsx
frontend/src/components/ui/card.tsx
frontend/src/components/ui/dialog.tsx
frontend/src/components/ui/input.tsx
frontend/src/components/ui/label.tsx
frontend/src/components/ui/skeleton.tsx
frontend/src/components/ui/sonner.tsx
frontend/src/components/ui/switch.tsx
frontend/src/components/ui/table.tsx
frontend/src/components/ui/tabs.tsx
frontend/src/components/ui/textarea.tsx
frontend/src/context/auth-context.tsx
frontend/src/lib/api.ts
frontend/src/lib/auth-routing.ts
frontend/src/lib/e-signatures.ts
frontend/src/lib/errors.ts
frontend/src/lib/inquiries.ts
frontend/src/lib/password.ts
frontend/src/lib/portal-domains.ts
frontend/src/lib/portal-paths.ts
frontend/src/lib/rental-properties.ts
frontend/src/lib/reports.ts
frontend/src/lib/sale-commissions.ts
frontend/src/lib/sale-listings.ts
frontend/src/lib/supabase.ts
frontend/src/lib/utils.ts
frontend/src/proxy.ts
frontend/tsconfig.json
output/pdf/demo-agent-company-agreement.pdf
output/pdf/demo-property-disclosure.pdf
output/pdf/demo-residential-lease.pdf
scripts/verify-repository-standards.mjs
supabase/migrations/20260820192128_create_listing_storage_buckets.sql
supabase/migrations/20260820201333_create_agent_document_bucket.sql
supabase/migrations/20260820202536_create_listing_inquiries.sql
supabase/migrations/20260820215615_add_inquiry_pagination_indexes.sql
supabase/migrations/20260822132441_add_auth_login_lockout_fields.sql
supabase/migrations/20260822172932_complete_phase_6_rental_workflows.sql
supabase/migrations/20260822180600_index_maintenance_unit.sql
supabase/migrations/20260822183141_complete_phase_7_email_architecture.sql
supabase/migrations/20260822184704_add_email_provider_attempt_key.sql
supabase/migrations/20260822184920_schedule_phase_7_email_retries.sql
supabase/migrations/20260822190600_move_pg_net_out_of_public.sql
supabase/migrations/20260822191000_align_email_log_defaults.sql
supabase/migrations/20260822192238_complete_phase_8_sale_commission_ledger.sql
supabase/migrations/20260822210321_complete_phase_9_verdocs_esignatures.sql
supabase/migrations/20260822224826_complete_phase_10_reporting.sql
supabase/migrations/20260822235105_complete_phase_11_launch_hardening.sql
supabase/migrations/20260823000325_index_remaining_foreign_keys_phase_11.sql
```
