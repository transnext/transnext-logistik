-- Migration: Fix Fahrer Auslagennachweise RLS Policies
-- Applied: 2026-06-01
-- Issue: Drivers could not upload expenses - only admins (like Burak Aydin) worked
-- Root Cause: Missing SELECT policy for fahrer role on auslagennachweise table
--
-- The code uses: .insert([...]).select().single()
-- INSERT succeeded, but SELECT failed due to missing read permissions

-- =====================================================
-- CRITICAL FIX: Add SELECT policy for fahrer
-- =====================================================

-- Drop if exists (for idempotency)
DROP POLICY IF EXISTS "fahrer_auslagennachweise_select" ON public.auslagennachweise;

-- Fahrer can SELECT their own records
CREATE POLICY "fahrer_auslagennachweise_select"
ON public.auslagennachweise FOR SELECT TO public
USING (
  (user_id = auth.uid())
  AND (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'fahrer'::text
  ))
);

-- =====================================================
-- Add UPDATE policy for fahrer (was also missing)
-- =====================================================

DROP POLICY IF EXISTS "fahrer_auslagennachweise_update" ON public.auslagennachweise;

-- Fahrer can UPDATE their own unlocked records
CREATE POLICY "fahrer_auslagennachweise_update"
ON public.auslagennachweise FOR UPDATE TO public
USING (
  (user_id = auth.uid())
  AND (locked_at IS NULL)
  AND (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'fahrer'::text
  ))
)
WITH CHECK (
  (user_id = auth.uid())
  AND (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'fahrer'::text
  ))
);

-- =====================================================
-- Update INSERT policy for consistency
-- =====================================================

DROP POLICY IF EXISTS "fahrer_auslagennachweise_insert_own" ON public.auslagennachweise;
DROP POLICY IF EXISTS "fahrer_auslagennachweise_insert" ON public.auslagennachweise;

-- Fahrer can INSERT their own records
CREATE POLICY "fahrer_auslagennachweise_insert"
ON public.auslagennachweise FOR INSERT TO public
WITH CHECK (
  (user_id = auth.uid())
  AND (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'fahrer'::text
  ))
);

-- =====================================================
-- NOTE: This migration was applied directly to Supabase
-- on 2026-06-01 to fix a production-critical bug.
-- This file documents the changes for version control.
-- =====================================================
