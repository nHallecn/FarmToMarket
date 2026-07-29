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

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To enable **FarmToMarket Copilot**, copy `.env.example` to `.env.local` and add a server-only OpenAI API key:

```dotenv
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.6-sol
```

Never use a `NEXT_PUBLIC_` prefix for the key, expose it in browser code, or commit `.env.local`. Restart the development server after changing environment variables. The model variable is optional; `gpt-5.6-sol` is the app default and can be overridden per deployment.

Run the full verification suite with:

```bash
npm run check
```

## Demo access

Use the sign-in screen's role selector. The prototype includes seeded workspaces for:

- Buyer: demands, marketplace, consolidated offers, orders, payments, delivery acceptance, and disputes.
- Farmer: supply listings, buyer request matching, quotes, allocations, pickups, and settlement visibility.
- Operations: verifications, fulfillment allocation, offers, order control, logistics, reconciliation, disputes, catalogue, KPIs, and audit logs.

No real credentials, payments, SMS, WhatsApp messages, or identity documents are processed. Interactive demo state is versioned and persisted in browser `localStorage`; use **Reset demo** in the operations workspace to restore the seed.

## FarmToMarket Copilot

The role-aware Copilot is available from each authenticated workspace and calls OpenAI through the server route at `/api/v1/ai/copilot`:

- Buyers can turn a procurement need into a clearer demand draft and get sourcing guidance.
- Farmers can improve listing and quote descriptions, with prompts grounded in the available catalogue and units.
- Operations users can summarize order, fulfillment, payment, delivery, and dispute risks into prioritized follow-up actions.

AI responses are suggestions, not accepted transactions or automatic workflow changes. Review quantities, prices, dates, counterparties, and operational actions before using them. The Copilot is not a live market-price oracle and does not provide guarantees, legal advice, financial advice, or food-safety certification.

### AI data handling

The browser sends the user prompt, role, task type, and a deliberately minimized workspace summary to the server. Depending on the role, that summary can include product or catalogue labels, units, quantities, locations/regions, target dates, lifecycle statuses, and aggregate operational counts needed to answer the request.

The integration is designed not to send OpenAI API credentials, passwords, verification documents or images, payment-provider secrets, raw payment references, phone numbers, email addresses, or full identity records. Avoid entering sensitive personal, financial, or confidential information in a Copilot prompt. OpenAI access happens only from the server; the API key is never returned to the browser.

The AI integration does not replace the prototype's storage model: workflow records continue to persist locally in browser `localStorage`. Deploying the OpenAI route does not create a production database or change the seeded demo lifecycle.

### Deployment notes

- Configure `OPENAI_API_KEY` in the hosting platform's encrypted server-side secret store and set `OPENAI_MODEL` separately for each environment.
- Ensure the OpenAI API project has an active usage tier or available credits; a valid key alone does not provide inference quota.
- Use distinct keys for development, staging, and production; restrict access, monitor usage, and rotate a key immediately if exposure is suspected. Restart or redeploy after rotation.
- The endpoint validates input and applies application-level rate limiting. For a multi-instance or serverless production deployment, use a shared limiter such as Redis or a managed rate-limit service so limits apply across every instance.
- Add authenticated user and organization quotas, request logging that excludes prompt contents and secrets, spend alerts, and observability before serving production traffic.
- Keep human review in the workflow, test model changes in staging, and pin `OPENAI_MODEL` rather than relying on an implicit provider default.

## Technical shape

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS 4 design system
- Route handlers under `/api/v1` for the demo REST surface
- Server-only OpenAI Responses API integration with typed structured outputs and moderation
- Installable manifest and production service worker shell
- English/French-ready state and notification content
- Server-style domain validation, role checks, lifecycle transitions, notification events, and append-only audit records in the client demo store
- Vitest coverage for data integrity and critical calculations

The in-browser store makes the full workflow reviewable without external credentials. A production deployment should replace it with PostgreSQL/Prisma, real authentication, private object storage, and provider adapters for licensed payments and messaging while preserving the domain types and lifecycle rules in `src/lib`.

## Project map

```text
src/app/                         Routes, metadata, PWA, and demo API
src/components/platform/         Buyer, farmer, and operations workspaces
src/components/providers/        Persistent application state and PWA setup
src/components/public/           Marketing, authentication, legal, and support UI
src/lib/ai/                      Copilot contracts, validation, prompting, and safeguards
src/lib/domain.ts                Domain types, formatting, and metrics
src/lib/seed-data.ts             Cameroon pilot fixtures
public/                          App icons, service worker, and optimized hero media
```
