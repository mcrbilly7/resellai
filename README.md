# AI Reseller Pro

AI-powered product sourcing, valuation, inventory management, and
multi-marketplace selling platform. Photograph an item, let AI identify it
and price it, generate a marketplace-ready listing, approve it, and track
inventory and profit.

This repo implements the **web MVP** of the full product vision described in
the project brief. See [Scope & deviations](#scope--deviations) below for
what's built vs. what's roadmap.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Prisma + SQLite** for local-first inventory storage (`prisma/schema.prisma`)
- **Anthropic API** (Claude, vision + tool use) for product identification,
  condition grading, pricing research, listing copy, and the AI assistant —
  with deterministic mock fallbacks so the app runs fully offline/without a
  key
- **Recharts** for the analytics dashboard
- `supabase/schema.sql` — a parallel Postgres schema for the optional
  multi-device cloud-sync backend (not wired up yet, see Roadmap)

## Getting started

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push   # creates prisma/dev.db
npm run dev
```

Open http://localhost:3000 — it redirects to `/dashboard`.

### Enabling real AI

Without `ANTHROPIC_API_KEY` set, the AI Scanner, Listing Generator, and AI
Assistant all run in **demo mode**: deterministic sample data stands in for
model output so the entire scan → price → list → approve → sell flow still
works end-to-end for local testing/demos. Set the key in `.env` and restart
the dev server to switch on live vision-based identification and listing
generation (see `src/lib/ai.ts`).

## Feature map

| Spec area | Where it lives |
| --- | --- |
| Dashboard (stats, activity, AI recommendations) | `src/app/dashboard` |
| Scan Item (photo upload, barcode field) | `src/components/PhotoUploader.tsx`, `src/app/scanner` |
| AI product identification + condition grading | `src/lib/ai.ts` (`identifyProduct`), `/api/analyze` |
| Pricing engine (Fast / Normal / Max tiers) | `src/lib/pricing.ts` |
| Profit calculator (fees, ROI, margin) | `src/lib/profit.ts`, `src/components/ProfitCalculator.tsx` |
| Listing generator (title/description/keywords/specifics) | `src/lib/ai.ts` (`generateListing`), `/api/listings/generate` |
| Approval flow (edit/approve/reject) | `src/app/scanner`, `src/app/listings` |
| Marketplace connections + cross-posting | `src/app/marketplace`, `src/lib/marketplaces.ts` (fee data + UI toggle; publishing is stubbed, see Roadmap) |
| Inventory management (statuses, locations, SKU) | `src/app/inventory`, `prisma/schema.prisma` |
| CSV import / export (inventory, sales, tax) | `/api/inventory/import`, `/api/inventory/export` |
| Duplicate detection | Barcode/SKU uniqueness enforced on create + import |
| Analytics dashboard | `src/app/analytics`, `/api/analytics` |
| AI Assistant chat | `src/components/AIChatWidget.tsx`, `/api/assistant` |
| Dark / light theme | `src/components/ThemeProvider.tsx` |

## Scope & deviations

The product brief specifies **Flutter** (Android/iOS/Web/Desktop) on a
**Supabase** backend. This session's sandbox had no Flutter/Dart SDK and no
network path to install one (npm/pypi registries were reachable, generic
package downloads were not), so shipping working Flutter code wasn't
possible without it going completely unverified. Given that constraint, this
was built as a **Next.js web app** instead — fully runnable, build-checked,
and manually tested end-to-end (see commit history / PR for the verification
steps).

Not built in this pass, left as follow-up work:

- **Native mobile/desktop apps.** The Flutter clients, or a React
  Native/Tauri equivalent, would consume the same API routes this repo
  already exposes (`/api/inventory`, `/api/analyze`, `/api/listings/generate`,
  `/api/analytics`).
- **Offline-first sync.** Today the app is local-first via SQLite with no
  network dependency for core CRUD. A true offline-mode-with-sync (per spec)
  needs the client-side data layer a native app provides; `supabase/schema.sql`
  is the target shape for the cloud side of that sync.
- **Real marketplace publishing.** eBay/Amazon/Facebook/Mercari/etc. are
  modeled as connection toggles and per-item marketplace status, but actual
  OAuth + listing-publish API calls aren't implemented — each marketplace
  has its own auth flow and category-mapping requirements that are a
  significant integration project per marketplace.
- **Multi-user accounts / auth.** The app is currently single-tenant (no
  login). `supabase/schema.sql` includes `user_id` + RLS policies for when
  auth is added.
- **Barcode camera scanning.** The scanner accepts a typed/pasted barcode
  today; live camera barcode decoding (e.g. via a WASM barcode reader) is a
  follow-up.
- Voice listing creation, live camera scanning, counterfeit detection,
  auto-repricing, and the other "Future Features" from the brief are out of
  scope for this pass.

## Data model

`prisma/schema.prisma` is the source of truth locally. Key model:
`InventoryItem` carries identification, condition grading, pricing-engine
output, listing content, marketplace status, and sale/profit fields in one
row — see the file for the full field list and `ActivityLog` /
`MarketplaceConnection` / `ChatMessage` for the supporting tables.

## Scripts

```bash
npm run dev       # dev server
npm run build     # production build (also runs the TypeScript check)
npm run start     # run a production build
npx eslint .       # lint
npx prisma studio  # browse the local database
```
