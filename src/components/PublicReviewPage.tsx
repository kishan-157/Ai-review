import React, { useState, useEffect } from 'react';
import {
  Star,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  RotateCw,
  Phone,
  MessageCircle,
  Globe,
  MapPin,
  Send,
  MessageSquare,
  AlertCircle,
  ChevronDown,
  Building2,
  Share2,
} from 'lucide-react';
import { Business, SupportedLanguage, ReviewDraft } from '../types';
import { api } from '../services/api';
import { supabase } from '../services/supabase';

interface PublicReviewPageProps {
  business: Business;
  onNavigateHome?: () => void;
  onSwitchBusiness?: (slug: string) => void;
  allBusinesses?: Business[];
}

export const PublicReviewPage: React.FC<PublicReviewPageProps> = ({
  business,
  onNavigateHome,
  onSwitchBusiness,
  allBusinesses,
}) => {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isRatingLocked, setIsRatingLocked] = useState<boolean>(false);
  const [hasResetRatingOnce, setHasResetRatingOnce] = useState<boolean>(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    business.supportedLanguages[0] || 'en'
  );
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [userExperience, setUserExperience] = useState<string>('');
  const [isRotatingKeywords, setIsRotatingKeywords] = useState<boolean>(false);

  // AI Drafts
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [drafts, setDrafts] = useState<ReviewDraft[]>([]);
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [generationCount, setGenerationCount] = useState<number>(0);

  // Private feedback
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [feedbackName, setFeedbackName] = useState<string>('');
  const [feedbackPhone, setFeedbackPhone] = useState<string>('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<boolean>(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Check if this visitor already submitted feedback in this browser session
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`feedback_submitted_${business.id}`);
      if (stored === 'true') {
        setFeedbackSubmitted(true);
        setSelectedRating(3);
        setIsRatingLocked(true);
        setHasResetRatingOnce(true);
      }
    } catch {
      // ignore
    }
  }, [business.id]);

  // Track initial page view
  useEffect(() => {
    api.trackAnalytics(business.id, 'page_view');
  }, [business.id]);

  // Load and rotate keywords for current business and language
  useEffect(() => {
    loadKeywords();
  }, [business.id, selectedLanguage]);

  const loadKeywords = async () => {
    setIsRotatingKeywords(true);
    try {
      const rotated = await api.rotateKeywords(
        business.id,
        selectedLanguage,
        business.displayKeywordsCount || 5
      );
      setKeywords(rotated);
      setSelectedKeywords([]);
    } catch (err) {
      console.error('Failed to rotate keywords:', err);
    } finally {
      setIsRotatingKeywords(false);
    }
  };

  const handleKeywordToggle = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(selectedKeywords.filter((k) => k !== keyword));
    } else {
      if (selectedKeywords.length >= 5) {
        showToast('You can select up to 5 keywords');
        return;
      }
      setSelectedKeywords([...selectedKeywords, keyword]);
      api.trackAnalytics(business.id, 'keyword_select', { keyword });
    }
  };

  const handleRatingSelect = (rating: number) => {
    if (isRatingLocked || feedbackSubmitted) return;
    setSelectedRating(rating);
    setIsRatingLocked(true);
    api.trackAnalytics(business.id, 'rating_select', { rating });
  };

  const handleResetRating = () => {
    if (hasResetRatingOnce || feedbackSubmitted) return;
    setIsRatingLocked(false);
    setHasResetRatingOnce(true);
    showToast('You can now re-select your rating.');
  };

  const handleGenerateDrafts = async () => {
    if (!selectedRating || selectedRating < 4) return;
    setIsGeneratingAi(true);
    setAiMessage(null);
    try {
      const response = await api.generateAiDrafts({
        businessName: business.name,
        businessCategory: business.customCategory || business.category,
        rating: selectedRating,
        keywords: selectedKeywords,
        userExperience,
        language: selectedLanguage,
        businessId: business.id,
      });

      setDrafts(response.drafts);
      setGenerationCount((prev) => prev + 1);
      if (response.message) {
        setAiMessage(response.message);
      }
      showToast('3 review drafts created!');
    } catch (err: any) {
      showToast(err.message || 'Could not generate drafts');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCopyDraft = (draft: ReviewDraft) => {
    navigator.clipboard.writeText(draft.text);
    setCopiedDraftId(draft.id);
    showToast('Draft copied to clipboard!');
    setTimeout(() => setCopiedDraftId(null), 2500);
  };

  const handleOpenGoogleReview = () => {
    if (!selectedRating || selectedRating < 4) return;
    api.trackAnalytics(business.id, 'google_review_click', { rating: selectedRating });
    if (business.googleReviewUrl) {
      window.open(business.googleReviewUrl, '_blank', 'noopener,noreferrer');
    } else {
      showToast('Google Review link not configured for this business');
    }
  };

  const handleSubmitPrivateFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim() || feedbackSubmitted) return;

    setFeedbackSubmitting(true);
    try {
      await api.submitPrivateFeedback({
        businessId: business.id,
        rating: selectedRating || 3,
        message: feedbackMessage.trim(),
        customerName: feedbackName.trim() || undefined,
        customerPhone: feedbackPhone.trim() || undefined,
      });

      // Also attempt direct Supabase client write
      try {
        await supabase.from('private_feedback').insert({
          business_id: business.id,
          rating: selectedRating || 3,
          message: feedbackMessage.trim(),
          customer_name: feedbackName.trim() || null,
          customer_phone: feedbackPhone.trim() || null,
          status: 'New',
        });
      } catch {
        // silent
      }

      setFeedbackSubmitted(true);
      try {
        sessionStorage.setItem(`feedback_submitted_${business.id}`, 'true');
      } catch {
        // ignore
      }
      showToast('Thank you! Your feedback has been sent directly to the owner.');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit feedback');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const ratingDescriptions: Record<number, string> = {
    1: 'Needs Improvement',
    2: 'Below Average',
    3: 'Average / Fair',
    4: 'Very Good Experience',
    5: 'Exceptional & Delightful!',
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-2xl text-sm font-medium flex items-center gap-2 border border-slate-700 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Top Demo Bar / Quick Navigation Switcher */}
      <header className="bg-slate-900 text-slate-300 text-xs px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold text-white">Live Public Review Page</span>
          <span className="text-slate-400 hidden sm:inline">| Slug: /{business.slug}</span>
        </div>
        <div className="flex items-center gap-3">
          {allBusinesses && allBusinesses.length > 1 && onSwitchBusiness && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Switch Demo Biz:</span>
              <select
                value={business.slug}
                onChange={(e) => onSwitchBusiness(e.target.value)}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-0.5 text-xs focus:outline-none"
              >
                {allBusinesses.map((b) => (
                  <option key={b.id} value={b.slug}>
                    {b.name} ({b.category})
                  </option>
                ))}
              </select>
            </div>
          )}
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition cursor-pointer"
            >
              Go to SaaS Portal &rarr;
            </button>
          )}
        </div>
      </header>

      {/* Hero Header with Purple / Violet Gradient */}
      <div className="relative bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 text-white px-4 pt-8 pb-14 shadow-lg">
        <div className="max-w-xl mx-auto text-center">
          {/* Logo or Icon */}
          <div className="inline-block p-1 bg-white/20 backdrop-blur-md rounded-2xl mb-3 shadow-inner">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="w-16 h-16 rounded-xl object-cover bg-white"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <Building2 className="w-8 h-8" />
              </div>
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-medium tracking-wide uppercase mb-2">
            <span>{business.customCategory || business.category}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            {business.name}
          </h1>

          {business.tagline && (
            <p className="text-sm sm:text-base text-purple-100 max-w-md mx-auto font-normal leading-relaxed mb-4">
              {business.tagline}
            </p>
          )}

          {/* Contact shortcuts */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full transition"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Us</span>
              </a>
            )}
            {business.whatsapp && (
              <a
                href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 rounded-full transition"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
                <span>WhatsApp</span>
              </a>
            )}
            {business.website && (
              <a
                href={business.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full transition"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Website</span>
              </a>
            )}
            {business.address && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-white/10 rounded-full text-purple-100 max-w-xs truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{business.address}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Review Card Floating over gradient */}
      <main className="max-w-xl mx-auto px-4 -mt-8">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5 sm:p-7 space-y-6">
          {/* Section 1: Rating Selection */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md">
                Step 1 • How was your experience?
              </span>
              {isRatingLocked && (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Rating Locked
                </span>
              )}
            </div>

            <div className="flex justify-center items-center gap-2 pt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  disabled={isRatingLocked || feedbackSubmitted}
                  onClick={() => handleRatingSelect(star)}
                  onMouseEnter={() => !isRatingLocked && !feedbackSubmitted && setHoverRating(star)}
                  onMouseLeave={() => !isRatingLocked && !feedbackSubmitted && setHoverRating(0)}
                  className={`p-1 sm:p-2 transition-transform transform ${
                    isRatingLocked || feedbackSubmitted ? 'cursor-default' : 'active:scale-90 hover:scale-110 cursor-pointer'
                  } focus:outline-none`}
                  aria-label={`Rate ${star} star`}
                >
                  <Star
                    className={`w-9 h-9 sm:w-11 sm:h-11 transition-colors ${
                      star <= (hoverRating || (selectedRating ?? 0))
                        ? 'fill-amber-400 text-amber-400 filter drop-shadow'
                        : 'text-slate-200 fill-slate-100'
                    }`}
                  />
                </button>
              ))}
            </div>

            <p className="text-sm font-medium text-slate-700 h-5">
              {hoverRating
                ? ratingDescriptions[hoverRating]
                : selectedRating
                ? ratingDescriptions[selectedRating]
                : 'Tap a star to rate your visit (1 to 5)'}
            </p>

            {/* Reset/Change Rating text link (allowed only once, if feedback not submitted yet) */}
            {isRatingLocked && !hasResetRatingOnce && !feedbackSubmitted && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleResetRating}
                  className="text-xs text-purple-600 hover:text-purple-800 underline decoration-dotted font-medium cursor-pointer"
                >
                  Reset / Change Rating (allowed once)
                </button>
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Prompt when no rating is selected yet */}
          {selectedRating === null && (
            <div className="text-center py-6 px-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2">
              <Sparkles className="w-5 h-5 text-purple-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">Please choose your star rating above</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Rate 4 or 5 stars to get AI-crafted Google review drafts, or 1 to 3 stars to send private confidential feedback directly to the business owner.
              </p>
            </div>
          )}

          {/* =============================================================== */}
          {/* CONDITIONAL BRANCH A: 4 or 5 STARS (AI Drafts & Google Reviews) */}
          {/* =============================================================== */}
          {selectedRating !== null && selectedRating >= 4 && (
            <div className="space-y-6">
              {/* Section 2: Language Preference & Keyword Rotation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md">
                    Step 2 • Select Highlights
                  </span>

                  {/* Language Selector */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
                    {(business.supportedLanguages || ['en', 'hi', 'gu']).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSelectedLanguage(lang)}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                          selectedLanguage === lang
                            ? 'bg-purple-600 text-white shadow-xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {lang === 'en' ? 'English' : lang === 'hi' ? 'हिंदी' : 'ગુજરાતી'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Tap up to 5 keywords that describe your visit:</span>
                  <button
                    type="button"
                    onClick={loadKeywords}
                    disabled={isRotatingKeywords}
                    className="flex items-center gap-1 text-purple-700 hover:text-purple-900 font-semibold cursor-pointer disabled:opacity-50"
                    title="Shuffle fresh keywords from the database"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRotatingKeywords ? 'animate-spin' : ''}`} />
                    <span>Shuffle</span>
                  </button>
                </div>

                {/* Keyword Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {keywords.map((kw) => {
                    const isSelected = selectedKeywords.includes(kw);
                    return (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => handleKeywordToggle(kw)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-600 ring-offset-1'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{kw}</span>
                      </button>
                    );
                  })}
                  {keywords.length === 0 && (
                    <div className="text-xs text-slate-400 italic py-2">
                      No keywords found for this language. Click Shuffle or add in dashboard.
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Optional Real Experience Notes */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md w-max">
                  Step 3 • Any personal note? (Optional)
                </label>
                <textarea
                  value={userExperience}
                  onChange={(e) => setUserExperience(e.target.value)}
                  placeholder="e.g. Loved the friendly welcome by the team, quick service, and clean surroundings..."
                  rows={2}
                  className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none placeholder:text-slate-400 bg-slate-50/50"
                />
              </div>

              {/* Section 4: AI Drafts Generation Button */}
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={handleGenerateDrafts}
                  disabled={isGeneratingAi}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  {isGeneratingAi ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Drafting Personalized Reviews...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>
                        {drafts.length > 0 ? 'Regenerate 3 AI Review Drafts' : 'Generate 3 AI Review Drafts'}
                      </span>
                    </>
                  )}
                </button>

                {aiMessage && (
                  <p className="text-xs text-slate-500 text-center italic bg-slate-50 py-1 px-2 rounded">
                    {aiMessage}
                  </p>
                )}
              </div>

              {/* Draft Suggestions Cards */}
              {drafts.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Review Suggestions ({drafts.length})
                    </span>
                    <span className="text-[11px] text-purple-600 font-medium">
                      Tap "Copy Draft", then open Google!
                    </span>
                  </div>

                  {drafts.map((draft) => {
                    const isCopied = copiedDraftId === draft.id;
                    return (
                      <div
                        key={draft.id}
                        className={`relative p-4 rounded-xl border transition-all ${
                          isCopied
                            ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-400'
                            : 'border-purple-100 bg-purple-50/30 hover:border-purple-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-purple-900 bg-purple-100 px-2 py-0.5 rounded">
                            {draft.tone}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyDraft(draft)}
                            className={`px-3 py-1 text-xs font-medium rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-xs'
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-purple-600" />
                                <span>Copy Draft</span>
                              </>
                            )}
                          </button>
                        </div>

                        <p className="text-sm text-slate-800 leading-relaxed font-sans">{draft.text}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Section 5: Primary Action - Google Review Button */}
              <div className="pt-2 space-y-3">
                <button
                  type="button"
                  onClick={handleOpenGoogleReview}
                  className="w-full py-4 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 cursor-pointer group"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white text-slate-900">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                  <span className="tracking-wide">
                    {business.customCtaText || 'Share Your Experience on Google'}
                  </span>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>How it works:</strong> Tap <em>Copy Draft</em> on any suggestion above, then click{' '}
                    <em>Share Your Experience on Google</em> to paste it directly onto Google. Google opens in a new tab!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* CONDITIONAL BRANCH B: 1, 2, or 3 STARS (Private Feedback Auto-Expanded) */}
          {/* ========================================================================= */}
          {selectedRating !== null && selectedRating <= 3 && (
            <div className="space-y-4 pt-1 animate-fadeIn">
              {feedbackSubmitted ? (
                /* Success / Locked confirmation state */
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-base text-emerald-950">Thank you for your feedback!</h3>
                  <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
                    Your feedback has been saved and forwarded directly to the business owner and management team so they can resolve the issue promptly.
                  </p>
                </div>
              ) : (
                /* Private feedback form automatically shown */
                <form
                  onSubmit={handleSubmitPrivateFeedback}
                  className="p-5 sm:p-6 rounded-2xl bg-purple-50/40 border border-purple-200 text-left space-y-4 shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Please let the owner know what went wrong
                      </h3>
                      <p className="text-xs text-slate-500">
                        Your response is confidential and sent privately to the management.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Your Detailed Experience *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Please tell us what went wrong, what service or product could be improved, or how we can make this right..."
                      className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Your Name (optional)
                      </label>
                      <input
                        type="text"
                        value={feedbackName}
                        onChange={(e) => setFeedbackName(e.target.value)}
                        placeholder="e.g. Alex"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phone Number (optional)
                      </label>
                      <input
                        type="tel"
                        value={feedbackPhone}
                        onChange={(e) => setFeedbackPhone(e.target.value)}
                        placeholder="e.g. +1 (555) 000-0000"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={feedbackSubmitting}
                    className="w-full py-3.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md disabled:opacity-60"
                  >
                    {feedbackSubmitting ? (
                      <span>Sending Private Feedback...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Private Feedback to Owner</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center pt-8 text-xs text-slate-400 space-y-1">
          <p>
            Powered by{' '}
            <span className="font-semibold text-slate-600">LocalBoost AI Review</span>
          </p>
          <p className="text-[11px]">
            Google is a trademark of Google LLC. This service provides AI-assisted review drafting.
          </p>
        </div>
      </main>
    </div>
  );
};
