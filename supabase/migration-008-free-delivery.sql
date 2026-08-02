-- Migration 008 : livraison offerte (le client ne paie pas les frais, la
-- boutique les absorbe — Yalidine les déduit quand même de son versement)
-- À exécuter dans Supabase SQL Editor si les tables existent déjà.

alter table public.settings
  add column if not exists free_delivery boolean not null default false;
