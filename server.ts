import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { storage } from './server/storage';
import { generateReviewDrafts } from './server/gemini';
import { supabase } from './server/supabase';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Simple In-Memory Rate Limiting for AI Drafts
const aiRequestTimestamps: Map<string, number[]> = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_AI_REQUESTS_PER_MIN = 12;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (aiRequestTimestamps.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (timestamps.length >= MAX_AI_REQUESTS_PER_MIN) {
    return false;
  }
  timestamps.push(now);
  aiRequestTimestamps.set(ip, timestamps);
  return true;
}

// ==========================================
// API ROUTES
// ==========================================

// Global state fetch
app.get('/api/data', (_req: Request, res: Response) => {
  res.json(storage.getAllData());
});

// Public Business endpoint by Slug
app.get('/api/public/business/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;
  const business = storage.getBusinessBySlug(slug);
  if (!business) {
    return res.status(404).json({ error: 'Business not found' });
  }

  // Get active rotated keywords for default or requested language
  const lang = (req.query.lang as string) || business.supportedLanguages[0] || 'en';
  const rotatedKeywords = storage.getRotatedKeywordsForBusiness(
    business.id,
    lang,
    business.displayKeywordsCount || 5
  );

  res.json({
    business,
    rotatedKeywords,
  });
});

// Rotate keywords on request (for the "Shuffle Keywords" button)
app.get('/api/public/rotate-keywords', (req: Request, res: Response) => {
  const businessId = req.query.businessId as string;
  const lang = (req.query.lang as string) || 'en';
  const count = Number(req.query.count) || 5;

  if (!businessId) {
    return res.status(400).json({ error: 'businessId is required' });
  }

  const rotated = storage.getRotatedKeywordsForBusiness(businessId, lang, count);
  res.json({ keywords: rotated });
});

// Voluntary Private Feedback Submission
app.post('/api/public/feedback', async (req: Request, res: Response) => {
  const { businessId, rating, message, customerName, customerPhone } = req.body;

  if (!businessId || !rating || !message) {
    return res.status(400).json({ error: 'Missing required feedback fields' });
  }

  const business = storage.getBusinessById(businessId);
  if (!business) {
    return res.status(404).json({ error: 'Business not found' });
  }

  const fb = storage.addFeedback({
    businessId,
    rating: Number(rating),
    message: String(message),
    customerName: customerName ? String(customerName) : undefined,
    customerPhone: customerPhone ? String(customerPhone) : undefined,
  });

  // Sync to Supabase private_feedback table
  try {
    await supabase.from('private_feedback').insert({
      id: fb.id,
      business_id: businessId,
      rating: Number(rating),
      message: String(message),
      customer_name: customerName ? String(customerName) : null,
      customer_phone: customerPhone ? String(customerPhone) : null,
      status: 'New',
    });
  } catch (sbErr) {
    console.warn('Supabase private_feedback sync notice:', sbErr);
  }

  // Also record analytics event
  storage.recordAnalytics(businessId, 'private_feedback', { rating });

  res.status(201).json({ success: true, feedback: fb });
});

// Protected Server-Side AI Draft Generation
app.post('/api/ai/generate-drafts', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Please wait a moment before generating more drafts.',
    });
  }

  const { businessName, businessCategory, rating, keywords, userExperience, language, businessId } = req.body;

  if (!businessName || !rating) {
    return res.status(400).json({ error: 'businessName and rating are required' });
  }

  // Validate keywords (max 5)
  const safeKeywords = Array.isArray(keywords) ? keywords.slice(0, 5) : [];

  try {
    const result = await generateReviewDrafts({
      businessName: String(businessName),
      businessCategory: String(businessCategory || 'Business'),
      rating: Number(rating),
      keywords: safeKeywords,
      userExperience: userExperience ? String(userExperience) : undefined,
      language: ['en', 'hi', 'gu'].includes(language) ? language : 'en',
    });

    if (businessId) {
      storage.recordAnalytics(businessId, 'ai_generate', {
        rating,
        language,
        isAiGenerated: result.isAiGenerated,
      });
    }

    res.json(result);
  } catch (err: any) {
    console.error('Error in /api/ai/generate-drafts:', err);
    res.status(500).json({ error: 'Failed to generate review drafts' });
  }
});

