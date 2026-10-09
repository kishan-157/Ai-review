import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Shield,
  ArrowRight,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { CustomerAccount } from '../types';
import { api } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: CustomerAccount) => void;
  defaultRole?: 'customer' | 'admin';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  defaultRole = 'customer',
}) => {
  const [authMode, setAuthMode] = useState<'customer' | 'admin' | 'register'>(
    defaultRole === 'admin' ? 'admin' : 'customer'
  );
  const [email, setEmail] = useState<string>(
    defaultRole === 'admin' ? 'admin@localboost.io' : 'owner@spicegardenbistro.com'
  );
  const [password, setPassword] = useState<string>('demo123');
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleModeChange = (mode: 'customer' | 'admin' | 'register') => {
    setAuthMode(mode);
    setErrorMsg(null);
    if (mode === 'admin') {
      setEmail('admin@localboost.io');
      setPassword('admin123');
    } else if (mode === 'customer') {
      setEmail('owner@spicegardenbistro.com');
      setPassword('demo123');
    } else {
      setEmail('');
      setPassword('');
      setName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (authMode === 'register') {
        if (!name.trim()) throw new Error('Full Name is required');
        const newCust = await api.createCustomer({
          email: email.trim(),
          name: name.trim(),
          maxBusinesses: 3,
        });
        onLoginSuccess(newCust);
        onClose();
      } else {
        const res = await api.login(email.trim(), password);
        onLoginSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, mode: 'customer' | 'admin' = 'customer') => {
    setEmail(demoEmail);
    setPassword(mode === 'admin' ? 'admin123' : 'demo123');
    setAuthMode(mode);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-6">
        {/* Role Mode Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => handleModeChange('customer')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'customer'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Customer Portal</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('admin')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'admin'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-300" />
            <span>Super Admin</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center space-y-1">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner ${
              authMode === 'admin'
                ? 'bg-slate-900 text-amber-300'
                : 'bg-purple-100 text-purple-700'
            }`}
          >
            {authMode === 'admin' ? (
              <Shield className="w-6 h-6" />
            ) : (
              <Lock className="w-6 h-6" />
            )}
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {authMode === 'register'
              ? 'Create SaaS Account'
              : authMode === 'admin'
              ? 'Super Admin Console'
              : 'Customer Portal Login'}
          </h2>
          <p className="text-xs text-slate-500">
            {authMode === 'register'
              ? 'Get started with review management and QR generation'
              : authMode === 'admin'
              ? 'Access central multi-tenant management, quotas, and audit logs'
              : 'Log in with the credentials issued by your administrator to manage your review pages'}
          </p>
        </div>

        {/* Quick 1-Click Demo Accounts */}
        <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-100 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">
            ⚡ 1-Click Quick Demo Switcher
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@localboost.io', 'admin')}
              className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[11px] font-bold hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
            >
              <Shield className="w-3 h-3 text-amber-300" />
              <span>Super Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('owner@spicegardenbistro.com', 'customer')}
              className="px-2.5 py-1 bg-white text-purple-900 border border-purple-200 rounded-lg text-[11px] font-semibold hover:bg-purple-100 transition cursor-pointer"
            >
              Priya (Bistro)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('contact@apexfitness.com', 'customer')}
              className="px-2.5 py-1 bg-white text-purple-900 border border-purple-200 rounded-lg text-[11px] font-semibold hover:bg-purple-100 transition cursor-pointer"
            >
              Marcus (Apex Gym)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('drpatel@smilecaredental.com', 'customer')}
              className="px-2.5 py-1 bg-white text-purple-900 border border-purple-200 rounded-lg text-[11px] font-semibold hover:bg-purple-100 transition cursor-pointer"
            >
              Dr. Patel (Dental)
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {authMode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Marcus Vance"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@business.com"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${
              authMode === 'admin'
                ? 'bg-slate-900 hover:bg-slate-800'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : authMode === 'register' ? (
              <>
                <span>Create SaaS Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : authMode === 'admin' ? (
              <>
                <Shield className="w-4 h-4 text-amber-300" />
                <span>Enter Super Admin Console</span>
              </>
            ) : (
              <>
                <span>Sign In to Customer Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => handleModeChange(authMode === 'register' ? 'customer' : 'register')}
            className="text-purple-600 hover:underline font-semibold cursor-pointer"
          >
            {authMode === 'register' ? 'Existing account? Sign In' : 'New business? Register here'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
