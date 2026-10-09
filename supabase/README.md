# LocalBoost AI Review — Supabase Database & Security Guide

This folder contains the complete PostgreSQL database migrations and Row Level Security (RLS) policies for LocalBoost AI Review.

## 1. Quick Setup in Supabase

1. Create a new project at [database.new](https://database.new) or in your Supabase dashboard.
2. Go to **SQL Editor** in the Supabase Dashboard.
3. Run `supabase/schema.sql` to create all tables, indexes, triggers, and foreign key relationships.
4. Run `supabase/rls.sql` to enable and enforce Row Level Security across all tables.

## 2. Environment Variables

Add the following credentials to your `.env` file (see `.env.example`):

```bash
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_ANON_KEY="eyJhbGci..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."
GEMINI_API_KEY="AIzaSy..."
```

## 3. Database Schema Overview

| Table | Purpose | Access Control |
|---|---|---|
| `profiles` | Multi-tenant customer accounts & Admin flags | User reads self; Super Admin manages all |
| `business_categories` | Universal 23+ default & custom categories | Public read; Admin write |
| `businesses` | Business listings, slugs, contact & Google Review URLs | Public reads active; Customer manages own (enforces max business quota) |
| `master_keywords` | High-priority keyword pool across EN, HI, GU | Public read; Admin write |
| `business_keywords` | Customer business-specific overrides & custom keywords | Customer manages own |
| `private_feedback` | Internal 1-5 star feedback & notes | Public insert; Customer & Admin view/update |
| `qr_settings` | Custom colors, styles, and download settings | Customer manages own |
| `analytics_events` | Page visits, QR scans, draft generation, Google clicks | Public insert; Customer views aggregated |
| `admin_audit_logs` | Immutable audit trail for impersonation & changes | Super Admin only |
| `announcements` | System-wide notices for customer dashboards | Public/Customer read; Admin write |

## 4. Multi-Tenant Architecture & RLS Highlights

- **Tenant Isolation**: Customers can strictly only query and mutate businesses where `customer_id = auth.uid()`.
- **Quota Enforced at DB Level**: Inserting a new business checks `is_active`, account expiry date or `is_lifetime`, and enforces `count(*) < max_businesses`.
- **Public Protection**: Public visitors can ONLY query active business metadata and insert feedback/analytics. They cannot view customer emails, admin logs, or private feedback notes.
