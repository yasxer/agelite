-- Migration 004 : variantes produit (couleurs + tailles)
-- À exécuter dans Supabase SQL Editor si les tables existent déjà.

alter table public.product add column if not exists colors jsonb not null default '[]'::jsonb;
alter table public.product add column if not exists sizes jsonb not null default '[]'::jsonb;

alter table public.orders add column if not exists color text;
alter table public.orders add column if not exists size text;
