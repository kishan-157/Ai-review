'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import {
  Building2,
  Plus,
  QrCode,
  Link,
  ExternalLink,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Download,
  Share2,
  Star,
} from 'lucide-react';
import { generateQrPngDataUrl, downloadDataUrl } from '../../src/services/qr';

interface BusinessItem {
  id: string;
  customer_id: string;
  name: string;
  slug: string;
  category: string;
  tagline?: string;
  description?: string;
  google_review_url: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
}

export default function CustomerDashboardPage() {
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [editingBiz, setEditingBiz] = useState<BusinessItem | null>(null);
  const [bizName, setBizName] = useState('');
  const [bizCategory, setBizCategory] = useState('Restaurant');
  const [bizTagline, setBizTagline] = useState('');
  const [bizGoogleUrl, setBizGoogleUrl] = useState('');
  const [bizPhone, setBizPhone] = useState('');
  const [bizWhatsapp, setBizWhatsapp] = useState('');
  const [bizWebsite, setBizWebsite] = useState('');
  const [bizLogoUrl, setBizLogoUrl] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // QR Modal
  const [qrModalBiz, setQrModalBiz] = useState<BusinessItem | null>(null);
  const [qrPngUrl, setQrPngUrl] = useState<string | null>(null);

  const supabase = createClient();

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    loadMyBusinesses();
  }, []);

  const loadMyBusinesses = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      setCurrentUserId(user.id);

      // Check cookie for impersonated customer id
      const cookies = document.cookie.split('; ');
      const impCookie = cookies.find((c) => c.startsWith('impersonate_customer_id='));
      const targetCustomerId = impCookie ? impCookie.split('=')[1] : user.id;

      // Fetch ONLY tenant's businesses. RLS policy also enforces customer_id = auth.uid()
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('customer_id', targetCustomerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (err: any) {
      console.error('Failed to load businesses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingBiz(null);
    setBizName('');
    setBizCategory('Restaurant');
    setBizTagline('');
    setBizGoogleUrl('');
    setBizPhone('');
    setBizWhatsapp('');
    setBizWebsite('');
    setBizLogoUrl('');
    setShowModal(true);
  };

  const handleOpenEdit = (biz: BusinessItem) => {
    setEditingBiz(biz);
    setBizName(biz.name);
    setBizCategory(biz.category);
    setBizTagline(biz.tagline || '');
    setBizGoogleUrl(biz.google_review_url);
    setBizPhone(biz.phone || '');
    setBizWhatsapp(biz.whatsapp || '');
    setBizWebsite(biz.website || '');
    setBizLogoUrl(biz.logo_url || '');
    setShowModal(true);
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim() || !bizGoogleUrl.trim()) return;

    setFormSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const cookies = document.cookie.split('; ');
      const impCookie = cookies.find((c) => c.startsWith('impersonate_customer_id='));
      const ownerId = impCookie ? impCookie.split('=')[1] : user.id;

      if (editingBiz) {
        // Update existing business
        const { error } = await supabase
          .from('businesses')
          .update({
            name: bizName.trim(),
            category: bizCategory,
            tagline: bizTagline.trim() || null,
            google_review_url: bizGoogleUrl.trim(),
            phone: bizPhone.trim() || null,
            whatsapp: bizWhatsapp.trim() || null,
            website: bizWebsite.trim() || null,
            logo_url: bizLogoUrl.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingBiz.id);

        if (error) throw error;
        showNotification('Business updated successfully!');
      } else {
        // Create new business with slug
        const slug = bizName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        const { error } = await supabase.from('businesses').insert({
          customer_id: ownerId,
          name: bizName.trim(),
          slug: `${slug}-${Math.floor(1000 + Math.random() * 9000)}`,
          category: bizCategory,
          tagline: bizTagline.trim() || null,
          google_review_url: bizGoogleUrl.trim(),
          phone: bizPhone.trim() || null,
          whatsapp: bizWhatsapp.trim() || null,
          website: bizWebsite.trim() || null,
          logo_url: bizLogoUrl.trim() || null,
          is_active: true,
        });

        if (error) throw error;
        showNotification('New business created successfully!');
      }

      setShowModal(false);
      loadMyBusinesses();
    } catch (err: any) {
      alert(err.message || 'Failed to save business');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteBusiness = async (bizId: string) => {
    if (!confirm('Are you sure you want to delete this business?')) return;
    try {
      const { error } = await supabase.from('businesses').delete().eq('id', bizId);
      if (error) throw error;
      setBusinesses((prev) => prev.filter((b) => b.id !== bizId));
      showNotification('Business removed.');
    } catch (err: any) {
      alert(err.message || 'Error deleting business');
    }
  };

  const handleOpenQr = async (biz: BusinessItem) => {
    setQrModalBiz(biz);
    const publicUrl = `${window.location.origin}/#b/${biz.slug}`;
    const png = await generateQrPngDataUrl({ text: publicUrl, fgColor: '#1e1b4b', width: 360 });
    setQrPngUrl(png);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-purple-600 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header with Purple Gradient Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-purple-200 font-bold">
            Tenant Management
          </span>
          <h2 className="text-2xl font-black mt-1">My Managed Businesses</h2>
          <p className="text-xs sm:text-sm text-purple-100 max-w-lg mt-1">
            Configure Google review links, customize brand colors, and generate scannable QR standees.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-5 py-2.5 rounded-xl bg-white text-purple-900 font-bold text-xs shadow-md hover:bg-purple-50 transition cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Business</span>
        </button>
      </div>

      {/* Businesses Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Active Locations & Review Pages ({businesses.length})
        </h3>

        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-xs text-slate-400">Loading your businesses securely from Supabase...</p>
          </div>
        ) : businesses.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-800 text-sm">No businesses added yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your first business location to get your branded public review link and custom QR code.
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold"
            >
              Add Your Business
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {businesses.map((biz) => (
              <div
                key={biz.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 flex flex-col justify-between hover:border-purple-300 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md">
                      {biz.category}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>

                  <h4 className="font-bold text-base text-slate-900">{biz.name}</h4>
                  {biz.tagline && (
                    <p className="text-xs text-slate-500 line-clamp-1">{biz.tagline}</p>
                  )}

                  <div className="text-[11px] font-mono text-purple-700 bg-purple-50/50 p-2 rounded-lg truncate flex items-center justify-between">
                    <span className="truncate">/{biz.slug}</span>
                    <a
                      href={`/#b/${biz.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 text-purple-600 hover:text-purple-800 shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleOpenQr(biz)}
                    className="font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Get QR Code</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(biz)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                      title="Edit Business"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBusiness(biz.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                      title="Delete Business"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Business Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingBiz ? 'Edit Business Details' : 'Add New Business'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveBusiness} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  placeholder="e.g. Apex Performance Gym"
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Category *</label>
                <select
                  value={bizCategory}
                  onChange={(e) => setBizCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                >
                  <option value="Restaurant">Restaurant</option>
                  <option value="Cafe">Cafe</option>
                  <option value="Hotel">Hotel</option>
                  <option value="Salon">Salon</option>
                  <option value="Beauty Parlour">Beauty Parlour</option>
                  <option value="Clothing Store">Clothing Store</option>
                  <option value="Retail Shop">Retail Shop</option>
                  <option value="Gym and Fitness">Gym and Fitness</option>
                  <option value="Clinic">Clinic</option>
                  <option value="Dentist">Dentist</option>
                  <option value="Automobile Dealer">Automobile Dealer</option>
                  <option value="Car Repair">Car Repair</option>
                  <option value="Professional Services">Professional Services</option>
                  <option value="Other / Custom Business">Other / Custom Business</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Google Review URL *</label>
                <input
                  type="url"
                  required
                  value={bizGoogleUrl}
                  onChange={(e) => setBizGoogleUrl(e.target.value)}
                  placeholder="https://search.google.com/local/writereview?placeid=... or https://g.page/r/..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Tagline</label>
                <input
                  type="text"
                  value={bizTagline}
                  onChange={(e) => setBizTagline(e.target.value)}
                  placeholder="e.g. Premium Strength & Conditioning"
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Phone</label>
                  <input
                    type="tel"
                    value={bizPhone}
                    onChange={(e) => setBizPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    value={bizWhatsapp}
                    onChange={(e) => setBizWhatsapp(e.target.value)}
                    placeholder="+1 or +91..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Website URL</label>
                  <input
                    type="url"
                    value={bizWebsite}
                    onChange={(e) => setBizWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Logo Image URL</label>
                  <input
                    type="url"
                    value={bizLogoUrl}
                    onChange={(e) => setBizLogoUrl(e.target.value)}
                    placeholder="https://.../logo.png"
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition cursor-pointer"
                >
                  {formSubmitting
                    ? 'Saving to Database...'
                    : editingBiz
                    ? 'Save Changes'
                    : 'Create Business'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Preview Modal */}
      {qrModalBiz && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <h3 className="font-bold text-base text-slate-900">{qrModalBiz.name}</h3>
            <p className="text-xs text-slate-500">
              Scannable QR code linking to your high-converting review page.
            </p>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
              {qrPngUrl ? (
                <img src={qrPngUrl} alt="QR Code" className="w-48 h-48 mx-auto rounded-lg" />
              ) : (
                <div className="w-48 h-48 bg-slate-200 animate-pulse rounded-lg" />
              )}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => qrPngUrl && downloadDataUrl(qrPngUrl, `${qrModalBiz.slug}-qr.png`)}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-4 h-4" />
                <span>Download PNG</span>
              </button>
              <button
                type="button"
                onClick={() => setQrModalBiz(null)}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
