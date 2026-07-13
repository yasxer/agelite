-- Migration 003 : bureau stopdesk choisi par le client
-- À exécuter dans Supabase SQL Editor si les tables existent déjà.

alter table public.orders add column if not exists stopdesk_id int;
alter table public.orders add column if not exists stopdesk_name text;
