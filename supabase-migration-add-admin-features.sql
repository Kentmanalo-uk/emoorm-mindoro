-- ============================================================
-- Admin Moderator Features Migration
-- Adds tables for: audit log, reports/disputes, vouchers,
-- banners, ai-moderation queue, admin sub-roles
-- ============================================================

-- 1. ADMIN AUDIT LOG ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "adminId" text NOT NULL,
  "adminEmail" text,
  action text NOT NULL,
  "targetType" text,
  "targetId" text,
  "targetLabel" text,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  "createdAt" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_log("adminId");
CREATE INDEX IF NOT EXISTS idx_audit_target ON admin_audit_log("targetType", "targetId");
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log("createdAt" DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read audit log" ON admin_audit_log;
CREATE POLICY "Admins read audit log"
  ON admin_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins insert audit log" ON admin_audit_log;
CREATE POLICY "Admins insert audit log"
  ON admin_audit_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'admin'
    )
  );


-- 2. REPORTS / DISPUTES -------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "reporterId" text NOT NULL,
  "reporterRole" text,
  "targetType" text NOT NULL CHECK ("targetType" IN ('product', 'seller', 'user', 'review', 'order', 'message')),
  "targetId" text NOT NULL,
  "targetLabel" text,
  category text NOT NULL,
  description text,
  evidence jsonb DEFAULT '[]'::jsonb,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'rejected')),
  "assignedAdminId" text,
  resolution text,
  "resolvedAt" timestamptz,
  "resolvedByAdminId" text,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_priority ON reports(priority);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports("targetType", "targetId");
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports("reporterId");
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports("createdAt" DESC);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users create own reports" ON reports;
CREATE POLICY "Users create own reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid()::text = "reporterId"::text);

DROP POLICY IF EXISTS "Users view own reports" ON reports;
CREATE POLICY "Users view own reports"
  ON reports FOR SELECT
  USING (auth.uid()::text = "reporterId"::text);

DROP POLICY IF EXISTS "Admins full access on reports" ON reports;
CREATE POLICY "Admins full access on reports"
  ON reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'admin'
    )
  );


-- 3. VOUCHERS / PROMO CODES ---------------------------------------------------
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  description text,
  "discountType" text NOT NULL CHECK ("discountType" IN ('percentage', 'fixed', 'free_shipping')),
  "discountValue" numeric NOT NULL DEFAULT 0,
  "minOrderAmount" numeric DEFAULT 0,
  "maxRedemptions" integer,
  "redemptionCount" integer DEFAULT 0,
  "perUserLimit" integer DEFAULT 1,
  "validFrom" timestamptz DEFAULT now(),
  "validUntil" timestamptz,
  "applicableCategories" text[],
  active boolean DEFAULT true,
  "createdByAdminId" text,
  "createdAt" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_active ON vouchers(active);

ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone view active vouchers" ON vouchers;
CREATE POLICY "Anyone view active vouchers"
  ON vouchers FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Admins manage vouchers" ON vouchers;
CREATE POLICY "Admins manage vouchers"
  ON vouchers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'admin'
    )
  );


-- 4. BANNERS / FEATURED CONTENT -----------------------------------------------
CREATE TABLE IF NOT EXISTS banners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  subtitle text,
  "imageUrl" text NOT NULL,
  "linkUrl" text,
  position text DEFAULT 'home_top' CHECK (position IN ('home_top', 'home_middle', 'home_bottom', 'category', 'checkout')),
  "sortOrder" integer DEFAULT 0,
  active boolean DEFAULT true,
  "startsAt" timestamptz DEFAULT now(),
  "endsAt" timestamptz,
  "createdByAdminId" text,
  "createdAt" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banners_position ON banners(position);
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(active);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone view active banners" ON banners;
CREATE POLICY "Anyone view active banners"
  ON banners FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Admins manage banners" ON banners;
CREATE POLICY "Admins manage banners"
  ON banners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'admin'
    )
  );


-- 5. AI MODERATION FLAGS ------------------------------------------------------
CREATE TABLE IF NOT EXISTS moderation_flags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "targetType" text NOT NULL CHECK ("targetType" IN ('product', 'review', 'image', 'message')),
  "targetId" text NOT NULL,
  "flagType" text NOT NULL,
  confidence numeric DEFAULT 0,
  reason text,
  "rawData" jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_removed')),
  "reviewedByAdminId" text,
  "reviewedAt" timestamptz,
  "createdAt" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_modflags_status ON moderation_flags(status);
CREATE INDEX IF NOT EXISTS idx_modflags_target ON moderation_flags("targetType", "targetId");
CREATE INDEX IF NOT EXISTS idx_modflags_created ON moderation_flags("createdAt" DESC);

ALTER TABLE moderation_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage moderation flags" ON moderation_flags;
CREATE POLICY "Admins manage moderation flags"
  ON moderation_flags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'admin'
    )
  );


-- 6. ADMIN SUB-ROLES ----------------------------------------------------------
-- Granular permission tiers within the 'admin' role
ALTER TABLE users ADD COLUMN IF NOT EXISTS "adminTier" text
  CHECK ("adminTier" IN ('super_admin', 'moderator', 'support', 'marketing', 'finance'));

-- Default existing admins to 'super_admin' so behavior is unchanged
UPDATE users SET "adminTier" = 'super_admin'
  WHERE role = 'admin' AND "adminTier" IS NULL;

-- 2FA enrollment marker (verification handled by Supabase Auth MFA on the client)
ALTER TABLE users ADD COLUMN IF NOT EXISTS "twoFactorEnabled" boolean DEFAULT false;
