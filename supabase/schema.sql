-- ==============================================================================
-- LOCALBOOST AI REVIEW - COMPREHENSIVE SUPABASE POSTGRESQL SCHEMA
-- Multi-Tenant SaaS Platform with Universal Business Support & RLS
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & DOMAINS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE feedback_status AS ENUM ('New', 'In Progress', 'Resolved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES / USERS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role DEFAULT 'customer'::user_role NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_lifetime BOOLEAN DEFAULT FALSE NOT NULL,
    expiry_date TIMESTAMPTZ,
    max_businesses INTEGER DEFAULT 3 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. BUSINESS CATEGORIES
CREATE TABLE IF NOT EXISTS public.business_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT 'Building2',
    description TEXT,
    is_custom BOOLEAN DEFAULT FALSE NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. BUSINESSES
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
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
    custom_cta_text TEXT DEFAULT 'Share Your Experience on Google',
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_businesses_customer_id ON public.businesses(customer_id);
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);

-- 6. MASTER KEYWORDS (Category-level pool maintained by Super Admin)
CREATE TABLE IF NOT EXISTS public.master_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en' NOT NULL,
    keyword TEXT NOT NULL,
    priority INTEGER DEFAULT 1 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_category_language_keyword UNIQUE(category, language, keyword)
);

CREATE INDEX IF NOT EXISTS idx_master_keywords_cat_lang ON public.master_keywords(category, language);

-- 7. BUSINESS CUSTOM KEYWORDS & OVERRIDES
CREATE TABLE IF NOT EXISTS public.business_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en' NOT NULL,
    is_custom BOOLEAN DEFAULT TRUE NOT NULL,
    is_disabled BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_business_keyword UNIQUE(business_id, language, keyword)
);

CREATE INDEX IF NOT EXISTS idx_biz_keywords ON public.business_keywords(business_id);

-- 8. PRIVATE FEEDBACK
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

CREATE INDEX IF NOT EXISTS idx_feedback_biz ON public.private_feedback(business_id);

-- 9. QR SETTINGS & CUSTOM STYLES
CREATE TABLE IF NOT EXISTS public.qr_settings (
    business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
    fg_color TEXT DEFAULT '#1e1b4b' NOT NULL,
    bg_color TEXT DEFAULT '#ffffff' NOT NULL,
    style TEXT DEFAULT 'modern-card' NOT NULL,
    show_logo BOOLEAN DEFAULT TRUE NOT NULL,
    custom_cta TEXT DEFAULT 'Scan to Review Us on Google!',
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. ANALYTICS EVENTS
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    meta JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_biz_event ON public.analytics_events(business_id, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_time ON public.analytics_events(timestamp);

-- 11. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. ADMIN AUDIT LOGS
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

CREATE INDEX IF NOT EXISTS idx_audit_time ON public.admin_audit_logs(timestamp);
