import React, { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  Tag,
  QrCode,
  MessageSquare,
  BarChart3,
  User,
  LogOut,
  ExternalLink,
  ShieldAlert,
  Search,
  CheckCircle,
  Clock,
  Sparkles,
  Layers,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  Business,
  BusinessCategory,
  CustomerAccount,
  MasterKeyword,
  PrivateFeedback,
  Announcement,
} from '../../types';
import { BusinessWizard } from './BusinessWizard';
import { QRStudio } from './QRStudio';
import { CustomerKeywords } from './CustomerKeywords';
import { FeedbackInbox } from './FeedbackInbox';
import { CustomerAnalytics } from './CustomerAnalytics';
import { api } from '../../services/api';

interface CustomerLayoutProps {
  customer: CustomerAccount;
  allBusinesses: Business[];
  categories: BusinessCategory[];
  masterKeywords: MasterKeyword[];
  feedbackList: PrivateFeedback[];
  announcements: Announcement[];
  isImpersonated: boolean;
  onExitImpersonation?: () => void;
  onLogout: () => void;
  onRefreshData: () => void;
  onPreviewPublicPage: (slug: string) => void;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({
  customer,
  allBusinesses,
  categories,
  masterKeywords,
  feedbackList,
  announcements,
  isImpersonated,
  onExitImpersonation,
  onLogout,
  onRefreshData,
  onPreviewPublicPage,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'businesses' | 'add-business' | 'keywords' | 'qr-studio' | 'feedback' | 'analytics' | 'settings'
  >('overview');

  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(
    allBusinesses[0]?.id || ''
  );
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Password / profile change state
  const [profileName, setProfileName] = useState<string>(customer.name);
  const [profilePhone, setProfilePhone] = useState<string>(customer.phone || '');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [profileSuccess, setProfileSuccess] = useState<boolean>(false);

  const customerBusinesses = allBusinesses.filter((b) => b.customerId === customer.id);
  const currentBusiness =
    customerBusinesses.find((b) => b.id === selectedBusinessId) || customerBusinesses[0];

  // Feedback for this customer's businesses
  const customerFeedback = feedbackList.filter((f) =>
    customerBusinesses.some((b) => b.id === f.businessId)
  );

  const filteredBusinesses = customerBusinesses.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q);
  });

  const handleBusinessCreatedOrUpdated = (b: Business) => {
    onRefreshData();
    setSelectedBusinessId(b.id);
    setEditingBusiness(null);
    setActiveTab('businesses');
  };

  const handleDeleteBusiness = async (id: string) => {
    if (!confirm('Are you sure you want to delete this business? All associated feedback will be permanently removed.')) {
      return;
    }
    try {
      await api.deleteBusiness(id);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete business');
    }
  };

  const handleToggleBusinessStatus = async (b: Business) => {
    try {
      await api.updateBusiness(b.id, { isActive: !b.isActive });
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateCustomer(customer.id, {
        name: profileName,
        phone: profilePhone,
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 2500);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    }
  };

  // Quota calculation
  const quotaUsed = customerBusinesses.length;
  const quotaLimit = customer.maxBusinesses;
  const isQuotaFull = quotaUsed >= quotaLimit && customer.role !== 'admin';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Impersonation Banner */}
      {isImpersonated && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>
              SUPER ADMIN IMPERSONATION ACTIVE: You are viewing the account of{' '}
              <u>{customer.name}</u> ({customer.email})
            </span>
          </div>
          {onExitImpersonation && (
            <button
              onClick={onExitImpersonation}
              className="px-3 py-1 bg-slate-950 text-white rounded hover:bg-slate-800 transition cursor-pointer"
            >
              Exit Impersonation & Return to Admin &rarr;
            </button>
          )}
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white font-black shadow-xs">
            LB
          </div>
          <div>
            <h1 className="font-extrabold text-base text-slate-900 tracking-tight">
              LocalBoost <span className="text-purple-600">AI Review</span>
            </h1>
            <span className="text-[10px] text-slate-400 font-medium block">
              Customer Portal • {customer.name}
            </span>
          </div>
        </div>

        {/* Right nav items */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Plan badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-100">
            {customer.isLifetime ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Lifetime Plan</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Expires:{' '}
                  {customer.expiryDate
                    ? new Date(customer.expiryDate).toLocaleDateString()
                    : 'Active'}
                </span>
              </>
            )}
            <span className="text-slate-300">|</span>
            <span>
              {quotaUsed}/{quotaLimit} Businesses
            </span>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-rose-600 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Navigation Sub-Tabs Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 overflow-x-auto">
        <div className="flex gap-1 py-2 min-w-max">
          {[
            { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'businesses', label: `My Businesses (${customerBusinesses.length})`, icon: Building2 },
            { id: 'add-business', label: '+ Add Business', icon: PlusCircle, disabled: isQuotaFull },
            { id: 'keywords', label: 'Keywords', icon: Tag },
            { id: 'qr-studio', label: 'QR Studio', icon: QrCode },
            { id: 'feedback', label: `Feedback (${customerFeedback.length})`, icon: MessageSquare },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'settings', label: 'Account', icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                disabled={tab.disabled}
                onClick={() => {
                  setEditingBusiness(null);
                  setActiveTab(tab.id as any);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-xs'
                    : tab.disabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* System Announcements Banner */}
      {announcements.length > 0 && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`p-3 rounded-xl border text-xs flex items-center justify-between mb-2 ${
                ann.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-purple-50 border-purple-200 text-purple-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <span className="font-bold">{ann.title}</span> — {ann.message}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">
        {/* VIEW 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Welcome banner */}
            <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-purple-200 font-bold">
                  LocalBoost SaaS Dashboard
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">
                  Welcome back, {customer.name}!
                </h2>
                <p className="text-xs sm:text-sm text-purple-100 max-w-xl mt-1 leading-relaxed">
                  Turn happy customers into authentic 5-star Google reviews with rotating keywords, multi-lingual AI drafts, and scannable table QR codes.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isQuotaFull}
                  onClick={() => {
                    setEditingBusiness(null);
                    setActiveTab('add-business');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white text-purple-900 font-bold text-xs shadow-md hover:bg-purple-50 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add New Business</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-xs font-bold text-slate-500 uppercase">Active Businesses</div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {customerBusinesses.filter((b) => b.isActive).length}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Limit: {quotaUsed} of {quotaLimit} used
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-xs font-bold text-slate-500 uppercase">Feedback Received</div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {customerFeedback.length}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {customerFeedback.filter((f) => f.status === 'New').length} new unread
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-xs font-bold text-slate-500 uppercase">Supported Languages</div>
                <div className="text-2xl font-black text-slate-900 mt-1">3</div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  English, Hindi, Gujarati
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-xs font-bold text-slate-500 uppercase">Account Status</div>
                <div className="text-base font-extrabold text-emerald-600 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>{customer.isLifetime ? 'Lifetime Access' : 'Active Subscription'}</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {customer.expiryDate
                    ? `Renews ${new Date(customer.expiryDate).toLocaleDateString()}`
                    : 'Unlimited'}
                </span>
              </div>
            </div>

            {/* Businesses Quick List */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Your Review Landing Pages
                </h3>
                <button
                  onClick={() => setActiveTab('businesses')}
                  className="text-xs text-purple-600 hover:text-purple-800 font-semibold cursor-pointer"
                >
                  View All &rarr;
                </button>
              </div>

              {customerBusinesses.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No businesses added yet</p>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Set up your first business to get your branded review page and QR code.
                  </p>
                  <button
                    onClick={() => setActiveTab('add-business')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Launch Business Wizard
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customerBusinesses.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 transition bg-slate-50/50 flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                            {b.customCategory || b.category}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">{b.name}</h4>
                          <p className="text-xs text-slate-500 line-clamp-1">{b.tagline}</p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            b.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {b.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 text-xs">
                        <button
                          type="button"
                          onClick={() => onPreviewPublicPage(b.slug)}
                          className="flex items-center gap-1 text-purple-700 hover:text-purple-900 font-semibold cursor-pointer"
                        >
                          <span>Open Live Page</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBusinessId(b.id);
                            setActiveTab('qr-studio');
                          }}
                          className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                        >
                          <QrCode className="w-3 h-3" />
                          <span>QR Code</span>
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBusinessId(b.id);
                            setActiveTab('keywords');
                          }}
                          className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                        >
                          <Tag className="w-3 h-3" />
                          <span>Keywords</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: BUSINESSES LIST */}
        {activeTab === 'businesses' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  <span>My Managed Businesses</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure details, Google review links, and public slugs for each business.
                </p>
              </div>

              <button
                disabled={isQuotaFull}
                onClick={() => {
                  setEditingBusiness(null);
                  setActiveTab('add-business');
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Business ({quotaUsed}/{quotaLimit})</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search businesses by name or category..."
                className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            {/* Business List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBusinesses.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        {b.customCategory || b.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleBusinessStatus(b)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer ${
                          b.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {b.isActive ? 'Active' : 'Paused'}
                      </button>
                    </div>

                    <h3 className="font-bold text-base text-slate-900">{b.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{b.tagline || b.description}</p>
                    <div className="text-[11px] font-mono text-purple-600 bg-purple-50/50 p-1.5 rounded-lg truncate">
                      /{b.slug}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => onPreviewPublicPage(b.slug)}
                      className="font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Public Page</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBusiness(b);
                          setActiveTab('add-business');
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                        title="Edit Business"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBusiness(b.id)}
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
          </div>
        )}

        {/* VIEW 3: ADD OR EDIT BUSINESS (WIZARD) */}
        {activeTab === 'add-business' && (
          <BusinessWizard
            categories={categories}
            customerId={customer.id}
            existingBusiness={editingBusiness || undefined}
            onSuccess={handleBusinessCreatedOrUpdated}
            onCancel={() => {
              setEditingBusiness(null);
              setActiveTab('businesses');
            }}
          />
        )}

        {/* VIEW 4: KEYWORDS */}
        {activeTab === 'keywords' && currentBusiness && (
          <CustomerKeywords
            business={currentBusiness}
            masterKeywords={masterKeywords}
          />
        )}

        {/* VIEW 5: QR STUDIO */}
        {activeTab === 'qr-studio' && (
          <QRStudio
            businesses={customerBusinesses}
            selectedBusinessId={selectedBusinessId}
            onSelectBusiness={(id) => setSelectedBusinessId(id)}
          />
        )}

        {/* VIEW 6: FEEDBACK INBOX */}
        {activeTab === 'feedback' && (
          <FeedbackInbox
            feedbackList={customerFeedback}
            businesses={customerBusinesses}
            onFeedbackUpdated={() => onRefreshData()}
          />
        )}

        {/* VIEW 7: ANALYTICS */}
        {activeTab === 'analytics' && currentBusiness && (
          <div className="space-y-4">
            {customerBusinesses.length > 1 && (
              <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-700">Viewing Analytics for:</span>
                <select
                  value={currentBusiness.id}
                  onChange={(e) => setSelectedBusinessId(e.target.value)}
                  className="text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1"
                >
                  {customerBusinesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <CustomerAnalytics business={currentBusiness} />
          </div>
        )}

        {/* VIEW 8: SETTINGS & PROFILE */}
        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Account & Profile Settings</h2>
              <p className="text-xs text-slate-500">
                Manage your credentials, contact phone, and view subscription details.
              </p>
            </div>

            {profileSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Profile updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={customer.email}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Change Password</label>
                <input
                  type="password"
                  placeholder="Enter new secure password (leave blank to keep current)"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-800">Plan & Access Info</span>
              <div className="text-slate-600">
                Plan Type: <strong>{customer.isLifetime ? 'Lifetime Access' : 'Standard'}</strong>
              </div>
              <div className="text-slate-600">
                Maximum Business Quota: <strong>{customer.maxBusinesses} businesses</strong>
              </div>
              <div className="text-slate-600">
                Status: <strong>{customer.isActive ? 'Active' : 'Disabled'}</strong>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
