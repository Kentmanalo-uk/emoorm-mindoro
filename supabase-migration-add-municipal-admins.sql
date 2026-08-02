-- ============================================================================
-- Role-based Municipality Admins
-- Idempotent. Safe to run multiple times.
-- ============================================================================

-- 1. USERS: add municipality assignment + widen role check
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS municipality text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS "disabledAt" timestamptz;

-- Ensure stores has both city (existing) and municipality columns so the
-- scope-matching function below can reference either one.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS municipality text;

-- If a legacy CHECK constraint restricts role values, drop it so we can add
-- 'municipal_admin' safely.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- Normalize any legacy / null role values so the new CHECK constraint below
-- doesn't reject existing rows.
UPDATE public.users SET role = 'user'
  WHERE role IS NULL
     OR role NOT IN ('user', 'seller', 'admin', 'municipal_admin');

-- Log any remaining odd rows just in case (should be zero after the UPDATE above).
DO $$
DECLARE
  bad_count integer;
BEGIN
  SELECT count(*) INTO bad_count FROM public.users
  WHERE role IS NULL
     OR role NOT IN ('user', 'seller', 'admin', 'municipal_admin');
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Cannot add users_role_check: % rows still have an invalid role. Fix them first.', bad_count;
  END IF;
END $$;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'seller', 'admin', 'municipal_admin'));

-- 2. Helper functions (SECURITY DEFINER, bypass RLS to avoid recursion)
-- ---------------------------------------------------------------------------
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

CREATE OR REPLACE FUNCTION public.is_municipal_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role = 'municipal_admin' FROM public.users WHERE id::text = uid::text),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_any_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'municipal_admin')
       FROM public.users WHERE id::text = uid::text),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_municipality(uid uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT municipality FROM public.users
  WHERE id::text = uid::text AND role = 'municipal_admin';
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM public;
REVOKE ALL ON FUNCTION public.is_municipal_admin(uuid) FROM public;
REVOKE ALL ON FUNCTION public.is_any_admin(uuid) FROM public;
REVOKE ALL ON FUNCTION public.admin_municipality(uuid) FROM public;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid)             TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_municipal_admin(uuid)   TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_any_admin(uuid)         TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_municipality(uuid)   TO anon, authenticated, service_role;

-- Match a store against a municipal admin's assigned municipality.
-- Case-insensitive comparison against either `municipality` or `city`.
CREATE OR REPLACE FUNCTION public.store_matches_admin_scope(
  store_row public.stores,
  uid uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    public.is_admin(uid)
    OR (
      public.is_municipal_admin(uid)
      AND (
        lower(coalesce((store_row).municipality, '')) = lower(coalesce(public.admin_municipality(uid), ''))
        OR lower(coalesce((store_row).city, '')) = lower(coalesce(public.admin_municipality(uid), ''))
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.store_matches_admin_scope(public.stores, uuid)
  TO anon, authenticated, service_role;

-- 3. USERS RLS: only general admins can create/modify municipal admins
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated can view users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "User can insert own row"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id::text);

-- General admin can create user rows (e.g. municipal admin placeholders).
CREATE POLICY "Admin can insert users"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Users can update their own profile; general admins can update anyone;
-- municipal admins CANNOT modify user rows (they only manage sellers).
CREATE POLICY "User self-update or admin update"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text OR public.is_admin())
  WITH CHECK (auth.uid()::text = id::text OR public.is_admin());

CREATE POLICY "Admin can delete users"
  ON public.users FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 4. STORES RLS: scope updates & deletes to municipal admins' municipality
-- ---------------------------------------------------------------------------
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='stores'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.stores', pol.policyname);
  END LOOP;
END $$;

-- Public read (existing behavior — store profiles are public)
CREATE POLICY "Public can view stores"
  ON public.stores FOR SELECT
  TO anon, authenticated
  USING (true);

-- Owner can insert their own store
CREATE POLICY "Seller can create own store"
  ON public.stores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id::text OR auth.uid()::text = "ownerId"::text);

-- Owner OR any admin scoped to that municipality can update
CREATE POLICY "Owner or scoped admin can update store"
  ON public.stores FOR UPDATE
  TO authenticated
  USING (
    auth.uid()::text = id::text
    OR auth.uid()::text = "ownerId"::text
    OR public.store_matches_admin_scope(stores)
  )
  WITH CHECK (
    auth.uid()::text = id::text
    OR auth.uid()::text = "ownerId"::text
    OR public.store_matches_admin_scope(stores)
  );

-- Only general admin OR municipal admin whose scope covers the store can delete
CREATE POLICY "Scoped admin can delete store"
  ON public.stores FOR DELETE
  TO authenticated
  USING (public.store_matches_admin_scope(stores));

-- 5. FACILITIES (products) RLS: scope moderation to seller's municipality
-- ---------------------------------------------------------------------------
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='facilities'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.facilities', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Public can view products"
  ON public.facilities FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Seller can insert own product"
  ON public.facilities FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid()::text = "sellerId"::text
    OR auth.uid()::text = "storeId"::text
  );

