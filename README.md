# FarmToMarket Cameroon

A mobile-first, B2B agricultural marketplace and fulfillment pilot built from the supplied Version 1 requirements and system design document.

The application demonstrates the complete managed procurement flow:

1. A buyer posts a multi-item demand.
2. Verified farmers submit full or partial quotes.
3. Operations combines multiple farmers into one fulfillment plan.
4. The buyer confirms one consolidated offer and payment reference.
5. Operations coordinates pickup and delivery.
6. The buyer accepts delivery or opens an evidence-backed dispute.

## Run locally

Prerequisites are Node.js 20.19 or newer and PostgreSQL 15 or newer. The included
Compose file runs PostgreSQL 17:

```bash
cp .env.example .env.local
npm install
npm run db:up
npm run db:deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If PostgreSQL already runs
locally or is managed elsewhere, set `DATABASE_URL` accordingly and skip
`npm run db:up`.

To enable **FarmToMarket Copilot**, add a server-only OpenAI API key to the same
uncommitted `.env.local` file:

```dotenv
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.6-sol
```

Never use a `NEXT_PUBLIC_` prefix for the key, expose it in browser code, or
commit `.env.local`. Restart the development server after changing environment
variables. The model variable is optional; `gpt-5.6-sol` is the app default and
can be overridden per deployment.

Run the full verification suite with:

```bash
npm run check
```

### Database commands

```bash
npm run db:generate                 # regenerate the typed Prisma client
npm run db:migrate -- --name change # create a development migration
npm run db:deploy                   # apply committed migrations
npm run db:seed                     # restore deterministic Cameroon pilot data
npm run db:smoke                    # verify write/read/conflict behavior
npm run db:studio                   # inspect PostgreSQL data
npm run db:down                     # stop the local PostgreSQL container
```

The schema and migration history are committed under `prisma/`. Seeding and the
database smoke test intentionally replace and restore the pilot dataset; never
run either command against a production database containing real marketplace
records.

## Demo access

Use the sign-in screen's role selector. The prototype includes seeded workspaces for:

- Buyer: demands, marketplace, consolidated offers, orders, payments, delivery acceptance, and disputes.
- Farmer: supply listings, buyer request matching, quotes, allocations, pickups, and settlement visibility.
- Operations: verifications, fulfillment allocation, offers, order control, logistics, reconciliation, disputes, catalogue, KPIs, and audit logs.

No real credentials, payments, SMS, WhatsApp messages, or identity documents are
processed. Marketplace records are persisted in PostgreSQL. The active demo
workspace remains browser-session state and is not stored as a global database
setting. Use **Reset demo** in the operations workspace to restore the seed in
non-production environments.

## FarmToMarket Copilot

The role-aware Copilot is available from each authenticated workspace and calls OpenAI through the server route at `/api/v1/ai/copilot`:

- Buyers can turn a procurement need into a clearer demand draft and get sourcing guidance.
- Farmers can improve listing and quote descriptions, with prompts grounded in the available catalogue and units.
- Operations users can summarize order, fulfillment, payment, delivery, and dispute risks into prioritized follow-up actions.

AI responses are suggestions, not accepted transactions or automatic workflow changes. Review quantities, prices, dates, counterparties, and operational actions before using them. The Copilot is not a live market-price oracle and does not provide guarantees, legal advice, financial advice, or food-safety certification.

### AI data handling

The browser sends the user prompt, role, task type, and a deliberately minimized workspace summary to the server. Depending on the role, that summary can include product or catalogue labels, units, quantities, locations/regions, target dates, lifecycle statuses, and aggregate operational counts needed to answer the request.

The integration is designed not to send OpenAI API credentials, passwords, verification documents or images, payment-provider secrets, raw payment references, phone numbers, email addresses, or full identity records. Avoid entering sensitive personal, financial, or confidential information in a Copilot prompt. OpenAI access happens only from the server; the API key is never returned to the browser.

The AI integration is independent of storage. Marketplace workflow records are
loaded from and persisted to PostgreSQL; OpenAI credentials and database
credentials stay server-only.

### Deployment notes

- Configure `OPENAI_API_KEY` in the hosting platform's encrypted server-side secret store and set `OPENAI_MODEL` separately for each environment.
- Cross-role state reads, full-state browser sync, and demo reset are disabled by default in production. `ALLOW_DEMO_STATE_READS=true`, `ALLOW_DEMO_STATE_WRITES=true`, and `ALLOW_DEMO_RESET=true` are only for an isolated pilot deployment with synthetic records; use authenticated, action-specific server mutations before handling real data.
- Ensure the OpenAI API project has an active usage tier or available credits; a valid key alone does not provide inference quota.
- Use distinct keys for development, staging, and production; restrict access, monitor usage, and rotate a key immediately if exposure is suspected. Restart or redeploy after rotation.
- The endpoint validates input and applies application-level rate limiting. For a multi-instance or serverless production deployment, use a shared limiter such as Redis or a managed rate-limit service so limits apply across every instance.
- Add authenticated user and organization quotas, request logging that excludes prompt contents and secrets, spend alerts, and observability before serving production traffic.
- Keep human review in the workflow, test model changes in staging, and pin `OPENAI_MODEL` rather than relying on an implicit provider default.

## Technical shape

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS 4 design system
- PostgreSQL 17 with Prisma ORM 7, committed SQL migrations, and deterministic seed data
- Server-only database access and persistent route handlers under `/api/v1`
- Server-only OpenAI Responses API integration with typed structured outputs and moderation
- Installable manifest and production service worker shell
- English/French-ready state and notification content
- Domain validation, role checks, lifecycle transitions, notification events, and append-only audit records
- Vitest coverage for data integrity and critical calculations

The current sign-in and role switcher remain a clearly marked pilot/demo
experience rather than production authentication. Before processing real
transactions, add server-issued sessions, per-tenant authorization, private
object storage, provider-signed payment webhooks, and licensed messaging
adapters.

## Project map

```text
prisma/                          PostgreSQL schema, migrations, and seed entrypoint
src/app/                         Routes, metadata, PWA, and persistent API
src/components/platform/         Buyer, farmer, and operations workspaces
src/components/providers/        Database-backed application state and PWA setup
src/components/public/           Marketing, authentication, legal, and support UI
src/lib/ai/                      Copilot contracts, validation, prompting, and safeguards
src/lib/domain.ts                Domain types, formatting, and metrics
src/lib/seed-data.ts             Cameroon pilot fixtures
src/server/db/                   Server-only Prisma client, validation, and repository
public/                          App icons, service worker, and optimized hero media
```
