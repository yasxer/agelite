-- Migration 010 : suppression de l'ancien booléen, remplacé par
-- free_delivery_mode (migration 009).
-- À exécuter APRÈS avoir déployé le nouveau code : tant que l'ancienne
-- version tourne, elle lit encore cette colonne.

alter table public.settings drop column if exists free_delivery;
