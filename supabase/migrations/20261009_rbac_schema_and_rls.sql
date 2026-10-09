-- ==============================================================================
-- LOCALBOOST AI REVIEW: RBAC SCHEMA & COMPREHENSIVE ROW LEVEL SECURITY (RLS)
-- Multi-Tenant SaaS with Strict Tenant Isolation and Super Admin Rights
-- ==============================================================================

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE feedback_status AS ENUM ('New', 'In Progress', 'Resolved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. PROFILES TABLE (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role DEFAULT 'customer'::user_role NOT NULL,
    business_limit INTEGER DEFAULT 3 NOT NULL,
    expiry_date TIMESTAMPTZ,
    invited_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Alter table to ensure columns exist on existing databases
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_limit INTEGER DEFAULT 3 NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

-- Index for role and active lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3. BUSINESSES TABLE (Tenant-Owned)
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'Other / Custom Business',
    custom_category TEXT,
    tagline TEXT,
    description TEXT,
    products_services TEXT,
    address TEXT,
    phone TEXT,
    whatsapp TEXT,
    website TEXT,
    logo_url TEXT,
    brand_color TEXT DEFAULT '#7c3aed',
    accent_color TEXT DEFAULT '#6366f1',
    google_review_url TEXT NOT NULL,
    supported_languages TEXT[] DEFAULT ARRAY['en'] NOT NULL,
    display_keywords_count INTEGER DEFAULT 5 NOT NULL,
    custom_cta_text TEXT DEFAULT 'Open Google Review & Paste',
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_businesses_customer_id ON public.businesses(customer_id);
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);

-- 4. MASTER KEYWORDS (Global category keywords pool)
CREATE TABLE IF NOT EXISTS public.master_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en' NOT NULL,
    keyword TEXT NOT NULL,
    priority INTEGER DEFAULT 1 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_cat_lang_keyword UNIQUE(category, language, keyword)
);

CREATE INDEX IF NOT EXISTS idx_master_keywords_cat_lang ON public.master_keywords(category, language);

-- 5. BUSINESS KEYWORDS (Tenant-specific custom keywords and overrides)
CREATE TABLE IF NOT EXISTS public.business_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en' NOT NULL,
    is_custom BOOLEAN DEFAULT TRUE NOT NULL,
    is_disabled BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_biz_kw_lang UNIQUE(business_id, language, keyword)
);

CREATE INDEX IF NOT EXISTS idx_biz_keywords_business_id ON public.business_keywords(business_id);

-- 6. PRIVATE FEEDBACK TABLE (Tenant-Owned feedback)
CREATE TABLE IF NOT EXISTS public.private_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    message TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    status feedback_status DEFAULT 'New'::feedback_status NOT NULL,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_private_feedback_business ON public.private_feedback(business_id);

-- 7. AUDIT LOGS TABLE (For Impersonation & Security Audits)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.admin_audit_logs(timestamp);

-- ==============================================================================
-- 8. HELPER SECURITY FUNCTIONS
-- ==============================================================================

-- Security definer check to avoid recursive RLS execution
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create a profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'customer'::user_role,
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Customers can view their own profile; Super Admins can view all profiles
CREATE POLICY "Profiles view policy"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_super_admin());

-- Customers can update their own full_name; Super Admins can update any profile (roles, status)
CREATE POLICY "Profiles update policy"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_super_admin());

-- Super Admins can insert or delete profiles
CREATE POLICY "Admins manage profiles"
  ON public.profiles FOR ALL
  USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- B. BUSINESSES POLICIES (Tenant Isolation)
-- ------------------------------------------------------------------------------
-- Public visitors can read active businesses by slug for review pages
CREATE POLICY "Public can view active businesses"
  ON public.businesses FOR SELECT
  USING (is_active = TRUE);

-- Customers can select their own businesses; Admins can select all
CREATE POLICY "Tenant select businesses"
  ON public.businesses FOR SELECT
  USING (auth.uid() = customer_id OR public.is_super_admin());

