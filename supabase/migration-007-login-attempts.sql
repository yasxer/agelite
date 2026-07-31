-- Migration 007 : limitation des tentatives de connexion admin (anti brute force)
-- À exécuter dans Supabase SQL Editor si les tables existent déjà.

-- Une ligne par IP. Le compteur est remis à zéro à chaque connexion réussie
-- et à l'expiration de la fenêtre.
create table if not exists public.login_attempts (
  ip text primary key,
  failures int not null default 0,
  -- début de la fenêtre glissante dans laquelle on compte les échecs
  window_started_at timestamptz not null default now(),
  -- verrouillage en cours (null = pas verrouillé)
  locked_until timestamptz,
  -- nombre de verrouillages consécutifs : sert à doubler la durée à chaque fois
  lockouts int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists login_attempts_updated_at_idx
  on public.login_attempts (updated_at);

-- Sécurité : RLS activé, aucun accès public
-- (seule la clé service_role côté serveur y touche)
alter table public.login_attempts enable row level security;
