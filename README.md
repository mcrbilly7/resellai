# AI Reseller Pro

AI-powered product sourcing, valuation, inventory management, and
multi-marketplace selling platform. Photograph an item, let AI identify it
and price it, generate a marketplace-ready listing, approve it, publish it,
and track inventory, buyer messages, and profit.

This repo implements the **web MVP** of the full product vision described in
the project brief, built as an installable, offline-capable, multi-user web
app. See [Scope & deviations](#scope--deviations) for what's built vs. what's
genuinely out of reach in this environment.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Prisma**, backed by a local SQLite file for development and, optionally,
  **Turso** (hosted, SQLite-compatible libSQL) for deployments with no
  persistent disk like Vercel — see [Deploying](#deploying) (`prisma/schema.prisma`)
- **Cookie-based session auth** (`src/lib/auth.ts`) — bcrypt password hashes,
  signed JWT session cookies, no third-party auth service required
- **Anthropic API** (Claude, vision + tool use) for product identification,
  condition grading, authenticity risk, pricing research, listing copy,
  buyer-message replies, receipt line-item extraction, tax summaries, and the
  AI assistant — with deterministic mock fallbacks so the whole app runs
  end-to-end without a key
- **Automated email** (`src/lib/email.ts`) — welcome, password reset,
  item-sold, and buyer-message alerts sent via your own Gmail account over
  SMTP (an App Password, not your real password); logs to the console
  instead of sending when not configured, so the app still works without it
- **Recharts** for the analytics dashboard
- A service worker + Web App Manifest make the app installable (Android,
  desktop Chrome/Edge, iOS "Add to Home Screen") and usable offline for core
  inventory edits (see [Offline support](#offline-support))
- `supabase/schema.sql` — a parallel Postgres schema for an alternative
  multi-device cloud-sync backend (not wired up, see Roadmap)

## Getting started

```bash
npm install
cp .env.example .env
# generate a session secret and paste it into .env as AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx prisma generate
npx prisma db push   # creates prisma/dev.db
npm run dev
```

Open http://localhost:3000 — it redirects to `/login`. Create an account,
then you land on `/dashboard`.

**If deploying behind HTTPS** (Vercel, a TLS-terminating reverse proxy),
set `COOKIE_SECURE=true` so the session cookie is marked `Secure`. Leave it
unset for local/plain-HTTP use — a `Secure` cookie served over plain HTTP is
silently dropped by browsers and login will appear to loop back to the login
page.

### Enabling real AI

Without `ANTHROPIC_API_KEY` set, the AI Scanner, Listing Generator, Receipt
Scanner, Buyer Message drafts, Tax Summary, and AI Assistant all run in
**demo mode**: deterministic sample data stands in for model output so the
entire scan → price → list → approve → publish → sell flow still works
end-to-end for local testing/demos. Set the key in `.env` and restart the
dev server to switch on live vision-based identification and generation (see
`src/lib/ai.ts`).

### Enabling automated email

Without `GMAIL_USER`/`GMAIL_APP_PASSWORD` set, emails are logged to the
server console instead of sent (verified via a real end-to-end run — see the
`[email disabled] Would send "..."` lines). To send for real, from your own
Gmail account, no third-party service:

1. Turn on 2-Step Verification on the Google account you want to send from
   (required before Google will issue App Passwords).
2. Generate one at https://myaccount.google.com/apppasswords — it's a
   16-character code, distinct from and revocable separately from your real
   password.
3. Set `GMAIL_USER` (the Gmail address) and `GMAIL_APP_PASSWORD` (the
   generated code) in `.env`, plus `APP_URL` (your deployed URL, or
   `http://localhost:3000` for local dev) so password-reset links point
   somewhere real.

Triggers: welcome email on signup, password-reset link, item-sold summary,
and buyer-message alerts — all in `src/lib/email.ts`.

## Feature map

| Spec area | Where it lives |
| --- | --- |
| Multi-user accounts + password reset | `src/lib/auth.ts`, `/api/auth/*`, `src/app/login`, `src/app/register`, `src/app/forgot-password`, `src/app/reset-password` |
| Automated email (welcome, reset, item-sold, buyer-message alerts) | `src/lib/email.ts` — see [Enabling automated email](#enabling-automated-email) |
| Dashboard (stats, activity, AI recommendations, repricing) | `src/app/(app)/dashboard` |
| Scan Item (photo upload, camera barcode scan, voice notes) | `src/components/PhotoUploader.tsx`, `BarcodeScanner.tsx`, `VoiceInputButton.tsx`, `src/app/(app)/scanner` |
| AI product identification + condition + authenticity risk | `src/lib/ai.ts` (`identifyProduct`), `/api/analyze` |
| Pricing engine (Fast / Normal / Max tiers) | `src/lib/pricing.ts` |
| Profit calculator (fees, ROI, margin) | `src/lib/profit.ts`, `src/components/ProfitCalculator.tsx` |
| Listing generator (title/description/keywords/specifics) | `src/lib/ai.ts` (`generateListing`), `/api/listings/generate` |
| Approval flow (edit/approve/reject) | `src/app/(app)/scanner`, `src/app/(app)/listings` |
| Marketplace publishing (adapter architecture) | `src/lib/marketplace-publishers/`, `/api/inventory/[id]/publish` — see below |
| Automatic repricing suggestions | `src/lib/repricing.ts`, surfaced on Dashboard + Listings |
| Buyer messages + AI negotiation replies | `src/app/(app)/messages`, `/api/messages/*`, `draftBuyerReply` in `src/lib/ai.ts` |
| Receipt scanning → bulk inventory import | `src/app/(app)/receipts`, `/api/receipts/scan`, `extractReceiptItems` in `src/lib/ai.ts` |
| Tax preparation assistant | Settings page, `/api/tax-summary`, `generateTaxSummary` in `src/lib/ai.ts` |
| Inventory management (statuses, locations, SKU) | `src/app/(app)/inventory`, `prisma/schema.prisma` |
| CSV import / export (inventory, sales, tax) | `/api/inventory/import`, `/api/inventory/export` |
| Duplicate detection | Barcode/SKU uniqueness enforced per-user on create + import |
| Analytics dashboard + month-over-month trend | `src/app/(app)/analytics`, `/api/analytics` |
| AI Assistant chat | `src/components/AIChatWidget.tsx`, `/api/assistant` |
| Dark / light theme | `src/components/ThemeProvider.tsx` |
| Installable PWA + offline queue | `src/app/manifest.ts`, `public/sw.js`, `src/lib/offline.ts` — see below |
| Sourcing (supplier/wholesale/auction) | `src/app/(app)/sourcing` — honest placeholder, see Scope & deviations |

### Marketplace publishing

`src/lib/marketplace-publishers/` defines a `MarketplacePublisher` interface
(`publish`, `unpublish`). Every marketplace defaults to a **mock adapter**
(`mock.ts`) that always succeeds and returns a fake listing ID/URL, so
Approve & Publish works end-to-end without any credentials. There's also a
structurally-complete **eBay Sell API adapter** (`ebay.ts`, OAuth refresh
token → inventory_item → offer → publish) written from the documented API
shape — but this sandbox has no network access to `api.ebay.com`, so it has
never actually been run against eBay. It only activates when
`EBAY_CLIENT_ID`/`EBAY_CLIENT_SECRET`/`EBAY_REFRESH_TOKEN` are set, and
should be treated as an unverified starting point, not a tested integration.

### Offline support

A service worker (`public/sw.js`) is network-first for pages and API GETs,
falling back to cache only when a request genuinely fails — this matters
because every page depends on an auth cookie the service worker can't see
ahead of time, so cache-first would risk permanently replaying a stale
pre-login redirect. Inventory mutations (add/edit/delete) go through
`apiFetch()` (`src/lib/offline.ts`): online, it's a normal `fetch`; offline,
it queues the mutation in IndexedDB and replays the queue in order once the
browser fires the `online` event. This covers the spec's "view inventory,
add items, edit listings, track purchases" offline bullets — AI-dependent
endpoints (analyze, generate listing, assistant, receipts, tax summary)
inherently need a live model call and stay online-only.

## Deploying

To Vercel (or any host with no persistent local disk):

1. **Database:** create a free database at https://turso.tech, then set
   `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in your host's environment
   variables — `src/lib/prisma.ts` detects `TURSO_DATABASE_URL` and routes
   queries through Turso's driver adapter instead of the local file. Leave
   `DATABASE_URL` set to `file:./dev.db` in every environment, including
   production — **don't** repoint it at the `libsql://` URL. Prisma
   validates that value against the `sqlite` provider's own protocol at
   client runtime regardless of whether an adapter is in use, so anything
   other than a `file:` URL there crashes every single query with `the URL
   must start with the protocol file:` (this is not hypothetical — it's
   exactly what happened when this was first deployed and is why the schema
   is split across `DATABASE_URL` and `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`
   instead of one variable).

   Apply the schema to Turso once — there's no reliable way to run Prisma's
   own migration commands against a remote `libsql://` URL without extra
   `prisma.config.ts` CLI configuration, so `prisma/turso-init.sql` (the
   exact SQL Prisma would run, generated via `prisma migrate diff
   --from-empty`) is the schema instead. Paste its contents into the Turso
   dashboard's SQL console, or run `turso db shell your-db <
   prisma/turso-init.sql` if you have the CLI. Re-run it (or the equivalent
   `ALTER TABLE`s) after any future schema change.
2. **Auth:** set `AUTH_SECRET` (see [Getting started](#getting-started)) and
   `COOKIE_SECURE=true` (required once served over HTTPS, which Vercel
   always does — see the cookie note above).
3. **AI / email (optional):** set `ANTHROPIC_API_KEY` and/or
   `GMAIL_USER`/`GMAIL_APP_PASSWORD`/`APP_URL` — both degrade gracefully
   (demo data / console-logged emails) when unset, so the app deploys and
   runs without them too.

None of this was testable end-to-end from this sandbox (no network access to
Turso or Gmail's SMTP servers here — confirmed by pointing the app at a fake
Turso URL locally and seeing the connection get refused at the network
level, rather than a schema-validation error, which is what proved the fix
above actually routes through the adapter correctly). Treat the Turso/Gmail
wiring as built-and-reviewed, not verified against the real services — the
local SQLite path and the console-log email fallback *are* verified.

## Scope & deviations

The product brief specifies **Flutter** (Android/iOS/Web/Desktop) on a
**Supabase** backend. This session's sandbox had no Flutter/Dart SDK and no
network path to install one (npm/pypi registries were reachable, generic
package downloads were not), so shipping working Flutter code wasn't
possible without it going completely unverified. Given that constraint, this
was built as a **Next.js web app** instead — fully runnable, build-checked,
and manually tested end-to-end with a real browser (Playwright), including
registering an account, running the full scan → publish flow, going offline
mid-session and confirming the mutation queue syncs correctly on reconnect.

Not built, and deliberately not faked:

- **Native mobile/desktop apps.** The installable PWA (manifest + service
  worker) covers "runs on a phone/desktop home screen" to the extent this
  environment can build and verify; true native Flutter/React Native/Tauri
  clients would consume the same API routes this repo already exposes.
- **Real marketplace publishing.** The eBay adapter is written but unverified
  (see above); Amazon/Facebook/Mercari/Poshmark/Etsy/Depop/OfferUp/Shopify/
  WooCommerce all use the mock adapter. Each has its own OAuth flow and
  category-mapping requirements — a real integration per marketplace is
  follow-up work, and the adapter interface is designed so adding one is a
  self-contained new file in `src/lib/marketplace-publishers/`.
- **Supplier sourcing, wholesale finder, auction monitoring.** These need
  live data from real supplier/wholesale/auction platforms that this sandbox
  has no network access to and no legitimate data to fabricate. `/sourcing`
  says so directly instead of showing invented "recommendations."
- Camera barcode scanning, voice dictation, receipt scanning, buyer-message
  AI replies, counterfeit-risk flagging, auto-repricing suggestions, and a
  tax-prep assistant — all listed as "Future Features" in the brief — **are**
  built; see the feature map above.

## Data model

`prisma/schema.prisma` is the source of truth locally. `User` owns every
other row (`InventoryItem`, `ActivityLog`, `MarketplaceConnection`,
`ChatMessage`, `BuyerMessage`, `PasswordResetToken`) via `userId`, enforced
in every API route.
`InventoryItem` carries identification, condition grading, authenticity
risk, pricing-engine output, listing content, marketplace publish status,
and sale/profit fields in one row — see the file for the full field list.

## Known limitations

- A cosmetic React hydration console warning (`error #418`) can appear in
  the production build after a full page navigation once the service worker
  is active; it doesn't reproduce in `next dev` and doesn't affect any
  functionality (verified via full end-to-end Playwright runs). Flagged here
  rather than silently left in.
- The session-cookie auth guard in `proxy.ts` is intentionally an
  *optimistic* check (cookie presence only, no signature verification) —
  Next's own guidance is that Proxy/Middleware shouldn't be the sole
  authorization layer, and in practice this proxy runtime doesn't reliably
  see `process.env.AUTH_SECRET`. Real enforcement (full JWT verification)
  happens in every API route via `requireSessionUser()` and in the
  `/dashboard` Server Component via `getSessionUser()`.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build (also runs the TypeScript check)
npm run start      # run a production build
npx eslint .        # lint
npx prisma studio   # browse the local database
node scripts/gen-icons.mjs   # regenerate public/icons/*.png (no image deps needed)
```
