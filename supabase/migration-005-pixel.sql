-- Migration 005 : Meta Pixel (Facebook) configurable depuis les settings
-- À exécuter dans Supabase SQL Editor si les tables existent déjà.

alter table public.settings add column if not exists pixel_id text;