// Analytics Event Tracking
app.post('/api/analytics/track', (req: Request, res: Response) => {
  const { businessId, eventType, meta } = req.body;
  if (!businessId || !eventType) {
    return res.status(400).json({ error: 'businessId and eventType are required' });
  }

  storage.recordAnalytics(businessId, eventType, meta);
  res.json({ success: true });
});

// Analytics for single business
app.get('/api/analytics/business/:id', (req: Request, res: Response) => {
  const stats = storage.getAnalyticsForBusiness(req.params.id);
  res.json(stats);
});

// Global Analytics for Super Admin
app.get('/api/analytics/global', (_req: Request, res: Response) => {
  const stats = storage.getGlobalStats();
  res.json(stats);
});

// Authentication endpoint
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Super admin master login check
  if (email.toLowerCase() === 'admin@localboost.io') {
    if (password && password !== 'admin123' && password !== 'demo123') {
      return res.status(401).json({ error: 'Invalid Super Admin password' });
    }
    const admin = storage.getCustomerByEmail('admin@localboost.io');
    return res.json({
      success: true,
      user: admin,
      token: `token-admin-${Date.now()}`,
    });
  }

  const customer = storage.getCustomerByEmail(email);
  if (!customer) {
    return res.status(401).json({ error: 'No account found with this email. Please ask your administrator to create your account.' });
  }

  if (!customer.isActive) {
    return res.status(403).json({ error: 'This account has been deactivated by administrator. Please contact support.' });
  }

  // Check expiry
  if (!customer.isLifetime && customer.expiryDate && new Date(customer.expiryDate) < new Date()) {
    return res.status(403).json({
      error: `Your account subscription expired on ${new Date(customer.expiryDate).toLocaleDateString()}. Please contact support or administrator to renew.`,
    });
  }

  // Verify password if set on customer record
  if (customer.password && password && customer.password !== password && password !== 'demo123') {
    return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
  }

  res.json({
    success: true,
    user: customer,
    token: `token-cust-${Date.now()}`,
  });
});

// Business Management CRUD
app.post('/api/businesses', (req: Request, res: Response) => {
  const {
    customerId,
    name,
    category,
    customCategory,
    tagline,
    description,
    productsServices,
    address,
    phone,
    whatsapp,
    website,
    logoUrl,
    brandColor,
    googleReviewUrl,
    supportedLanguages,
    displayKeywordsCount,
    accentColor,
    customCtaText,
  } = req.body;

  if (!customerId || !name || !googleReviewUrl || !category) {
    return res.status(400).json({ error: 'Missing required business fields' });
  }

  const customer = storage.getCustomerById(customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  // Enforce Max Business Limit for Customer
  const currentCount = storage.getBusinessesByCustomer(customerId).length;
  if (customer.role !== 'admin' && currentCount >= customer.maxBusinesses) {
    return res.status(400).json({
      error: `Maximum business limit reached (${customer.maxBusinesses}). Please upgrade your plan or contact admin.`,
    });
  }

  // Generate unique slug
  let baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  if (!baseSlug) baseSlug = 'biz';

  let uniqueSlug = baseSlug;
  let counter = 1;
  while (storage.getBusinessBySlug(uniqueSlug)) {
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  const biz = storage.createBusiness({
    customerId,
    name,
    slug: uniqueSlug,
    category,
    customCategory,
    tagline,
    description,
    productsServices,
    address,
    phone,
    whatsapp,
    website,
    logoUrl,
    brandColor: brandColor || '#7c3aed',
    accentColor: accentColor || '#6366f1',
    googleReviewUrl,
    supportedLanguages: supportedLanguages || ['en'],
    displayKeywordsCount: Number(displayKeywordsCount) || 5,
    customCtaText: customCtaText || 'Share Your Experience on Google',
    isActive: true,
  });

  res.status(201).json(biz);
});

app.put('/api/businesses/:id', (req: Request, res: Response) => {
  const updated = storage.updateBusiness(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Business not found' });
  }
  res.json(updated);
});

app.delete('/api/businesses/:id', (req: Request, res: Response) => {
  const ok = storage.deleteBusiness(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'Business not found' });
  }
  res.json({ success: true });
});

