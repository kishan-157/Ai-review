import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Check,
  AlertCircle,
  Languages,
} from 'lucide-react';
import { Business, MasterKeyword, BusinessKeyword, SupportedLanguage } from '../../types';
import { api } from '../../services/api';

interface CustomerKeywordsProps {
  business: Business;
  masterKeywords: MasterKeyword[];
}

export const CustomerKeywords: React.FC<CustomerKeywordsProps> = ({
  business,
  masterKeywords,
}) => {
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('en');
  const [customKeywords, setCustomKeywords] = useState<BusinessKeyword[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Load business-specific custom keywords and overrides
  useEffect(() => {
    loadBusinessKeywords();
  }, [business.id]);

  const loadBusinessKeywords = async () => {
    try {
      const data = await api.getBusinessKeywords(business.id);
      setCustomKeywords(data);
    } catch (err) {
      console.error(err);
    }
  };

  const showFeedback = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 2500);
  };

  // Filter master keywords for this business's category and current language
  const categoryMasters = masterKeywords.filter(
    (mk) =>
      (mk.category.toLowerCase() === business.category.toLowerCase() ||
        mk.category === 'Other / Custom Business') &&
      mk.language === selectedLang &&
      mk.isActive
  );

  const businessOverrides = customKeywords.filter((k) => k.language === selectedLang);
  const disabledMap = new Map(businessOverrides.map((k) => [k.keyword.toLowerCase(), k.isDisabled]));
  const customList = businessOverrides.filter((k) => k.isCustom);

  const handleAddCustomKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeywordInput.trim()) return;

    setLoading(true);
    try {
      const added = await api.addBusinessKeyword(
        business.id,
        newKeywordInput.trim(),
        selectedLang
      );
      setCustomKeywords((prev) => [...prev, added]);
      setNewKeywordInput('');
      showFeedback('Keyword added!');
    } catch (err: any) {
      alert(err.message || 'Failed to add keyword');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMasterOverride = async (mk: MasterKeyword) => {
    const isCurrentlyDisabled = disabledMap.get(mk.keyword.toLowerCase()) === true;
    const existingBk = customKeywords.find(
      (k) => k.keyword.toLowerCase() === mk.keyword.toLowerCase() && k.language === selectedLang
    );

    try {
      if (existingBk) {
        const updated = await api.toggleBusinessKeyword(existingBk.id, !isCurrentlyDisabled);
        setCustomKeywords((prev) =>
          prev.map((k) => (k.id === updated.id ? updated : k))
        );
      } else {
        // Create an override record marked disabled
        const added = await api.addBusinessKeyword(business.id, mk.keyword, selectedLang);
        const toggled = await api.toggleBusinessKeyword(added.id, true);
        setCustomKeywords((prev) => [...prev.filter((k) => k.id !== added.id), toggled]);
      }
      showFeedback(isCurrentlyDisabled ? 'Keyword enabled' : 'Keyword disabled for rotation');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDeleteCustom = async (id: string) => {
    try {
      await api.deleteBusinessKeyword(id);
      setCustomKeywords((prev) => prev.filter((k) => k.id !== id));
      showFeedback('Keyword removed');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-600" />
            <span>Keyword Rotation Studio</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage keywords for <strong className="text-slate-700">{business.name}</strong>. Category master keywords rotate automatically on visitor page views.
          </p>
        </div>

        {/* Language Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'en' as SupportedLanguage, label: 'English' },
            { id: 'hi' as SupportedLanguage, label: 'हिंदी (Hindi)' },
            { id: 'gu' as SupportedLanguage, label: 'ગુજરાતી (Gujarati)' },
          ].map((lang) => (
            <button
              key={lang.id}
              onClick={() => setSelectedLang(lang.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                selectedLang === lang.id
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Add Custom Keyword Input */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-purple-600" />
          <span>Add Custom Keyword ({selectedLang.toUpperCase()})</span>
        </h3>
        <form onSubmit={handleAddCustomKeyword} className="flex gap-2">
          <input
            type="text"
            value={newKeywordInput}
            onChange={(e) => setNewKeywordInput(e.target.value)}
            placeholder={`e.g. ${
              selectedLang === 'hi'
                ? 'बेहतरीन वातावरण'
                : selectedLang === 'gu'
                ? 'ઉત્તમ સર્વિસ'
                : 'Woodfired Pizza'
            }`}
            className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
          />
          <button
            type="submit"
            disabled={loading || !newKeywordInput.trim()}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </form>
      </div>

      {/* Grid of Custom Keywords */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Custom Business Keywords ({customList.length})
          </h3>
          <span className="text-[11px] text-slate-400">
            Exclusive to {business.name}
          </span>
        </div>

        {customList.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            No custom keywords added yet for this language. Type above to add your signature dish, service, or staff highlight!
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {customList.map((bk) => (
              <div
                key={bk.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-900 text-xs font-medium"
              >
                <span>{bk.keyword}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteCustom(bk.id)}
                  className="hover:text-rose-600 cursor-pointer"
                  title="Delete custom keyword"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Master Keywords (Read-only from Super Admin, toggleable) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>
                Master Pool for {business.category} ({categoryMasters.length})
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              These keywords rotate automatically into your customer sessions. Tap to hide/unhide any keyword.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
          {categoryMasters.map((mk) => {
            const isDisabled = disabledMap.get(mk.keyword.toLowerCase()) === true;
            return (
              <div
                key={mk.id}
                className={`p-3 rounded-xl border flex items-center justify-between transition ${
                  isDisabled
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : 'bg-white border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="truncate mr-2">
                  <span
                    className={`text-xs font-medium block truncate ${
                      isDisabled ? 'line-through text-slate-400' : 'text-slate-800'
                    }`}
                  >
                    {mk.keyword}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Priority: {mk.priority}/10
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleMasterOverride(mk)}
                  className={`p-1.5 rounded-lg text-xs cursor-pointer ${
                    isDisabled
                      ? 'text-slate-400 hover:text-slate-600'
                      : 'text-purple-600 hover:text-purple-800'
                  }`}
                  title={isDisabled ? 'Enable for rotation' : 'Exclude from rotation'}
                >
                  {isDisabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
