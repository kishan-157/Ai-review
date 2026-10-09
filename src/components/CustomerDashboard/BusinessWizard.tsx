import React, { useState } from 'react';
import {
  Check,
  Building2,
  Link,
  Languages,
  Sliders,
  QrCode,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Info,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Business, BusinessCategory, SupportedLanguage } from '../../types';
import { api } from '../../services/api';
import { generateQrPngDataUrl } from '../../services/qr';

interface BusinessWizardProps {
  categories: BusinessCategory[];
  customerId: string;
  onSuccess: (newBiz: Business) => void;
  onCancel: () => void;
  existingBusiness?: Business; // for editing
}

export const BusinessWizard: React.FC<BusinessWizardProps> = ({
  categories,
  customerId,
  onSuccess,
  onCancel,
  existingBusiness,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState<string>(existingBusiness?.name || '');
  const [category, setCategory] = useState<string>(
    existingBusiness?.category || categories[0]?.name || 'Restaurant'
  );
  const [customCategory, setCustomCategory] = useState<string>(
    existingBusiness?.customCategory || ''
  );
  const [tagline, setTagline] = useState<string>(existingBusiness?.tagline || '');
  const [description, setDescription] = useState<string>(existingBusiness?.description || '');
  const [productsServices, setProductsServices] = useState<string>(
    existingBusiness?.productsServices || ''
  );
  const [address, setAddress] = useState<string>(existingBusiness?.address || '');
  const [phone, setPhone] = useState<string>(existingBusiness?.phone || '');
  const [whatsapp, setWhatsapp] = useState<string>(existingBusiness?.whatsapp || '');
  const [website, setWebsite] = useState<string>(existingBusiness?.website || '');
  const [logoUrl, setLogoUrl] = useState<string>(existingBusiness?.logoUrl || '');
  const [brandColor, setBrandColor] = useState<string>(existingBusiness?.brandColor || '#7c3aed');

  // Step 2: Google Review Link
  const [googleReviewUrl, setGoogleReviewUrl] = useState<string>(
    existingBusiness?.googleReviewUrl || ''
  );
  const [urlWarning, setUrlWarning] = useState<string | null>(null);

  // Step 3: Languages
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguage[]>(
    existingBusiness?.supportedLanguages || ['en']
  );

  // Step 4: Appearance & Keywords
  const [displayKeywordsCount, setDisplayKeywordsCount] = useState<number>(
    existingBusiness?.displayKeywordsCount || 5
  );
  const [customCtaText, setCustomCtaText] = useState<string>(
    existingBusiness?.customCtaText || 'Open Google Review & Paste'
  );
  const [accentColor, setAccentColor] = useState<string>(
    existingBusiness?.accentColor || '#6366f1'
  );

  // Step 5: Created preview
  const [createdBusiness, setCreatedBusiness] = useState<Business | null>(null);
  const [previewQrUrl, setPreviewQrUrl] = useState<string | null>(null);

  const validateUrl = (url: string): boolean => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setUrlWarning('URL must begin with http:// or https://');
      return false;
    }
    if (!url.includes('google.com') && !url.includes('goo.gl') && !url.includes('g.page')) {
      setUrlWarning(
        'Note: This does not look like a standard Google Review URL. Verify that it opens your Google Business profile.'
      );
    } else {
      setUrlWarning(null);
    }
    return true;
  };

  const handleNext = () => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!name.trim()) {
        setErrorMsg('Please enter a business name');
        return;
      }
      if (!category) {
        setErrorMsg('Please select a business category');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!googleReviewUrl.trim()) {
        setErrorMsg('Please provide your Google Review link');
        return;
      }
      if (!validateUrl(googleReviewUrl.trim())) {
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (supportedLanguages.length === 0) {
        setErrorMsg('Please select at least one supported language');
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      handleSubmit();
    }
  };

  const toggleLanguage = (lang: SupportedLanguage) => {
    if (supportedLanguages.includes(lang)) {
      if (supportedLanguages.length === 1) return; // keep at least 1
      setSupportedLanguages(supportedLanguages.filter((l) => l !== lang));
    } else {
      setSupportedLanguages([...supportedLanguages, lang]);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      customerId,
      name: name.trim(),
      category,
      customCategory: customCategory.trim() || undefined,
      tagline: tagline.trim() || undefined,
      description: description.trim() || undefined,
      productsServices: productsServices.trim() || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      website: website.trim() || undefined,
      logoUrl: logoUrl.trim() || undefined,
      brandColor,
      googleReviewUrl: googleReviewUrl.trim(),
      supportedLanguages,
      displayKeywordsCount,
      customCtaText: customCtaText.trim() || undefined,
      accentColor,
    };

    try {
      let result: Business;
      if (existingBusiness) {
        result = await api.updateBusiness(existingBusiness.id, payload);
      } else {
        result = await api.createBusiness(payload);
      }

      setCreatedBusiness(result);
      const publicUrl = `${window.location.origin}/#b/${result.slug}`;
      const qrData = await generateQrPngDataUrl({ text: publicUrl, fgColor: '#1e1b4b' });
      setPreviewQrUrl(qrData);
      setCurrentStep(5);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save business');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Wizard Header */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <h2 className="text-xl font-bold">
              {existingBusiness ? 'Edit Business Profile' : 'New Business Setup Wizard'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-xs text-purple-200 hover:text-white px-3 py-1 bg-white/10 hover:bg-white/20 rounded-md transition cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-5 gap-2 max-w-xl">
          {[
            { num: 1, label: 'Details', icon: Building2 },
            { num: 2, label: 'Google Link', icon: Link },
            { num: 3, label: 'Languages', icon: Languages },
            { num: 4, label: 'Keywords & Style', icon: Sliders },
            { num: 5, label: 'QR & Launch', icon: QrCode },
          ].map((st) => (
            <div key={st.num} className="text-center">
              <div
                className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === st.num
                    ? 'bg-amber-400 text-slate-900 shadow-md ring-2 ring-white/50'
                    : currentStep > st.num
                    ? 'bg-emerald-400 text-slate-900'
                    : 'bg-white/20 text-white'
                }`}
              >
                {currentStep > st.num ? <Check className="w-3.5 h-3.5" /> : st.num}
              </div>
              <span className="text-[10px] sm:text-xs text-purple-200 font-medium block mt-1 truncate">
                {st.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="m-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Wizard Step Bodies */}
      <div className="p-6 sm:p-8">
        {/* STEP 1: Details */}
        {currentStep === 1 && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              <span>Step 1: Enter Universal Business Information</span>
            </h3>
            <p className="text-xs text-slate-500">
              Provide basic information about the business. Works for any category from clinics to salons, cafes, and retail stores.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Blue Harbor Dental or Royal Tandoor Bistro"
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Business Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Custom Category (optional)
                </label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g. Pet Grooming & Daycare"
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tagline / Catchphrase
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Precision Grooming & Premium Pet Spa"
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Products or Services Offered (comma separated)
                </label>
                <input
                  type="text"
                  value={productsServices}
                  onChange={(e) => setProductsServices(e.target.value)}
                  placeholder="e.g. Haircut, Beard Trim, Charcoal Facials, Head Massage"
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Physical Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 102 Sunset Boulevard, West End"
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Number</label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+91 or +1 number"
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Website URL</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Logo Image URL</label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://.../logo.png"
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Google Review Link */}
        {currentStep === 2 && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Link className="w-5 h-5 text-purple-600" />
              <span>Step 2: Add Google Review URL</span>
            </h3>

            <p className="text-xs text-slate-500">
              Paste the official direct review link for your Google Business Profile. When visitors tap your review button, they will be directed here with their copied AI draft.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Google Review URL *
              </label>
              <input
                type="url"
                required
                value={googleReviewUrl}
                onChange={(e) => {
                  setGoogleReviewUrl(e.target.value);
                  validateUrl(e.target.value);
                }}
                placeholder="https://search.google.com/local/writereview?placeid=... or https://g.page/r/..."
                className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none font-mono"
              />
            </div>

            {urlWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{urlWarning}</span>
              </div>
            )}

            {/* How to get link helper */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-slate-900">
                <Info className="w-4 h-4 text-purple-600" />
                <span>How to get your direct Google Review Link:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                <li>Log in to Google Business Profile or search your business on Google.</li>
                <li>Click <strong>Ask for reviews</strong> or <strong>Get more reviews</strong>.</li>
                <li>Copy the short review URL (e.g. <code>https://g.page/r/.../review</code>) and paste it above.</li>
              </ol>
            </div>
          </div>
        )}

        {/* STEP 3: Supported Languages */}
        {currentStep === 3 && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Languages className="w-5 h-5 text-purple-600" />
              <span>Step 3: Select Supported Languages</span>
            </h3>
            <p className="text-xs text-slate-500">
              Customers can toggle languages on your public review landing page to draft reviews in English, Hindi, or Gujarati.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {[
                { code: 'en' as SupportedLanguage, name: 'English', sub: 'Universal international standard' },
                { code: 'hi' as SupportedLanguage, name: 'Hindi (हिंदी)', sub: 'Devanagari script review drafts' },
                { code: 'gu' as SupportedLanguage, name: 'Gujarati (ગુજરાતી)', sub: 'Native Gujarati review drafts' },
              ].map((lang) => {
                const selected = supportedLanguages.includes(lang.code);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLanguage(lang.code)}
                    className={`p-4 rounded-xl border-2 text-left transition cursor-pointer ${
                      selected
                        ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-900">{lang.name}</span>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                          selected ? 'bg-purple-600 text-white' : 'border border-slate-300'
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">{lang.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: Keywords & Appearance */}
        {currentStep === 4 && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-purple-600" />
              <span>Step 4: Configure Keywords & Appearance</span>
            </h3>
            <p className="text-xs text-slate-500">
              Tailor how many keyword chips rotate per session, custom Call-to-Action text, and brand colors.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rotating Keywords Display Count (Per Session)
                </label>
                <div className="flex items-center gap-3">
                  {[3, 4, 5, 6, 8].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setDisplayKeywordsCount(count)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                        displayKeywordsCount === count
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {count} Keywords
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Keywords are automatically rotated from the category pool on each visit.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Custom Button Text
                </label>
                <input
                  type="text"
                  value={customCtaText}
                  onChange={(e) => setCustomCtaText(e.target.value)}
                  placeholder="Open Google Review & Paste"
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                    />
                    <span className="text-xs font-mono text-slate-600">{brandColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                    />
                    <span className="text-xs font-mono text-slate-600">{accentColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Success & QR Code Preview */}
        {currentStep === 5 && createdBusiness && (
          <div className="space-y-6 text-center max-w-md mx-auto py-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">Business Ready!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your branded public review page and QR code have been created successfully.
              </p>
            </div>

            {/* QR Code Container */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl inline-block shadow-inner">
              {previewQrUrl ? (
                <img
                  src={previewQrUrl}
                  alt="Business Review QR"
                  className="w-48 h-48 mx-auto rounded-xl shadow-xs"
                />
              ) : (
                <div className="w-48 h-48 bg-slate-200 animate-pulse rounded-xl" />
              )}
              <div className="mt-3 text-xs font-bold text-slate-800">{createdBusiness.name}</div>
              <div className="text-[11px] text-purple-600 font-mono">/{createdBusiness.slug}</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={() => onSuccess(createdBusiness)}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs rounded-xl transition cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Step Navigation Actions */}
        {currentStep < 5 && (
          <div className="flex items-center justify-between pt-8 border-t border-slate-100 mt-6">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <span>Saving...</span>
              ) : currentStep === 4 ? (
                <span>Complete & Generate QR &rarr;</span>
              ) : (
                <>
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
