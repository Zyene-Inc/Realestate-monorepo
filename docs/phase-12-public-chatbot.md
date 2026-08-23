# Phase 12 — Public Website Property Assistant

## Scope and status

The implementation is complete and locally verified. Production activation remains intentionally gated on two external operations: apply the pending Supabase migration and add a server-only OpenRouter API key to the API Vercel project. Until then, `CHATBOT_ENABLED=false` keeps the widget hidden and the generation endpoint unavailable.

## Implemented behavior

- The floating assistant renders only on public-site routes. It is excluded from agent, Sales Admin, Rental Admin, tenant, and Super Admin routes and hostnames.
- NestJS streams responses from the Vercel AI SDK through OpenRouter's fixed `openrouter/free` router. No AI credential or provider request runs in the browser.
- The model receives at most 12 recent conversation messages, 12 approved sale listings, and 12 published rental listings. It has no database tool, SQL capability, private documents, user records, tenant records, inquiries, commissions, or unpublished inventory.
- The system instructions forbid invented inventory, discriminatory housing guidance, personalized legal/loan/tax conclusions, and collection of highly sensitive identity or financial data. Human help is always available through `/contact` and `info@coachjohnsonrealty.com`.
- The assistant is not general-purpose: a server-side scope firewall returns one fixed Coach Johnson Realty-only response for prompt-injection and clearly unrelated requests before they reach OpenRouter. The remaining model policy permits only public listings, rentals, buying, selling, leasing, property management, and contact guidance.
- Browser access uses a 256-bit random HttpOnly, Secure-in-production, SameSite Strict cookie. Only its SHA-256 hash is stored. Chat tables have RLS enabled and grant no browser role direct access.
- A daily rotating salted fingerprint supports a 12-message visitor limit without storing raw IP addresses. A transaction-level PostgreSQL advisory lock enforces the 45-message shared daily free-tier ceiling across concurrent Vercel instances. Nest throttling adds a five-start-per-minute limit.
- Conversations and messages expire after 30 days and are deleted by a daily Supabase Cron job. Completed and failed model operations create content-free generic audit events; assistant rows retain model, finish reason, and token counts for operational review.

## API contract

- `GET /api/public/chatbot/status` — feature availability; never returns credentials.
- `GET /api/public/chatbot/history` — at most 30 cookie-authorized messages.
- `POST /api/public/chatbot/messages` — validated 1–1,000 character input and an SSE stream containing `ready`, `delta`, `done`, or generic `error` events.

## Local verification evidence

- Prisma schema format/generation/validation: pass.
- Chatbot and production-environment unit tests: 16 pass.
- Backend lint and Nest production build: pass.
- Frontend TypeScript, lint, and 49-route Next.js production build: pass.
- No live migration or production key mutation was performed during implementation.

## Activation gate

Follow the ordered checklist in `docs/vercel-deployment.md`. Do not mark Phase 12 production-active until the live migration, Vercel environment, streamed browser flow, persistence refresh, domain exclusion, and Supabase security/advisor checks all pass.
