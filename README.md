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

## Technical shape

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS 4 design system
- Route handlers under `/api/v1` for the demo REST surface
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
src/lib/domain.ts                Domain types, formatting, and metrics
src/lib/seed-data.ts             Cameroon pilot fixtures
public/                          App icons, service worker, and optimized hero media
```
