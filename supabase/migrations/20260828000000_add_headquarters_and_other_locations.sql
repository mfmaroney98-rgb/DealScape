-- Migration: Add Headquarters and Other Locations columns to organizations table
-- These fields represent locations associated with the organization.

-- 1. Add columns to organizations table
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS headquarters TEXT,
  ADD COLUMN IF NOT EXISTS other_locations TEXT[] DEFAULT '{}';