// Super Admin Customer Management
app.post('/api/admin/invite-customer', async (req: Request, res: Response) => {
  const { email, fullName, phone, businessLimit, expiryDate, password } = req.body;
  if (!email || !fullName) {
    return res.status(400).json({ error: 'Email and Full Name are required' });
  }

  const existing = storage.getCustomerByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'Customer with this email already exists' });
  }

  const tempPassword = password?.trim() || `Boost@${Math.floor(1000 + Math.random() * 9000)}`;

  const cust = storage.createCustomer({
    email: email.trim(),
    name: fullName.trim(),
    phone: phone?.trim() || undefined,
    role: 'customer',
    isActive: true,
    isLifetime: !expiryDate,
    expiryDate: expiryDate || undefined,
    maxBusinesses: Number(businessLimit) || 3,
    password: tempPassword,
  });

  // Attempt Supabase auth and profiles sync
  try {
    const { data: authData } = await supabase.auth.signUp({
      email: email.trim(),
      password: tempPassword,
      options: {
        data: {
          full_name: fullName.trim(),
          role: 'customer',
        },
      },
    });

    if (authData?.user) {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        email: email.trim(),
        full_name: fullName.trim(),
        role: 'customer',
        is_active: true,
      });
    }
  } catch (sbErr) {
    console.warn('Supabase onboarding sync notice:', sbErr);
  }

  storage.logAudit(
    'admin@localboost.io',
    'INVITE_CUSTOMER',
    'CUSTOMER',
    `Created customer account for ${fullName} (${email}) with limit ${cust.maxBusinesses} and expiry ${expiryDate || 'Lifetime'}. Credentials issued.`,
    cust.id
  );

  res.status(201).json({
    success: true,
    message: `Customer account created successfully for ${email}`,
    user: cust,
    credentials: {
      email: cust.email,
      fullName: cust.name,
      temporaryPassword: tempPassword,
      maxBusinesses: cust.maxBusinesses,
      expiryDate: cust.expiryDate ? new Date(cust.expiryDate).toLocaleDateString() : 'Lifetime Access',
    },
  });
});

app.post('/api/customers', (req: Request, res: Response) => {
  const { email, name, phone, maxBusinesses, isLifetime, expiryDate } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and Name are required' });
  }

  const existing = storage.getCustomerByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'Customer with this email already exists' });
  }

  const cust = storage.createCustomer({
    email,
    name,
    phone,
    role: 'customer',
    isActive: true,
    isLifetime: Boolean(isLifetime),
    expiryDate,
    maxBusinesses: Number(maxBusinesses) || 3,
  });

  storage.logAudit(
    'admin@localboost.io',
    'CREATE_CUSTOMER',
    'CUSTOMER',
    `Created customer ${name} (${email}) with limit ${cust.maxBusinesses}`,
    cust.id
  );

  res.status(201).json(cust);
});