-- Customers can insert businesses assigned to their own user id
CREATE POLICY "Tenant insert businesses"
  ON public.businesses FOR INSERT
  WITH CHECK (
    auth.uid() = customer_id AND
    (SELECT is_active FROM public.profiles WHERE id = auth.uid()) = TRUE
  );

-- Customers can update only their own businesses
CREATE POLICY "Tenant update businesses"
  ON public.businesses FOR UPDATE
  USING (auth.uid() = customer_id OR public.is_super_admin());

-- Customers can delete only their own businesses
CREATE POLICY "Tenant delete businesses"
  ON public.businesses FOR DELETE
  USING (auth.uid() = customer_id OR public.is_super_admin());

-- ------------------------------------------------------------------------------
-- C. MASTER KEYWORDS POLICIES
-- ------------------------------------------------------------------------------
-- Anyone (visitors and tenants) can read active master keywords
CREATE POLICY "Public and tenants view master keywords"
  ON public.master_keywords FOR SELECT
  USING (is_active = TRUE OR public.is_super_admin());

-- Only Super Admins can manage master keywords
CREATE POLICY "Super Admins manage master keywords"
  ON public.master_keywords FOR ALL
  USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- D. BUSINESS KEYWORDS POLICIES
-- ------------------------------------------------------------------------------
-- Public can view keywords for public review page
CREATE POLICY "Public view business keywords"
  ON public.business_keywords FOR SELECT
  USING (true);

-- Tenants manage keywords belonging to their own businesses
CREATE POLICY "Tenants manage their business keywords"
  ON public.business_keywords FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_keywords.business_id AND customer_id = auth.uid()
    ) OR public.is_super_admin()
  );

-- ------------------------------------------------------------------------------
-- E. PRIVATE FEEDBACK POLICIES
-- ------------------------------------------------------------------------------
-- Public visitors can insert feedback for an active business
CREATE POLICY "Public can submit private feedback"
  ON public.private_feedback FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_id AND is_active = TRUE
    )
  );

-- Tenants can view feedback for their own businesses only; Super Admins can view all
CREATE POLICY "Tenants view own business feedback"
  ON public.private_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_id AND customer_id = auth.uid()
    ) OR public.is_super_admin()
  );

-- Tenants can update status & internal notes for feedback on their businesses
CREATE POLICY "Tenants update own business feedback"
  ON public.private_feedback FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_id AND customer_id = auth.uid()
    ) OR public.is_super_admin()
  );

-- ------------------------------------------------------------------------------
-- F. ADMIN AUDIT LOGS POLICIES
-- ------------------------------------------------------------------------------
-- Super Admins only can read audit logs
CREATE POLICY "Super Admins view audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (public.is_super_admin());

-- Super Admins and Service Role can insert audit logs
CREATE POLICY "Super Admins insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  WITH CHECK (public.is_super_admin());

-- ==============================================================================
-- 10. MANUAL SQL: HOW TO PROMOTE OR INSERT THE FIRST SUPER ADMIN
-- ==============================================================================
-- OPTION A: If you already have a signed-up user in auth.users, promote them:
-- UPDATE public.profiles
-- SET role = 'super_admin'
-- WHERE email = 'admin@localboost.io';

-- OPTION B: Insert directly into auth.users (if using a pre-seeded UUID) and profiles:
-- (Replace '00000000-0000-0000-0000-000000000001' and password hash with your credentials)
/*
DO $$
DECLARE
  super_admin_id UUID := 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
BEGIN
  -- Insert profile with super_admin role
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    super_admin_id,
    'admin@localboost.io',
    'Root Super Administrator',
    'super_admin',
    TRUE
  )
  ON CONFLICT (id) DO UPDATE
  SET role = 'super_admin', is_active = TRUE;
END $$;
*/
