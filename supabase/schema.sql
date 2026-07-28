-- AI Reseller Pro — Postgres/Supabase schema for the optional cloud-sync backend.
--
-- This mirrors prisma/schema.prisma (the local SQLite source of truth) so a
-- future "cloud sync" mode can push/pull inventory between devices and users.
-- It is not wired up yet — see README.md "Roadmap" for the sync design.

create extension if not exists "pgcrypto";

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sku text not null,
  barcode text,

  name text not null,
  brand text,
  model text,
  category text,
  color text,
  size text,
  material text,
  year text,
  rarity text,

  condition text,
  condition_score int,
  condition_reason text,
  ai_confidence int,

  photos jsonb not null default '[]',

  purchase_date date,
  purchase_price numeric(10, 2),
  shipping_cost_estimate numeric(10, 2),
  packaging_cost numeric(10, 2),
  location text,

  status text not null default 'purchased'
    check (status in ('purchased', 'needs_photos', 'ai_processing', 'draft', 'listed', 'sold', 'shipped', 'archived')),

  msrp numeric(10, 2),
  current_retail numeric(10, 2),
  avg_sold_price numeric(10, 2),
  lowest_active numeric(10, 2),
  highest_sold_price numeric(10, 2),
  fast_price numeric(10, 2),
  normal_price numeric(10, 2),
  max_price numeric(10, 2),
  listing_price numeric(10, 2),
  pricing_strategy text not null default 'normal',

  title text,
  description text,
  keywords jsonb not null default '[]',
  item_specifics jsonb not null default '{}',
  marketplaces jsonb not null default '[]',
  marketplace_status jsonb not null default '{}',

  sale_price numeric(10, 2),
  platform_fees numeric(10, 2),
  sold_date date,
  days_listed int,
  profit numeric(10, 2),
  roi numeric(6, 2),
  profit_margin numeric(6, 2),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, sku)
);

create index if not exists inventory_items_user_status_idx on inventory_items (user_id, status);
create index if not exists inventory_items_user_category_idx on inventory_items (user_id, category);
create index if not exists inventory_items_user_brand_idx on inventory_items (user_id, brand);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid references inventory_items (id) on delete set null,
  message text not null,
  type text not null default 'info',
  created_at timestamptz not null default now()
);

create table if not exists marketplace_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  connected boolean not null default false,
  fee_percent numeric(5, 2) not null default 0,
  -- Marketplace OAuth tokens / API credentials, encrypted at rest via
  -- Supabase Vault (never store raw secrets in this column).
  credentials_ref text,
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Row-level security: every table is scoped to the owning user.
alter table inventory_items enable row level security;
alter table activity_log enable row level security;
alter table marketplace_connections enable row level security;
alter table chat_messages enable row level security;

create policy "Users manage their own inventory" on inventory_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own activity log" on activity_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own marketplace connections" on marketplace_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own chat messages" on chat_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket for item photos (referenced by URL from inventory_items.photos).
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', false)
on conflict (id) do nothing;
