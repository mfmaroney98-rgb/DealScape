-- Migration: Add first_name and last_name columns to user_profiles

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;