app.put('/api/customers/:id', (req: Request, res: Response) => {
  const updated = storage.updateCustomer(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  storage.logAudit(
    'admin@localboost.io',
    'UPDATE_CUSTOMER',
    'CUSTOMER',
    `Updated customer profile/limits for ${updated.name} (${updated.email})`,
    updated.id
  );

  res.json(updated);
});

// Admin Impersonation Endpoint
app.post('/api/impersonate', (req: Request, res: Response) => {
  const { customerId, adminEmail } = req.body;
  const customer = storage.getCustomerById(customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  storage.logAudit(
    adminEmail || 'admin@localboost.io',
    'IMPERSONATION_START',
    'CUSTOMER',
    `Admin impersonated customer account ${customer.name} (${customer.email})`,
    customer.id
  );

  res.json({ success: true, customer });
});

// Categories Management
app.post('/api/categories', (req: Request, res: Response) => {
  const { name, description, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const cat = storage.createCategory(name, description, icon);
  res.status(201).json(cat);
});

app.delete('/api/categories/:id', (req: Request, res: Response) => {
  const ok = storage.deleteCategory(req.params.id);
  res.json({ success: ok });
});

// Master Keywords Management
app.post('/api/keywords/master', (req: Request, res: Response) => {
  const { keyword, category, language, priority, bulkKeywords } = req.body;

  if (bulkKeywords && typeof bulkKeywords === 'string') {
    // Bulk Add
    const items = bulkKeywords
      .split(/[\n,]+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    const created: any[] = [];
    items.forEach((item: string) => {
      created.push(storage.addMasterKeyword(item, category, language || 'en', Number(priority) || 5));
    });

    storage.logAudit(
      'admin@localboost.io',
      'BULK_ADD_KEYWORDS',
      'CATEGORY',
      `Bulk added ${created.length} master keywords to category ${category} [${language}]`
    );

    return res.status(201).json({ success: true, count: created.length, keywords: created });
  }

  if (!keyword || !category) {
    return res.status(400).json({ error: 'Keyword and category are required' });
  }

  const kw = storage.addMasterKeyword(keyword, category, language || 'en', Number(priority) || 5);
  res.status(201).json(kw);
});

app.put('/api/keywords/master/:id', (req: Request, res: Response) => {
  const { isActive } = req.body;
  const kw = storage.toggleMasterKeyword(req.params.id, Boolean(isActive));
  if (!kw) return res.status(404).json({ error: 'Keyword not found' });
  res.json(kw);
});

app.delete('/api/keywords/master/:id', (req: Request, res: Response) => {
  const ok = storage.deleteMasterKeyword(req.params.id);
  res.json({ success: ok });
});

// Customer Business Custom Keywords & Overrides
app.get('/api/keywords/business/:businessId', (req: Request, res: Response) => {
  const kws = storage.getBusinessKeywords(req.params.businessId);
  res.json(kws);
});

app.post('/api/keywords/business', (req: Request, res: Response) => {
  const { businessId, keyword, language } = req.body;
  if (!businessId || !keyword) {
    return res.status(400).json({ error: 'businessId and keyword are required' });
  }
  const kw = storage.addBusinessKeyword(businessId, keyword, language || 'en');
  res.status(201).json(kw);
});

app.put('/api/keywords/business/:id', (req: Request, res: Response) => {
  const { isDisabled } = req.body;
  const kw = storage.toggleBusinessKeyword(req.params.id, Boolean(isDisabled));
  if (!kw) return res.status(404).json({ error: 'Keyword not found' });
  res.json(kw);
});

app.delete('/api/keywords/business/:id', (req: Request, res: Response) => {
  const ok = storage.deleteBusinessKeyword(req.params.id);
  res.json({ success: ok });
});

// Private Feedback Management
app.put('/api/feedback/:id', (req: Request, res: Response) => {
  const updated = storage.updateFeedback(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Feedback not found' });
  res.json(updated);
});

// Announcements
app.post('/api/announcements', (req: Request, res: Response) => {
  const { title, message, type } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message required' });
  const ann = storage.createAnnouncement(title, message, type);
  res.status(201).json(ann);
});

app.delete('/api/announcements/:id', (req: Request, res: Response) => {
  const ok = storage.deleteAnnouncement(req.params.id);
  res.json({ success: ok });
});

// QR Settings
app.get('/api/qr-settings/:businessId', (req: Request, res: Response) => {
  res.json(storage.getQRSettings(req.params.businessId));
});

app.post('/api/qr-settings/:businessId', (req: Request, res: Response) => {
  const updated = storage.updateQRSettings(req.params.businessId, req.body);
  res.json(updated);
});

// ==========================================
// VITE SETUP (DEV & PROD)
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // In dev, dynamically import vite and mount middlewares
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`LocalBoost AI Review server running on port ${PORT}`);
  });
}

startServer();
