import {
  Business,
  BusinessCategory,
  CustomerAccount,
  MasterKeyword,
  PrivateFeedback,
  Announcement,
  AuditLog,
  SupportedLanguage,
  ReviewDraft,
  BusinessKeyword,
  QRSettings,
} from '../types';

export interface GlobalDataResponse {
  categories: BusinessCategory[];
  customers: CustomerAccount[];
  businesses: Business[];
  masterKeywords: MasterKeyword[];
  businessKeywords: BusinessKeyword[];
  feedback: PrivateFeedback[];
  announcements: Announcement[];
  auditLogs: AuditLog[];
}

export const api = {
  async getGlobalData(): Promise<GlobalDataResponse> {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('Failed to load platform data');
    return res.json();
  },

  async getPublicBusiness(slug: string, lang?: SupportedLanguage): Promise<{
    business: Business;
    rotatedKeywords: string[];
  }> {
    const query = lang ? `?lang=${lang}` : '';
    const res = await fetch(`/api/public/business/${encodeURIComponent(slug)}${query}`);
    if (!res.ok) throw new Error('Business not found or inactive');
    return res.json();
  },

  async rotateKeywords(businessId: string, lang: SupportedLanguage, count: number = 5): Promise<string[]> {
    const res = await fetch(
      `/api/public/rotate-keywords?businessId=${encodeURIComponent(businessId)}&lang=${lang}&count=${count}`
    );
    if (!res.ok) throw new Error('Failed to rotate keywords');
    const data = await res.json();
    return data.keywords;
  },

  async submitPrivateFeedback(data: {
    businessId: string;
    rating: number;
    message: string;
    customerName?: string;
    customerPhone?: string;
  }): Promise<PrivateFeedback> {
    const res = await fetch('/api/public/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit feedback');
    }
    const json = await res.json();
    return json.feedback;
  },

  async generateAiDrafts(params: {
    businessName: string;
    businessCategory: string;
    rating: number;
    keywords: string[];
    userExperience?: string;
    language: SupportedLanguage;
    businessId?: string;
  }): Promise<{ drafts: ReviewDraft[]; isAiGenerated: boolean; message?: string }> {
    const res = await fetch('/api/ai/generate-drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate review drafts');
    }
    return res.json();
  },

  async trackAnalytics(
    businessId: string,
    eventType: 'page_view' | 'qr_visit' | 'rating_select' | 'keyword_select' | 'ai_generate' | 'google_review_click' | 'private_feedback',
    meta?: Record<string, any>
  ) {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, eventType, meta }),
      });
    } catch {
      // silent background analytics
    }
  },

  async getBusinessAnalytics(businessId: string) {
    const res = await fetch(`/api/analytics/business/${encodeURIComponent(businessId)}`);
    if (!res.ok) throw new Error('Failed to load business analytics');
    return res.json();
  },

  async getGlobalAnalytics() {
    const res = await fetch('/api/analytics/global');
    if (!res.ok) throw new Error('Failed to load global metrics');
    return res.json();
  },

  async login(email: string, password?: string): Promise<{ success: boolean; user: CustomerAccount; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  async createBusiness(data: Partial<Business>): Promise<Business> {
    const res = await fetch('/api/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create business');
    }
    return res.json();
  },

  async updateBusiness(id: string, updates: Partial<Business>): Promise<Business> {
    const res = await fetch(`/api/businesses/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update business');
    }
    return res.json();
  },

  async deleteBusiness(id: string): Promise<boolean> {
    const res = await fetch(`/api/businesses/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  },

  async createCustomer(data: {
    email: string;
    name: string;
    phone?: string;
    maxBusinesses?: number;
    isLifetime?: boolean;
    expiryDate?: string;
  }): Promise<CustomerAccount> {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create customer');
    }
    return res.json();
  },

  async inviteCustomer(data: {
    email: string;
    fullName: string;
    phone?: string;
    businessLimit?: number;
    expiryDate?: string | null;
    password?: string;
  }): Promise<{
    success: boolean;
    message: string;
    user: CustomerAccount;
    credentials: {
      email: string;
      fullName: string;
      temporaryPassword: string;
      maxBusinesses: number;
      expiryDate: string;
    };
  }> {
    const res = await fetch('/api/admin/invite-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create customer');
    }
    return res.json();
  },

  async updateCustomer(id: string, updates: Partial<CustomerAccount>): Promise<CustomerAccount> {
    const res = await fetch(`/api/customers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update customer');
    }
    return res.json();
  },

  async impersonate(customerId: string, adminEmail: string): Promise<CustomerAccount> {
    const res = await fetch('/api/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, adminEmail }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to impersonate customer');
    }
    const data = await res.json();
    return data.customer;
  },

  async createCategory(name: string, description?: string, icon?: string): Promise<BusinessCategory> {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, icon }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create category');
    }
    return res.json();
  },

  async deleteCategory(id: string): Promise<boolean> {
    const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  },

  async addMasterKeyword(data: {
    keyword?: string;
    category: string;
    language?: SupportedLanguage;
    priority?: number;
    bulkKeywords?: string;
  }) {
    const res = await fetch('/api/keywords/master', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to add master keyword(s)');
    }
    return res.json();
  },

  async toggleMasterKeyword(id: string, isActive: boolean): Promise<MasterKeyword> {
    const res = await fetch(`/api/keywords/master/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
    return res.json();
  },

  async deleteMasterKeyword(id: string): Promise<boolean> {
    const res = await fetch(`/api/keywords/master/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  },

  async getBusinessKeywords(businessId: string): Promise<BusinessKeyword[]> {
    const res = await fetch(`/api/keywords/business/${encodeURIComponent(businessId)}`);
    if (!res.ok) return [];
    return res.json();
  },

  async addBusinessKeyword(businessId: string, keyword: string, language: SupportedLanguage): Promise<BusinessKeyword> {
    const res = await fetch('/api/keywords/business', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, keyword, language }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to add custom keyword');
    }
    return res.json();
  },

  async toggleBusinessKeyword(id: string, isDisabled: boolean): Promise<BusinessKeyword> {
    const res = await fetch(`/api/keywords/business/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDisabled }),
    });
    return res.json();
  },

  async deleteBusinessKeyword(id: string): Promise<boolean> {
    const res = await fetch(`/api/keywords/business/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  },

  async updateFeedback(id: string, updates: Partial<PrivateFeedback>): Promise<PrivateFeedback> {
    const res = await fetch(`/api/feedback/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  async createAnnouncement(title: string, message: string, type: 'info' | 'warning' | 'success') {
    const res = await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message, type }),
    });
    return res.json();
  },

  async deleteAnnouncement(id: string) {
    const res = await fetch(`/api/announcements/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  },

  async getQrSettings(businessId: string): Promise<QRSettings> {
    const res = await fetch(`/api/qr-settings/${encodeURIComponent(businessId)}`);
    return res.json();
  },

  async updateQrSettings(businessId: string, settings: Partial<QRSettings>): Promise<QRSettings> {
    const res = await fetch(`/api/qr-settings/${encodeURIComponent(businessId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },
};
