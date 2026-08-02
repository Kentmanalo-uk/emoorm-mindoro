-- ============================================================================
-- Schema + RLS repair
-- Run once in Supabase SQL Editor. Every statement is idempotent.
-- ============================================================================

-- 1. FACILITIES: wholesale / product-type columns used by the seller product form
-- ---------------------------------------------------------------------------
ALTER TABLE facilities
  ADD COLUMN IF NOT EXISTS "productType" text DEFAULT 'normal'
    CHECK ("productType" IN ('normal', 'wholesale'));
ALTER TABLE facilities
  ADD COLUMN IF NOT EXISTS "minimumBulkQuantity" integer DEFAULT 0;
ALTER TABLE facilities
  ADD COLUMN IF NOT EXISTS "bulkPricePerUnit" numeric DEFAULT 0;

-- 2. STORES: ID verification + address columns used by seller registration
-- ---------------------------------------------------------------------------
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS "governmentIdType" text;
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS "governmentIdFront" text;
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS "governmentIdBack" text;
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS "selfieImage" text;
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS barangay text;
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS "ownerId" text;

-- 3. USERS: rebuild policies to remove the infinite recursion
-- ---------------------------------------------------------------------------
-- Root cause: an existing policy on `users` (e.g. an "Admins can manage users"
-- policy) had a USING clause of the form
--   (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
-- Postgres evaluates that subquery under the same RLS policy, which then
-- evaluates the subquery again, and so on → "infinite recursion detected".
--
-- Fix: use a SECURITY DEFINER function that runs *as the function owner*
-- with `SET row_security = off`, so it can read `users.role` without
-- re-triggering the policy check. Policies then just call `public.is_admin()`.

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.users WHERE id::text = uid::text),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated, service_role;

-- Ensure RLS is on
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop every known / historical policy on users so we start clean
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
  END LOOP;
END $$;

-- Any signed-in user can read the public user directory (needed for header,
-- seller lookups, admin UIs). Anonymous read stays off.
CREATE POLICY "Authenticated can view users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- A user can read their own row when not signed in via a session token
-- (edge case: right after signup, before session is fully hydrated).
CREATE POLICY "User can view own row"
  ON users FOR SELECT
  TO anon
  USING (false);

-- A user can insert their own row (used by signup / OAuth callback)
CREATE POLICY "User can insert own row"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id::text);

-- A user can update their own row; admins can update any row.
-- CRUCIAL: the USING/CHECK clauses do NOT SELECT from users directly.
CREATE POLICY "User can update own row"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text OR public.is_admin())
  WITH CHECK (auth.uid()::text = id::text OR public.is_admin());

-- Only admins can delete
CREATE POLICY "Admin can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Admin escape hatch (SELECT/INSERT/UPDATE/DELETE) — non-recursive because
-- is_admin() bypasses RLS via SECURITY DEFINER.
CREATE POLICY "Admin full access on users"
  ON users FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Verification
-- ---------------------------------------------------------------------------
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;
