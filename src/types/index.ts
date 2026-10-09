export type BusinessCategoryType =
  | 'Restaurant'
  | 'Cafe'
  | 'Hotel'
  | 'Salon'
  | 'Beauty Parlour'
  | 'Clothing Store'
  | 'Retail Shop'
  | 'Grocery Store'
  | 'Gym and Fitness'
  | 'Clinic'
  | 'Hospital'
  | 'Dentist'
  | 'Pharmacy'
  | 'Electronics Store'
  | 'Automobile Dealer'
  | 'Car Repair'
  | 'Real Estate'
  | 'Coaching Institute'
  | 'School'
  | 'Travel Agency'
  | 'Professional Services'
  | 'Home Services'
  | 'Other / Custom Business'
  | string;

export type SupportedLanguage = 'en' | 'hi' | 'gu';

export interface BusinessCategory {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  isCustom?: boolean;
  activeKeywordsCount?: number;
}

export interface Business {
  id: string;
  customerId: string;
  name: string;
  slug: string;
  category: BusinessCategoryType;
  customCategory?: string;
  tagline?: string;
  description?: string;
  productsServices?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  logoUrl?: string;
  brandColor?: string;
  googleReviewUrl: string;
  supportedLanguages: SupportedLanguage[];
  displayKeywordsCount: number; // default 5
  accentColor?: string;
  customCtaText?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MasterKeyword {
  id: string;
  category: BusinessCategoryType;
  language: SupportedLanguage;
  keyword: string;
  priority: number; // higher = higher chance in rotation
  isActive: boolean;
  createdAt: string;
}

export interface BusinessKeyword {
  id: string;
  businessId: string;
  keyword: string;
  language: SupportedLanguage;
  isCustom: boolean; // if added by customer
  isDisabled: boolean; // customer disabled a master keyword
  createdAt: string;
}

export interface PrivateFeedback {
  id: string;
  businessId: string;
  rating: number;
  message: string;
  customerName?: string;
  customerPhone?: string;
  status: 'New' | 'In Progress' | 'Resolved';
  adminNotes?: string;
  createdAt: string;
}

export interface CustomerAccount {
  id: string;
  email: string;
  name: string;
  phone?: string;
  password?: string;
  role: 'customer' | 'admin';
  isActive: boolean;
  isLifetime: boolean;
  expiryDate?: string;
  maxBusinesses: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewDraft {
  id: string;
  tone: string;
  text: string;
  keywordsUsed: string[];
  language: SupportedLanguage;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  details: string;
  timestamp: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface AnalyticsEvent {
  id: string;
  businessId: string;
  eventType:
    | 'page_view'
    | 'qr_visit'
    | 'rating_select'
    | 'keyword_select'
    | 'ai_generate'
    | 'google_review_click'
    | 'private_feedback';
  meta?: Record<string, any>;
  timestamp: string;
}

export interface QRSettings {
  businessId: string;
  fgColor: string;
  bgColor: string;
  style: 'classic' | 'modern-card' | 'table-standee' | 'minimal';
  showLogo: boolean;
  customCta: string;
}
