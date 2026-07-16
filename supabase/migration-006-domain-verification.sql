-- Migration 006 : Facebook Domain Verification (balise meta), configurable depuis les settings
-- À exécuter dans Supabase SQL Editor si les tables existent déjà.

alter table public.settings add column if not exists fb_domain_verification text;
