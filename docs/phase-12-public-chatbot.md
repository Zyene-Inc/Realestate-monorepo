# Phase 12 — Public Website Property Assistant

## Scope and status

The implementation is code-complete and the production availability endpoint reports it enabled. The connected production database already contains the chat tables, enum, and daily expiry cron. Local migration version `20260823164507` is absent from Supabase migration history, so it is documented as a schema-present history exception and must not be replayed solely to repair the ledger. A controlled browser/security verification remains to be recorded.

## Implemented behavior

- The floating assistant renders only on public-site routes. It is excluded from agent, Sales Admin, Rental Admin, tenant, and Super Admin routes and hostnames.
- NestJS streams replies from Groq's fixed `openai/gpt-oss-20b` model. Before that model is called, Groq's `meta-llama/llama-prompt-guard-2-86m` screens the visitor message for prompt attacks. No AI credential or provider request runs in the browser.
- The model receives at most 12 recent conversation messages, 12 approved sale listings, and 12 published rental listings. It has no database tool, SQL capability, private documents, user records, tenant records, inquiries, commissions, or unpublished inventory.
- The system instructions forbid invented inventory, discriminatory housing guidance, personalized legal/loan/tax conclusions, and collection of highly sensitive identity or financial data. Human help is available through the in-chat contact form, `/contact`, and `info@coachjohnsonrealty.com`.
- The assistant is not general-purpose: a server-side scope firewall returns one fixed Coach Johnson Realty-only response for prompt-injection and clearly unrelated requests (math, trivia, jailbreaks) before they reach Groq. Prompt Guard adds a second security layer for every message that reaches the provider. Greetings, booking/showing/contact questions, and conversation follow-ups still reach the model with recent history. Completed replies are sanitized so leaked chain-of-thought never reaches the browser.
- Browser access uses a 256-bit random HttpOnly, Secure-in-production, SameSite Strict cookie. Only its SHA-256 hash is stored. Chat tables have RLS enabled and grant no browser role direct access.
- A daily rotating salted fingerprint supports a 12-message visitor limit without storing raw IP addresses. A transaction-level PostgreSQL advisory lock enforces the 45-message shared daily free-tier ceiling across concurrent Vercel instances. Nest throttling adds a five-start-per-minute limit.
- Conversations and messages expire after 30 days and are deleted by a daily Supabase Cron job. Completed and failed model operations create content-free generic audit events; assistant rows retain model, finish reason, and token counts for operational review.

## API contract

- `GET /api/public/chatbot/status` — feature availability; never returns credentials.
- `GET /api/public/chatbot/history` — at most 30 cookie-authorized messages.
- `POST /api/public/chatbot/messages` — validated 1–1,000 character input and an SSE stream containing `ready`, `delta`, `done`, or generic `error` events.
- `POST /api/public/chatbot/leads` — public website lead capture from the chatbot contact form (email, optional phone, message). Throttled to 3 submissions per minute. Sales Admin and Super Admin review leads at `/admin/leads`.

## Website leads inbox

- After about six visitor questions, booking/showing/contact intent, or a daily chat limit, the chatbot shows an in-chat contact form.
- Submissions create `WebsiteLead` rows (default source `CHATBOT`) and a `PUBLIC_CHATBOT_LEAD_CREATED` audit event.
- Admin APIs: `GET /api/admin/website-leads`, `GET /api/admin/website-leads/:id`, and `PATCH /api/admin/website-leads/:id` for status updates (`NEW`, `CONTACTED`, `CLOSED`).

## Local verification evidence

- Prisma schema format/generation/validation: pass.
- Chatbot and production-environment unit tests: 16 pass.
- Backend lint and Nest production build: pass.
- Frontend TypeScript, lint, and 49-route Next.js production build: pass.
- Production preflight confirmed the chat tables, `ChatMessageRole` enum, and daily expiry cron are present; the availability endpoint reported the feature enabled. The migration-history divergence is documented in `docs/database-migration-ledger.json` and is not repaired by replaying DDL.

## Activation gate

Follow the ordered checklist in `docs/vercel-deployment.md`. Record a controlled streamed browser reply, persistence refresh, domain exclusion, and Supabase security/advisor check before calling Phase 12 fully verified.