CREATE POLICY "Owner or scoped admin can update product"
  ON public.facilities FOR UPDATE
  TO authenticated
  USING (
    auth.uid()::text = "sellerId"::text
    OR auth.uid()::text = "storeId"::text
    OR public.is_admin()
    OR (
      public.is_municipal_admin()
      AND EXISTS (
        SELECT 1 FROM public.stores s
        WHERE (s.id::text = facilities."sellerId"::text OR s.id::text = facilities."storeId"::text)
          AND public.store_matches_admin_scope(s)
      )
    )
  )
  WITH CHECK (
    auth.uid()::text = "sellerId"::text
    OR auth.uid()::text = "storeId"::text
    OR public.is_admin()
    OR (
      public.is_municipal_admin()
      AND EXISTS (
        SELECT 1 FROM public.stores s
        WHERE (s.id::text = facilities."sellerId"::text OR s.id::text = facilities."storeId"::text)
          AND public.store_matches_admin_scope(s)
      )
    )
  );

CREATE POLICY "Owner or scoped admin can delete product"
  ON public.facilities FOR DELETE
  TO authenticated
  USING (
    auth.uid()::text = "sellerId"::text
    OR auth.uid()::text = "storeId"::text
    OR public.is_admin()
    OR (
      public.is_municipal_admin()
      AND EXISTS (
        SELECT 1 FROM public.stores s
        WHERE (s.id::text = facilities."sellerId"::text OR s.id::text = facilities."storeId"::text)
          AND public.store_matches_admin_scope(s)
      )
    )
  );

-- 6. REPORTS RLS (if the table exists) — scope moderation to municipality
-- ---------------------------------------------------------------------------
DO $outer$
DECLARE
  pol record;
  store_col text;
  reporter_col text;
  scope_sql text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='reports'
  ) THEN
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY';

  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='reports'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.reports', pol.policyname);
  END LOOP;

  -- Detect which column identifies the reported store (varies across schemas).
  SELECT column_name INTO store_col
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='reports'
     AND column_name IN ('storeId','store_id','targetId','target_id','reportedId','reported_id')
   ORDER BY array_position(
       ARRAY['storeId','store_id','targetId','target_id','reportedId','reported_id']::text[],
       column_name
     )
   LIMIT 1;

  SELECT column_name INTO reporter_col
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='reports'
     AND column_name IN ('reporterId','reporter_id','userId','user_id','authorId','author_id')
   ORDER BY array_position(
       ARRAY['reporterId','reporter_id','userId','user_id','authorId','author_id']::text[],
       column_name
     )
   LIMIT 1;

  -- If a store column exists, municipal admins are scoped to their municipality.
  -- Otherwise they see nothing report-related; only super admins do.
  IF store_col IS NOT NULL THEN
    scope_sql := format($f$
      OR (
        public.is_municipal_admin()
        AND EXISTS (
          SELECT 1 FROM public.stores s
          WHERE s.id::text = coalesce((reports.%I)::text, '')
            AND public.store_matches_admin_scope(s)
        )
      )
    $f$, store_col);
  ELSE
    scope_sql := '';
  END IF;

  IF reporter_col IS NOT NULL THEN
    EXECUTE format($f$
      CREATE POLICY "Reporter or scoped admin can view report"
        ON public.reports FOR SELECT
        TO authenticated
        USING (
          auth.uid()::text = coalesce((reports.%I)::text, '')
          OR public.is_admin()
          %s
        )
    $f$, reporter_col, scope_sql);

    EXECUTE format($f$
      CREATE POLICY "Reporter can create report"
        ON public.reports FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid()::text = coalesce((reports.%I)::text, ''))
    $f$, reporter_col);
  ELSE
    EXECUTE $f$
      CREATE POLICY "Admin can view report"
        ON public.reports FOR SELECT
        TO authenticated
        USING (public.is_admin())
    $f$;
  END IF;

  EXECUTE format($f$
    CREATE POLICY "Scoped admin can update report"
      ON public.reports FOR UPDATE
      TO authenticated
      USING (public.is_admin() %s)
  $f$, scope_sql);
END $outer$;

-- 7. Seed / preserve the General Admin account
-- ---------------------------------------------------------------------------
-- Ensures creaitonsliora@gmail.com always keeps role='admin' (super admin).
-- Idempotent: only touches this one row.
UPDATE public.users
   SET role = 'admin',
       municipality = NULL,
       "disabledAt" = NULL
 WHERE lower(email) = lower('creaitonsliora@gmail.com');

-- 8. Verification
-- ---------------------------------------------------------------------------
SELECT policyname, cmd, tablename FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('users','stores','facilities','reports')
ORDER BY tablename, policyname;

SELECT id, email, role, municipality
  FROM public.users
 WHERE role IN ('admin','municipal_admin')
 ORDER BY role, email;
