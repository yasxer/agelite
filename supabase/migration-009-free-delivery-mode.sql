-- Migration 009 : livraison offerte en 3 modes (remplace le booléen free_delivery)
--   'none'     : le client paie les frais Yalidine
--   'stopdesk' : le bureau est offert, le domicile reste payant
--   'all'      : tout est offert, la commande part toujours à domicile
-- À exécuter dans Supabase SQL Editor AVANT de déployer le nouveau code.

alter table public.settings
  add column if not exists free_delivery_mode text not null default 'none';

-- Report de l'ancien réglage : "offert" valait "offert partout"
update public.settings
  set free_delivery_mode = 'all'
  where free_delivery = true and free_delivery_mode = 'none';

-- Bloc do : "add constraint if not exists" n'existe pas, on garde le script
-- ré-exécutable sans erreur
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'settings_free_delivery_mode_check'
  ) then
    alter table public.settings
      add constraint settings_free_delivery_mode_check
      check (free_delivery_mode in ('none', 'all', 'stopdesk'));
  end if;
end $$;

-- La colonne free_delivery est volontairement conservée ici : tant que
-- l'ancien code tourne en production, il continue de la lire. Elle est
-- supprimée par la migration 010, une fois le nouveau code déployé.
