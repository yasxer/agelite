-- Migration 002 : 3 statuts (en_attente / confirmee / annulee) + suivi Yalidine
-- À exécuter dans Supabase SQL Editor SI vous avez déjà créé les tables
-- avec l'ancien schema.sql. (Les nouvelles installations utilisent schema.sql
-- directement, cette migration est inutile pour elles.)

alter table public.orders add column if not exists yalidine_status text;
alter table public.orders add column if not exists yalidine_label text;

-- Conversion des anciens statuts vers les 3 nouveaux
update public.orders set status = 'confirmee' where status in ('expediee', 'livree');
update public.orders set status = 'annulee' where status = 'retournee';

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('en_attente', 'confirmee', 'annulee'));
