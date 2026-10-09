import fs from 'fs';
import path from 'path';
import {
  Business,
  BusinessCategory,
  MasterKeyword,
  CustomerAccount,
  PrivateFeedback,
  Announcement,
  AuditLog,
  AnalyticsEvent,
  BusinessKeyword,
  QRSettings,
} from '../src/types';
import {
  INITIAL_CATEGORIES,
  INITIAL_CUSTOMERS,
  INITIAL_BUSINESSES,
  INITIAL_MASTER_KEYWORDS,
  INITIAL_FEEDBACK,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_AUDIT_LOGS,
} from '../src/data/seedData';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  categories: BusinessCategory[];
  customers: CustomerAccount[];
  businesses: Business[];
  masterKeywords: MasterKeyword[];
  businessKeywords: BusinessKeyword[];
  feedback: PrivateFeedback[];
  announcements: Announcement[];
  auditLogs: AuditLog[];
  analyticsEvents: AnalyticsEvent[];
  qrSettings: Record<string, QRSettings>;
}

class StorageManager {
  private db: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.db = JSON.parse(raw);
      } catch (err) {
        console.error('Failed to read db.json, re-initializing with seed data', err);
        this.db = this.getDefaultSchema();
        this.persist();
      }
    } else {
      this.db = this.getDefaultSchema();
      this.persist();
    }
  }

  private getDefaultSchema(): DatabaseSchema {
    return {
      categories: [...INITIAL_CATEGORIES],
      customers: [...INITIAL_CUSTOMERS],
      businesses: [...INITIAL_BUSINESSES],
      masterKeywords: [...INITIAL_MASTER_KEYWORDS],
      businessKeywords: [],
      feedback: [...INITIAL_FEEDBACK],
      announcements: [...INITIAL_ANNOUNCEMENTS],
      auditLogs: [...INITIAL_AUDIT_LOGS],
      analyticsEvents: [
        {
          id: 'ev-1',
          businessId: 'biz-1',
          eventType: 'page_view',
          timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: 'ev-2',
          businessId: 'biz-1',
          eventType: 'rating_select',
          meta: { rating: 5 },
          timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: 'ev-3',
          businessId: 'biz-1',
          eventType: 'google_review_click',
          timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        },
        {
          id: 'ev-4',
          businessId: 'biz-2',
          eventType: 'page_view',
          timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        },
        {
          id: 'ev-5',
          businessId: 'biz-2',
          eventType: 'ai_generate',
          meta: { language: 'en' },
          timestamp: new Date().toISOString(),
        },
      ],
      qrSettings: {
        'biz-1': {
          businessId: 'biz-1',
          fgColor: '#4338ca',
          bgColor: '#ffffff',
          style: 'modern-card',
          showLogo: true,
          customCta: 'Review us on Google for 10% off your next dining experience!',
        },
        'biz-2': {
          businessId: 'biz-2',
          fgColor: '#1e1b4b',
          bgColor: '#ffffff',
          style: 'table-standee',
          showLogo: true,
          customCta: 'Scan to review your training session!',
        },
      },
    };
  }

  private persist() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write db.json', err);
    }
  }

  // --- BUSINESSES ---
  public getBusinesses(): Business[] {
    return this.db.businesses;
  }

  public getBusinessBySlug(slug: string): Business | undefined {
    return this.db.businesses.find((b) => b.slug.toLowerCase() === slug.toLowerCase() && b.isActive);
  }

  public getBusinessById(id: string): Business | undefined {
    return this.db.businesses.find((b) => b.id === id);
  }

  public getBusinessesByCustomer(customerId: string): Business[] {
    return this.db.businesses.filter((b) => b.customerId === customerId);
  }

  public createBusiness(data: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>): Business {
    const newBiz: Business = {
      ...data,
      id: `biz-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.businesses.unshift(newBiz);
    this.persist();
    return newBiz;
  }

  public updateBusiness(id: string, updates: Partial<Business>): Business | null {
    const idx = this.db.businesses.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    this.db.businesses[idx] = {
      ...this.db.businesses[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.db.businesses[idx];
  }

  public deleteBusiness(id: string): boolean {
    const initialLen = this.db.businesses.length;
    this.db.businesses = this.db.businesses.filter((b) => b.id !== id);
    const deleted = this.db.businesses.length !== initialLen;
    if (deleted) this.persist();
    return deleted;
  }

  // --- CATEGORIES ---
  public getCategories(): BusinessCategory[] {
    return this.db.categories;
  }

  public createCategory(name: string, description?: string, icon?: string): BusinessCategory {
    const existing = this.db.categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const newCat: BusinessCategory = {
      id: `cat-${Date.now()}`,
      name,
      description: description || 'Custom business classification',
      icon: icon || 'Briefcase',
      isCustom: true,
    };
    this.db.categories.push(newCat);
    this.persist();
    return newCat;
  }

  public deleteCategory(id: string): boolean {
    const initialLen = this.db.categories.length;
    this.db.categories = this.db.categories.filter((c) => c.id !== id);
    if (this.db.categories.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- KEYWORDS & ROTATION ---
  public getMasterKeywords(category?: string, language?: string): MasterKeyword[] {
    return this.db.masterKeywords.filter((k) => {
      if (category && k.category.toLowerCase() !== category.toLowerCase()) return false;
      if (language && k.language !== language) return false;
      return true;
    });
  }

  public addMasterKeyword(keyword: string, category: string, language: string = 'en', priority: number = 5): MasterKeyword {
    const existing = this.db.masterKeywords.find(
      (k) => k.category.toLowerCase() === category.toLowerCase() &&
             k.language === language &&
             k.keyword.toLowerCase() === keyword.toLowerCase()
    );
    if (existing) return existing;

    const newK: MasterKeyword = {
      id: `mk-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      category,
      language: language as any,
      keyword,
      priority,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.db.masterKeywords.push(newK);
    this.persist();
    return newK;
  }

  public toggleMasterKeyword(id: string, isActive: boolean): MasterKeyword | null {
    const kw = this.db.masterKeywords.find((k) => k.id === id);
    if (!kw) return null;
    kw.isActive = isActive;
    this.persist();
    return kw;
  }

  public deleteMasterKeyword(id: string): boolean {
    const len = this.db.masterKeywords.length;
    this.db.masterKeywords = this.db.masterKeywords.filter((k) => k.id !== id);
    if (this.db.masterKeywords.length !== len) {
      this.persist();
      return true;
    }
    return false;
  }

  // Customer custom keywords & overrides
  public getBusinessKeywords(businessId: string): BusinessKeyword[] {
    return this.db.businessKeywords.filter((k) => k.businessId === businessId);
  }

  public addBusinessKeyword(businessId: string, keyword: string, language: string = 'en'): BusinessKeyword {
    const existing = this.db.businessKeywords.find(
      (k) => k.businessId === businessId && k.language === language && k.keyword.toLowerCase() === keyword.toLowerCase()
    );
    if (existing) return existing;
    const newK: BusinessKeyword = {
      id: `bk-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      businessId,
      keyword,
      language: language as any,
      isCustom: true,
      isDisabled: false,
      createdAt: new Date().toISOString(),
    };
    this.db.businessKeywords.push(newK);
    this.persist();
    return newK;
  }

  public toggleBusinessKeyword(id: string, isDisabled: boolean): BusinessKeyword | null {
    const kw = this.db.businessKeywords.find((k) => k.id === id);
    if (!kw) return null;
    kw.isDisabled = isDisabled;
    this.persist();
    return kw;
  }

  public deleteBusinessKeyword(id: string): boolean {
    const len = this.db.businessKeywords.length;
    this.db.businessKeywords = this.db.businessKeywords.filter((k) => k.id !== id);
    if (this.db.businessKeywords.length !== len) {
      this.persist();
      return true;
    }
    return false;
  }

  // Pure Shuffled Keyword Rotation for a visitor session
  public getRotatedKeywordsForBusiness(businessId: string, language: string = 'en', count: number = 5): string[] {
    const biz = this.getBusinessById(businessId);
    if (!biz) return [];

    // 1. Get active master keywords for this category and language
    const masterPool = this.db.masterKeywords.filter(
      (k) => (k.category.toLowerCase() === biz.category.toLowerCase() || k.category === 'Other / Custom Business') &&
             k.language === language &&
             k.isActive
    );

    // 2. Get business custom keywords and overrides
    const bizOverrides = this.db.businessKeywords.filter((k) => k.businessId === businessId);
    const disabledSet = new Set(
      bizOverrides.filter((k) => k.isDisabled).map((k) => k.keyword.toLowerCase())
    );
    const customKws = bizOverrides.filter((k) => k.isCustom && !k.isDisabled && k.language === language);

    // 3. Pool active candidates
    const validMaster = masterPool
      .filter((k) => !disabledSet.has(k.keyword.toLowerCase()))
      .map((k) => k.keyword);

    const validCustom = customKws.map((k) => k.keyword);

    // Combined unique candidates
    const allCandidates = Array.from(new Set([...validCustom, ...validMaster]));
    if (allCandidates.length <= count) {
      return allCandidates;
    }

    // Fisher-Yates shuffle
    const shuffled = [...allCandidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  }

  // --- CUSTOMERS ---
  public getCustomers(): CustomerAccount[] {
    return this.db.customers;
  }

  public getCustomerById(id: string): CustomerAccount | undefined {
    return this.db.customers.find((c) => c.id === id);
  }

  public getCustomerByEmail(email: string): CustomerAccount | undefined {
    return this.db.customers.find((c) => c.email.toLowerCase() === email.toLowerCase());
  }

  public createCustomer(data: Omit<CustomerAccount, 'id' | 'createdAt' | 'updatedAt'>): CustomerAccount {
    const newCust: CustomerAccount = {
      ...data,
      id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.customers.push(newCust);
    this.persist();
    return newCust;
  }

  public updateCustomer(id: string, updates: Partial<CustomerAccount>): CustomerAccount | null {
    const idx = this.db.customers.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.db.customers[idx] = {
      ...this.db.customers[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.db.customers[idx];
  }

  // --- FEEDBACK ---
  public getFeedback(businessId?: string): PrivateFeedback[] {
    if (businessId) {
      return this.db.feedback.filter((f) => f.businessId === businessId);
    }
    return this.db.feedback;
  }

  public addFeedback(data: Omit<PrivateFeedback, 'id' | 'createdAt' | 'status'>): PrivateFeedback {
    const newFb: PrivateFeedback = {
      ...data,
      id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: 'New',
      createdAt: new Date().toISOString(),
    };
    this.db.feedback.unshift(newFb);
    this.persist();
    return newFb;
  }

  public updateFeedback(id: string, updates: Partial<PrivateFeedback>): PrivateFeedback | null {
    const idx = this.db.feedback.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    this.db.feedback[idx] = {
      ...this.db.feedback[idx],
      ...updates,
    };
    this.persist();
    return this.db.feedback[idx];
  }

  // --- ANALYTICS ---
  public recordAnalytics(businessId: string, eventType: AnalyticsEvent['eventType'], meta?: Record<string, any>) {
    const ev: AnalyticsEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      businessId,
      eventType,
      meta,
      timestamp: new Date().toISOString(),
    };
    this.db.analyticsEvents.push(ev);
    this.persist();
  }

  public getAnalyticsForBusiness(businessId: string) {
    const events = this.db.analyticsEvents.filter((e) => e.businessId === businessId);
    const pageViews = events.filter((e) => e.eventType === 'page_view').length;
    const qrVisits = events.filter((e) => e.eventType === 'qr_visit').length;
    const googleClicks = events.filter((e) => e.eventType === 'google_review_click').length;
    const aiGenerations = events.filter((e) => e.eventType === 'ai_generate').length;
    const privateFeedbacks = this.db.feedback.filter((f) => f.businessId === businessId).length;

    // rating distribution
    const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    events
      .filter((e) => e.eventType === 'rating_select' && e.meta?.rating)
      .forEach((e) => {
        const r = Number(e.meta?.rating);
        if (r >= 1 && r <= 5) ratingDist[r] = (ratingDist[r] || 0) + 1;
      });

    return {
      totalVisits: pageViews,
      qrVisits,
      googleReviewClicks: googleClicks,
      aiGenerations,
      privateFeedbacks,
      ratingDist,
      recentEvents: events.slice(-30).reverse(),
    };
  }

  // Global admin metrics
  public getGlobalStats() {
    const totalCustomers = this.db.customers.filter((c) => c.role !== 'admin').length;
    const activeCustomers = this.db.customers.filter(
      (c) => c.role !== 'admin' && c.isActive && (c.isLifetime || !c.expiryDate || new Date(c.expiryDate) > new Date())
    ).length;
    const expiredCustomers = totalCustomers - activeCustomers;
    const totalBusinesses = this.db.businesses.length;
    const totalVisits = this.db.analyticsEvents.filter((e) => e.eventType === 'page_view').length;
    const totalAIGen = this.db.analyticsEvents.filter((e) => e.eventType === 'ai_generate').length;
    const totalFeedback = this.db.feedback.length;
    const totalGoogleClicks = this.db.analyticsEvents.filter((e) => e.eventType === 'google_review_click').length;

    return {
      totalCustomers,
      activeCustomers,
      expiredCustomers,
      totalBusinesses,
      totalVisits,
      totalAIGen,
      totalFeedback,
      totalGoogleClicks,
    };
  }

  // --- ANNOUNCEMENTS ---
  public getAnnouncements(): Announcement[] {
    return this.db.announcements.filter((a) => a.isActive);
  }

  public createAnnouncement(title: string, message: string, type: 'info' | 'warning' | 'success' = 'info'): Announcement {
    const ann: Announcement = {
      id: `ann-${Date.now()}`,
      title,
      message,
      type,
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    this.db.announcements.unshift(ann);
    this.persist();
    return ann;
  }

  public deleteAnnouncement(id: string): boolean {
    const len = this.db.announcements.length;
    this.db.announcements = this.db.announcements.filter((a) => a.id !== id);
    if (this.db.announcements.length !== len) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- AUDIT LOGS ---
  public logAudit(adminEmail: string, action: string, targetType: string, details: string, targetId?: string) {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      adminId: 'admin',
      adminEmail,
      action,
      targetType,
      targetId,
      details,
      timestamp: new Date().toISOString(),
    };
    this.db.auditLogs.unshift(log);
    this.persist();
  }

  public getAuditLogs(): AuditLog[] {
    return this.db.auditLogs;
  }

  // --- QR SETTINGS ---
  public getQRSettings(businessId: string): QRSettings {
    if (!this.db.qrSettings[businessId]) {
      this.db.qrSettings[businessId] = {
        businessId,
        fgColor: '#1e1b4b',
        bgColor: '#ffffff',
        style: 'modern-card',
        showLogo: true,
        customCta: 'Scan to Review us on Google!',
      };
      this.persist();
    }
    return this.db.qrSettings[businessId];
  }

  public updateQRSettings(businessId: string, settings: Partial<QRSettings>): QRSettings {
    const current = this.getQRSettings(businessId);
    this.db.qrSettings[businessId] = {
      ...current,
      ...settings,
    };
    this.persist();
    return this.db.qrSettings[businessId];
  }

  // Export entire DB state for client state synchronization
  public getAllData() {
    return {
      categories: this.db.categories,
      customers: this.db.customers,
      businesses: this.db.businesses,
      masterKeywords: this.db.masterKeywords,
      businessKeywords: this.db.businessKeywords,
      feedback: this.db.feedback,
      announcements: this.db.announcements,
      auditLogs: this.db.auditLogs,
    };
  }
}

export const storage = new StorageManager();
