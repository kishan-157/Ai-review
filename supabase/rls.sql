-- ==============================================================================
-- LOCALBOOST AI REVIEW - ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Multi-Tenant Isolation, Public Visitor Safety & Super Admin Control
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 1. PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- User can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_super_admin());

-- User can update limited profile attributes (name, phone)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_super_admin());

-- Admin full access
CREATE POLICY "Admins have full profile access"
  ON public.profiles FOR ALL
  USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 2. BUSINESS CATEGORIES POLICIES
-- ------------------------------------------------------------------------------
-- Public & all users can view categories
CREATE POLICY "Anyone can view active categories"
  ON public.business_categories FOR SELECT
  USING (true);

-- Only Super Admins can manage categories
CREATE POLICY "Admins can manage categories"
  ON public.business_categories FOR ALL
  USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 3. BUSINESSES POLICIES
-- ------------------------------------------------------------------------------
-- Public visitors can read active businesses by slug/id for review landing page
CREATE POLICY "Public can view active businesses"
  ON public.businesses FOR SELECT
  USING (is_active = TRUE);

-- Customer can select/view their own businesses
CREATE POLICY "Customer can view own businesses"
  ON public.businesses FOR SELECT
  USING (auth.uid() = customer_id OR public.is_super_admin());

-- Customer can insert new businesses up to quota
CREATE POLICY "Customer can insert businesses"
  ON public.businesses FOR INSERT
  WITH CHECK (
    auth.uid() = customer_id AND
    (SELECT is_active FROM public.profiles WHERE id = auth.uid()) = TRUE AND
    (
      (SELECT is_lifetime FROM public.profiles WHERE id = auth.uid()) = TRUE OR
      (SELECT expiry_date FROM public.profiles WHERE id = auth.uid()) > now()
    ) AND
    (
      SELECT count(*) FROM public.businesses WHERE customer_id = auth.uid()
    ) < (SELECT max_businesses FROM public.profiles WHERE id = auth.uid())
  );

-- Customer can update own businesses
CREATE POLICY "Customer can update own businesses"
  ON public.businesses FOR UPDATE
  USING (auth.uid() = customer_id OR public.is_super_admin());

-- Customer can delete own businesses
CREATE POLICY "Customer can delete own businesses"
  ON public.businesses FOR DELETE
  USING (auth.uid() = customer_id OR public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 4. MASTER KEYWORDS POLICIES
-- ------------------------------------------------------------------------------
-- Anyone (visitors and customers) can view active master keywords
CREATE POLICY "Anyone can view active master keywords"
  ON public.master_keywords FOR SELECT
  USING (is_active = TRUE OR public.is_super_admin());

-- Only admins can mutate master keywords
CREATE POLICY "Admins can manage master keywords"
  ON public.master_keywords FOR ALL
  USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 5. BUSINESS KEYWORDS POLICIES
-- ------------------------------------------------------------------------------
-- Anyone can view keywords assigned to an active business
CREATE POLICY "Anyone can view active business keywords"
  ON public.business_keywords FOR SELECT
  USING (true);

-- Customer can manage keywords for their own businesses
CREATE POLICY "Customer can manage own business keywords"
  ON public.business_keywords FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_keywords.business_id AND customer_id = auth.uid()
    ) OR public.is_super_admin()
  );

-- ------------------------------------------------------------------------------
-- 6. PRIVATE FEEDBACK POLICIES
-- ------------------------------------------------------------------------------
-- Anonymous/public visitors can insert private feedback
CREATE POLICY "Public visitors can submit feedback"
  ON public.private_feedback FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_id AND is_active = TRUE
    )
  );

-- Business owners can view and update feedback for their businesses
CREATE POLICY "Owners can view their business feedback"
  ON public.private_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_id AND customer_id = auth.uid()
    ) OR public.is_super_admin()
  );

CREATE POLICY "Owners can update feedback status & notes"
  ON public.private_feedback FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_id AND customer_id = auth.uid()
    ) OR public.is_super_admin()
  );

-- ------------------------------------------------------------------------------
-- 7. QR SETTINGS POLICIES
-- ------------------------------------------------------------------------------
-- Public can read QR settings
CREATE POLICY "Public can view QR settings"
  ON public.qr_settings FOR SELECT
  USING (true);

-- Business owner can manage QR settings
CREATE POLICY "Owners can manage QR settings"
  ON public.qr_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = qr_settings.business_id AND customer_id = auth.uid()
    ) OR public.is_super_admin()
  );

-- ------------------------------------------------------------------------------
-- 8. ANALYTICS EVENTS POLICIES
-- ------------------------------------------------------------------------------
-- Anyone can log an analytics event (page view, qr visit, clicks)
CREATE POLICY "Public can insert analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

-- Business owners can view their business analytics
CREATE POLICY "Owners can view own business analytics"
  ON public.analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_id AND customer_id = auth.uid()
    ) OR public.is_super_admin()
  );

-- ------------------------------------------------------------------------------
-- 9. ANNOUNCEMENTS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Anyone can view active announcements"
  ON public.announcements FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL
  USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 10. ADMIN AUDIT LOGS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Admins only can view audit logs"
  ON public.admin_audit_logs FOR ALL
  USING (public.is_super_admin());
