-- Schéma de la base — à exécuter dans Supabase : SQL Editor > New query > Run
-- (une seule fois)

create extension if not exists "pgcrypto";

-- ── Produit (un seul produit, une seule ligne) ─────────────────────────────
create table if not exists public.product (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Mon Produit',
  description text not null default '',
  price numeric not null default 0,
  old_price numeric,
  delivery_home numeric not null default 500,
  delivery_desk numeric not null default 350,
  images jsonb not null default '[]'::jsonb,
  features jsonb not null default '[]'::jsonb,
  colors jsonb not null default '[]'::jsonb,   -- [{ "name": "Noir", "hex": "#111111" }]
  sizes jsonb not null default '[]'::jsonb,    -- ["S", "M", "L"]
  updated_at timestamptz not null default now()
);

-- ── Commandes ──────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null,
  phone text not null,
  wilaya text not null,
  commune text not null,
  address text,
  delivery_type text not null default 'domicile' check (delivery_type in ('domicile','stopdesk')),
  stopdesk_id int,
  stopdesk_name text,
  color text,
  size text,
  quantity int not null default 1 check (quantity > 0),
  total numeric not null default 0,
  status text not null default 'en_attente'
    check (status in ('en_attente','confirmee','annulee')),
  yalidine_tracking text,
  yalidine_status text,
  yalidine_label text,
  notes text
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);

-- ── Paramètres (une seule ligne) ───────────────────────────────────────────
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  store_name text not null default 'Ma Boutique',
  logo_url text,
  primary_color text not null default '#4f46e5',
  from_wilaya text not null default '16 - Alger',
  updated_at timestamptz not null default now()
);

-- Lignes initiales
insert into public.product (name) select 'Mon Produit'
  where not exists (select 1 from public.product);
insert into public.settings (store_name) select 'Ma Boutique'
  where not exists (select 1 from public.settings);

-- ── Sécurité : RLS activé, aucun accès public ──────────────────────────────
-- (le site utilise la clé service_role côté serveur uniquement)
alter table public.product enable row level security;
alter table public.orders enable row level security;
alter table public.settings enable row level security;

-- ── Storage : bucket public pour les images produit et le logo ─────────────
insert into storage.buckets (id, name, public)
  values ('images', 'images', true)
  on conflict (id) do nothing;
