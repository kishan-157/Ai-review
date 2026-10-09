import React, { useState, useEffect } from 'react';
import {
  CustomerAccount,
  Business,
  BusinessCategory,
  MasterKeyword,
  PrivateFeedback,
  Announcement,
  AuditLog,
} from './types';
import { api, GlobalDataResponse } from './services/api';
import { PublicReviewPage } from './components/PublicReviewPage';
import { CustomerLayout } from './components/CustomerDashboard/CustomerLayout';
import { AdminLayout } from './components/AdminDashboard/AdminLayout';
import { AuthModal } from './components/AuthModal';
import {
  INITIAL_CATEGORIES,
  INITIAL_CUSTOMERS,
  INITIAL_BUSINESSES,
  INITIAL_MASTER_KEYWORDS,
  INITIAL_FEEDBACK,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_AUDIT_LOGS,
} from './data/seedData';
import { Sparkles, Shield, User, ExternalLink, QrCode } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<GlobalDataResponse>({
    categories: INITIAL_CATEGORIES,
    customers: INITIAL_CUSTOMERS,
    businesses: INITIAL_BUSINESSES,
    masterKeywords: INITIAL_MASTER_KEYWORDS,
    businessKeywords: [],
    feedback: INITIAL_FEEDBACK,
    announcements: INITIAL_ANNOUNCEMENTS,
    auditLogs: INITIAL_AUDIT_LOGS,
  });

  const [currentUser, setCurrentUser] = useState<CustomerAccount | null>(null);
  const [impersonatingAdmin, setImpersonatingAdmin] = useState<CustomerAccount | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authDefaultRole, setAuthDefaultRole] = useState<'customer' | 'admin'>('customer');

  // View state: 'public' | 'customer' | 'admin'
  const [currentView, setCurrentView] = useState<'public' | 'customer' | 'admin'>('public');
  const [currentPublicSlug, setCurrentPublicSlug] = useState<string>('the-spice-garden-bistro');

  // Load backend data
  const refreshData = async () => {
    try {
      const res = await api.getGlobalData();
      setData(res);
    } catch (err) {
      console.warn('Backend data load fallback to memory seed data:', err);
    }
  };

  useEffect(() => {
    refreshData();

    // Check hash for public review slug, e.g. #b/the-spice-garden-bistro
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#b/')) {
        const slug = hash.replace('#b/', '');
        setCurrentPublicSlug(slug);
        setCurrentView('public');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Check saved session in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('localboost_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.id) {
          setCurrentUser(parsed);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const handleLoginSuccess = (user: CustomerAccount) => {
    setCurrentUser(user);
    localStorage.setItem('localboost_session', JSON.stringify(user));
    if (user.role === 'admin') {
      setCurrentView('admin');
    } else {
      setCurrentView('customer');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setImpersonatingAdmin(null);
    localStorage.removeItem('localboost_session');
    setCurrentView('public');
  };

  const handleStartImpersonation = async (customerId: string) => {
    try {
      if (currentUser?.role === 'admin') {
        setImpersonatingAdmin(currentUser);
      }
      const impersonatedCustomer = await api.impersonate(customerId, currentUser?.email || 'admin');
      setCurrentUser(impersonatedCustomer);
      setCurrentView('customer');
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to impersonate customer');
    }
  };

  const handleExitImpersonation = () => {
    if (impersonatingAdmin) {
      setCurrentUser(impersonatingAdmin);
      setImpersonatingAdmin(null);
      setCurrentView('admin');
      refreshData();
    }
  };

  // Find business for public page
  const currentPublicBusiness =
    data.businesses.find((b) => b.slug.toLowerCase() === currentPublicSlug.toLowerCase()) ||
    data.businesses[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Universal Mode Switcher Bar */}
      <div className="bg-slate-950 text-slate-300 text-xs px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center font-black text-[11px]">
            LB
          </div>
          <span className="font-bold text-white tracking-wide">LocalBoost AI Review</span>
          <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium">
            Multi-Tenant SaaS
          </span>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              window.location.hash = `#b/${currentPublicBusiness?.slug || 'the-spice-garden-bistro'}`;
              setCurrentView('public');
            }}
            className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              currentView === 'public'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Public Review Page</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!currentUser) {
                setAuthDefaultRole('customer');
                setIsAuthModalOpen(true);
              } else if (currentUser.role === 'admin' && !impersonatingAdmin) {
                // switch to admin or login customer
                setCurrentView('customer');
              } else {
                setCurrentView('customer');
              }
            }}
            className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              currentView === 'customer'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Customer Portal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (currentUser?.role === 'admin') {
                setCurrentView('admin');
              } else {
                setAuthDefaultRole('admin');
                setIsAuthModalOpen(true);
              }
            }}
            className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              currentView === 'admin'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-300" />
            <span>Super Admin</span>
          </button>

          {!currentUser ? (
            <button
              type="button"
              onClick={() => {
                setAuthDefaultRole('customer');
                setIsAuthModalOpen(true);
              }}
              className="ml-2 px-3 py-1 bg-white text-slate-900 rounded-lg font-bold text-xs hover:bg-purple-50 transition cursor-pointer"
            >
              Sign In
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 ml-2 hidden sm:inline">
              Hi, <strong className="text-white">{currentUser.name}</strong>
            </span>
          )}
        </div>
      </div>

      {/* VIEW: PUBLIC REVIEW PAGE */}
      {currentView === 'public' && currentPublicBusiness && (
        <PublicReviewPage
          business={currentPublicBusiness}
          allBusinesses={data.businesses}
          onSwitchBusiness={(slug) => {
            setCurrentPublicSlug(slug);
            window.location.hash = `#b/${slug}`;
          }}
          onNavigateHome={() => {
            if (currentUser) {
              setCurrentView(currentUser.role === 'admin' ? 'admin' : 'customer');
            } else {
              setIsAuthModalOpen(true);
            }
          }}
        />
      )}

      {/* VIEW: CUSTOMER DASHBOARD */}
      {currentView === 'customer' && (
        <CustomerLayout
          customer={currentUser || data.customers.find((c) => c.role !== 'admin') || data.customers[1]}
          allBusinesses={data.businesses}
          categories={data.categories}
          masterKeywords={data.masterKeywords}
          feedbackList={data.feedback}
          announcements={data.announcements}
          isImpersonated={Boolean(impersonatingAdmin)}
          onExitImpersonation={handleExitImpersonation}
          onLogout={handleLogout}
          onRefreshData={refreshData}
          onPreviewPublicPage={(slug) => {
            setCurrentPublicSlug(slug);
            window.location.hash = `#b/${slug}`;
            setCurrentView('public');
          }}
        />
      )}

      {/* VIEW: SUPER ADMIN PANEL */}
      {currentView === 'admin' && (
        <AdminLayout
          admin={data.customers.find((c) => c.role === 'admin') || INITIAL_CUSTOMERS[0]}
          customers={data.customers}
          businesses={data.businesses}
          categories={data.categories}
          masterKeywords={data.masterKeywords}
          feedbackList={data.feedback}
          announcements={data.announcements}
          auditLogs={data.auditLogs}
          onImpersonate={handleStartImpersonation}
          onLogout={handleLogout}
          onRefreshData={refreshData}
          onPreviewPublicPage={(slug) => {
            setCurrentPublicSlug(slug);
            window.location.hash = `#b/${slug}`;
            setCurrentView('public');
          }}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        defaultRole={authDefaultRole}
      />
    </div>
  );
}
