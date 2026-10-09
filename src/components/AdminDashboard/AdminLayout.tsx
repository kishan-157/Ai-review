import React, { useState } from 'react';
import {
  Shield,
  Users,
  Building2,
  FolderTree,
  Tag,
  MessageSquare,
  BarChart3,
  Bell,
  History,
  Settings,
  LogOut,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  UserCheck,
  Edit,
  Trash2,
  Sparkles,
  Database,
  Lock,
  Layers,
  Check,
  RotateCw,
  Copy,
} from 'lucide-react';
import {
  CustomerAccount,
  Business,
  BusinessCategory,
  MasterKeyword,
  PrivateFeedback,
  Announcement,
  AuditLog,
  SupportedLanguage,
} from '../../types';
import { api } from '../../services/api';

interface AdminLayoutProps {
  admin: CustomerAccount;
  customers: CustomerAccount[];
  businesses: Business[];
  categories: BusinessCategory[];
  masterKeywords: MasterKeyword[];
  feedbackList: PrivateFeedback[];
  announcements: Announcement[];
  auditLogs: AuditLog[];
  onImpersonate: (customerId: string) => void;
  onLogout: () => void;
  onRefreshData: () => void;
  onPreviewPublicPage: (slug: string) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  admin,
  customers,
  businesses,
  categories,
  masterKeywords,
  feedbackList,
  announcements,
  auditLogs,
  onImpersonate,
  onLogout,
  onRefreshData,
  onPreviewPublicPage,
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'customers'
    | 'businesses'
    | 'categories'
    | 'keywords'
    | 'feedback'
    | 'announcements'
    | 'audit-logs'
    | 'settings'
  >('dashboard');

  // Customer Management Modals / Forms
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerAccount | null>(null);
  const [custName, setCustName] = useState<string>('');
  const [custEmail, setCustEmail] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');
  const [custPassword, setCustPassword] = useState<string>('');
  const [custMaxBiz, setCustMaxBiz] = useState<number>(3);
  const [custIsLifetime, setCustIsLifetime] = useState<boolean>(false);
  const [custExpiry, setCustExpiry] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [onboardingCredentials, setOnboardingCredentials] = useState<{
    email: string;
    fullName: string;
    temporaryPassword: string;
    maxBusinesses: number;
    expiryDate: string;
  } | null>(null);

  // Category Management
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');

  // Master Keywords Management
  const [selectedKwCat, setSelectedKwCat] = useState<string>(categories[0]?.name || 'Restaurant');
  const [selectedKwLang, setSelectedKwLang] = useState<SupportedLanguage>('en');
  const [newSingleKw, setNewSingleKw] = useState<string>('');
  const [bulkKwsInput, setBulkKwsInput] = useState<string>('');
  const [kwPriority, setKwPriority] = useState<number>(8);
  const [showBulkKw, setShowBulkKw] = useState<boolean>(false);

  // Announcement Management
  const [newAnnTitle, setNewAnnTitle] = useState<string>('');
  const [newAnnMsg, setNewAnnMsg] = useState<string>('');
  const [newAnnType, setNewAnnType] = useState<'info' | 'warning' | 'success'>('info');

  // Status message
  const [toast, setToast] = useState<string | null>(null);
  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Metrics
  const nonAdminCustomers = customers.filter((c) => c.role !== 'admin');
  const activeCustomersCount = nonAdminCustomers.filter(
    (c) => c.isActive && (c.isLifetime || !c.expiryDate || new Date(c.expiryDate) > new Date())
  ).length;
  const expiredCustomersCount = nonAdminCustomers.length - activeCustomersCount;

  // Filtered customers
  const filteredCustomers = nonAdminCustomers.filter((c) => {
    if (!customerSearch) return true;
    const q = customerSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  // --- Handlers ---
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, {
          name: custName,
          email: custEmail,
          phone: custPhone,
          maxBusinesses: custMaxBiz,
          isLifetime: custIsLifetime,
          expiryDate: custIsLifetime ? undefined : custExpiry,
        });
        notify('Customer updated successfully');
      } else {
        // Send invite & generate onboarding credentials via server endpoint
        const res = await api.inviteCustomer({
          email: custEmail.trim(),
          fullName: custName.trim(),
          phone: custPhone.trim() || undefined,
          businessLimit: custMaxBiz,
          expiryDate: custIsLifetime ? null : custExpiry || null,
          password: custPassword.trim() || undefined,
        });

        if (res.credentials) {
          setOnboardingCredentials(res.credentials);
        }
        notify(`Customer ${custName} provisioned! Onboarding credentials generated.`);
      }
      setShowAddCustomerModal(false);
      setEditingCustomer(null);
      resetCustomerForm();
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Error saving customer');
    }
  };

  const resetCustomerForm = () => {
    setCustName('');
    setCustEmail('');
    setCustPhone('');
    setCustPassword('');
    setCustMaxBiz(3);
    setCustIsLifetime(false);
    setCustExpiry('');
  };

  const handleEditCustomer = (c: CustomerAccount) => {
    setEditingCustomer(c);
    setCustName(c.name);
    setCustEmail(c.email);
    setCustPhone(c.phone || '');
    setCustMaxBiz(c.maxBusinesses);
    setCustIsLifetime(c.isLifetime);
    setCustExpiry(c.expiryDate ? c.expiryDate.split('T')[0] : '');
    setShowAddCustomerModal(true);
  };

  const handleToggleCustomerActive = async (c: CustomerAccount) => {
    try {
      await api.updateCustomer(c.id, { isActive: !c.isActive });
      onRefreshData();
      notify(`Customer ${c.isActive ? 'deactivated' : 'activated'}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.createCategory(newCatName.trim(), newCatDesc.trim());
      setNewCatName('');
      setNewCatDesc('');
      notify('Category added');
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Error creating category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to remove this category?')) return;
    await api.deleteCategory(id);
    onRefreshData();
    notify('Category removed');
  };

  const handleAddMasterKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (showBulkKw) {
        if (!bulkKwsInput.trim()) return;
        await api.addMasterKeyword({
          category: selectedKwCat,
          language: selectedKwLang,
          priority: kwPriority,
          bulkKeywords: bulkKwsInput,
        });
        setBulkKwsInput('');
        notify('Bulk keywords added successfully');
      } else {
        if (!newSingleKw.trim()) return;
        await api.addMasterKeyword({
          category: selectedKwCat,
          language: selectedKwLang,
          priority: kwPriority,
          keyword: newSingleKw.trim(),
        });
        setNewSingleKw('');
        notify('Master keyword added');
      }
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Error adding keyword');
    }
  };

  const handleToggleMasterKeyword = async (k: MasterKeyword) => {
    await api.toggleMasterKeyword(k.id, !k.isActive);
    onRefreshData();
  };

  const handleDeleteMasterKeyword = async (id: string) => {
    await api.deleteMasterKeyword(id);
    onRefreshData();
    notify('Keyword removed');
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle || !newAnnMsg) return;
    await api.createAnnouncement(newAnnTitle, newAnnMsg, newAnnType);
    setNewAnnTitle('');
    setNewAnnMsg('');
    notify('Broadcast announcement published');
    onRefreshData();
  };

  const handleDeleteAnnouncement = async (id: string) => {
    await api.deleteAnnouncement(id);
    onRefreshData();
    notify('Announcement removed');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-purple-600 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-300" />
          <span>{toast}</span>
        </div>
      )}

      {/* Super Admin Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white font-black shadow-xs">
            <Shield className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base text-white tracking-tight">
                Super Admin Console
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                Root
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block">{admin.email}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 font-semibold px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Navigation Sub-Tabs */}
      <div className="bg-slate-950/80 border-b border-slate-800 px-4 sm:px-6 overflow-x-auto">
        <div className="flex gap-1 py-2 min-w-max">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'customers', label: `Customers (${nonAdminCustomers.length})`, icon: Users },
            { id: 'businesses', label: `Businesses (${businesses.length})`, icon: Building2 },
            { id: 'categories', label: `Categories (${categories.length})`, icon: FolderTree },
            { id: 'keywords', label: `Master Keywords (${masterKeywords.length})`, icon: Tag },
            { id: 'feedback', label: `Feedback (${feedbackList.length})`, icon: MessageSquare },
            { id: 'announcements', label: `Announcements (${announcements.length})`, icon: Bell },
            { id: 'audit-logs', label: `Audit Logs (${auditLogs.length})`, icon: History },
            { id: 'settings', label: 'System & Supabase', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* VIEW 1: SUPER ADMIN DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white">Platform System Statistics</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-tenant SaaS operational overview across all customer tiers and categories.
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Total Customers</span>
                <div className="text-2xl font-black text-white mt-1">{nonAdminCustomers.length}</div>
                <span className="text-[10px] text-emerald-400 mt-0.5 block">
                  {activeCustomersCount} Active • {expiredCustomersCount} Expired
                </span>
              </div>

              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Total Businesses</span>
                <div className="text-2xl font-black text-white mt-1">{businesses.length}</div>
                <span className="text-[10px] text-purple-400 mt-0.5 block">
                  Across {categories.length} categories
                </span>
              </div>

              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Master Keywords</span>
                <div className="text-2xl font-black text-white mt-1">{masterKeywords.length}</div>
                <span className="text-[10px] text-purple-400 mt-0.5 block">
                  EN, HI & GU pools
                </span>
              </div>

              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Private Feedback</span>
                <div className="text-2xl font-black text-white mt-1">{feedbackList.length}</div>
                <span className="text-[10px] text-amber-400 mt-0.5 block">
                  Confidential submissions
                </span>
              </div>
            </div>

            {/* Quick Actions & Recent Customers */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-slate-800/80 rounded-2xl border border-slate-700 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Recent Customer Accounts
                  </h3>
                  <button
                    onClick={() => setActiveTab('customers')}
                    className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                  >
                    View All &rarr;
                  </button>
                </div>

                <div className="space-y-2">
                  {nonAdminCustomers.slice(0, 5).map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-xs text-white flex items-center gap-2">
                          <span>{c.name}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                              c.isActive
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {c.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">{c.email}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onImpersonate(c.id)}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Impersonate</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Admin Actions */}
              <div className="lg:col-span-4 bg-slate-800/80 rounded-2xl border border-slate-700 p-5 space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Quick Actions</h3>
                <button
                  onClick={() => {
                    resetCustomerForm();
                    setShowAddCustomerModal(true);
                  }}
                  className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Customer Account</span>
                </button>
                <button
                  onClick={() => setActiveTab('keywords')}
                  className="w-full py-2.5 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Tag className="w-4 h-4" />
                  <span>Bulk Add Master Keywords</span>
                </button>
                <button
                  onClick={() => setActiveTab('announcements')}
                  className="w-full py-2.5 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  <span>Publish System Notice</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: CUSTOMERS MANAGEMENT */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span>Customer Accounts & Tenant Quotas</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Provision customer logins, configure business quotas, expiry dates, or impersonate.
                </p>
              </div>

              <button
                onClick={() => {
                  resetCustomerForm();
                  setEditingCustomer(null);
                  setShowAddCustomerModal(true);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Customer</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers by name or email..."
                className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            {/* Customer Table */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-700">
                    <tr>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Quota Limit</th>
                      <th className="p-3.5">Subscription Expiry</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {filteredCustomers.map((c) => {
                      const bizCount = businesses.filter((b) => b.customerId === c.id).length;
                      return (
                        <tr key={c.id} className="hover:bg-slate-750 transition">
                          <td className="p-3.5">
                            <div className="font-bold text-white">{c.name}</div>
                            <div className="text-[11px] text-slate-400">{c.email}</div>
                            {c.phone && <div className="text-[10px] text-slate-500">{c.phone}</div>}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                c.isActive
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {c.isActive ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-white">{bizCount}</span>
                            <span className="text-slate-400"> / {c.maxBusinesses} businesses</span>
                          </td>
                          <td className="p-3.5">
                            {c.isLifetime ? (
                              <span className="text-amber-400 font-bold">Lifetime Access</span>
                            ) : (
                              <span>
                                {c.expiryDate
                                  ? new Date(c.expiryDate).toLocaleDateString()
                                  : 'Active'}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => onImpersonate(c.id)}
                              className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
                              title="Audited Impersonation"
                            >
                              Impersonate
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditCustomer(c)}
                              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs cursor-pointer"
                              title="Edit Customer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleCustomerActive(c)}
                              className={`px-2 py-1 rounded-lg text-xs cursor-pointer ${
                                c.isActive
                                  ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40'
                              }`}
                            >
                              {c.isActive ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: GLOBAL BUSINESSES */}
        {activeTab === 'businesses' && (
          <div className="space-y-6">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              <span>Platform Businesses ({businesses.length})</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {businesses.map((b) => (
                <div
                  key={b.id}
                  className="bg-slate-800/80 rounded-2xl border border-slate-700 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      {b.customCategory || b.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        b.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {b.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-white">{b.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-1">{b.tagline}</p>
                  <div className="text-[10px] font-mono text-purple-300 bg-slate-900 p-1.5 rounded truncate">
                    Slug: /{b.slug}
                  </div>

                  <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => onPreviewPublicPage(b.slug)}
                      className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Public Page</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] text-slate-500">Owner ID: {b.customerId.slice(-6)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 4: CATEGORIES MANAGEMENT */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-purple-400" />
                <span>Universal Business Categories ({categories.length})</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage default industries and create unlimited custom business classifications.
              </p>
            </div>

            {/* Add Category Form */}
            <form
              onSubmit={handleCreateCategory}
              className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Pet Care, Optometrist, Yoga Studio"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-600 bg-slate-900 text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="e.g. Specialized clinical and retail care"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-600 bg-slate-900 text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
                </button>
              </div>
            </form>

            {/* Categories List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-white flex items-center gap-1.5">
                      <span>{cat.name}</span>
                      {cat.isCustom && (
                        <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-bold">
                          Custom
                        </span>
                      )}
                    </div>
                    {cat.description && (
                      <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                        {cat.description}
                      </span>
                    )}
                  </div>

                  {cat.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 5: MASTER KEYWORDS */}
        {activeTab === 'keywords' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Tag className="w-5 h-5 text-purple-400" />
                  <span>Master Keyword Manager</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Category-level pool rotated into customer review pages. Supports English, Hindi, and Gujarati.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedKwCat}
                  onChange={(e) => setSelectedKwCat(e.target.value)}
                  className="text-xs font-semibold bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-purple-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedKwLang}
                  onChange={(e) => setSelectedKwLang(e.target.value as any)}
                  className="text-xs font-semibold bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-purple-500"
                >
                  <option value="en">English (en)</option>
                  <option value="hi">हिंदी (hi)</option>
                  <option value="gu">ગુજરાતી (gu)</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowBulkKw(!showBulkKw)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg cursor-pointer"
                >
                  {showBulkKw ? 'Single Add' : 'Bulk Import'}
                </button>
              </div>
            </div>

            {/* Keyword Add Input Form */}
            <form
              onSubmit={handleAddMasterKeyword}
              className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-3"
            >
              <div className="text-xs font-bold text-white uppercase tracking-wider">
                {showBulkKw
                  ? `Bulk Import Keywords for ${selectedKwCat} [${selectedKwLang.toUpperCase()}]`
                  : `Add Single Master Keyword for ${selectedKwCat} [${selectedKwLang.toUpperCase()}]`}
              </div>

              {showBulkKw ? (
                <div>
                  <textarea
                    rows={3}
                    value={bulkKwsInput}
                    onChange={(e) => setBulkKwsInput(e.target.value)}
                    placeholder="Enter keywords separated by commas or line breaks, e.g.:&#10;Friendly Staff&#10;Crispy Waffles&#10;Quick Service"
                    className="w-full text-xs p-3 rounded-xl border border-slate-600 bg-slate-900 text-white outline-none focus:ring-2 focus:ring-purple-500 font-sans"
                  />
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSingleKw}
                    onChange={(e) => setNewSingleKw(e.target.value)}
                    placeholder="e.g. Excellent Customer Care"
                    className="flex-1 text-xs p-2.5 rounded-xl border border-slate-600 bg-slate-900 text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Priority (1-10):</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={kwPriority}
                      onChange={(e) => setKwPriority(Number(e.target.value))}
                      className="w-14 text-xs p-2 rounded-lg border border-slate-600 bg-slate-900 text-white text-center"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                {showBulkKw ? 'Bulk Add to Category' : 'Save Master Keyword'}
              </button>
            </form>

            {/* Keywords in this category & language */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Active Keywords in {selectedKwCat} ({selectedKwLang.toUpperCase()})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {masterKeywords
                  .filter(
                    (k) =>
                      k.category.toLowerCase() === selectedKwCat.toLowerCase() &&
                      k.language === selectedKwLang
                  )
                  .map((k) => (
                    <div
                      key={k.id}
                      className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between"
                    >
                      <div className="truncate mr-2">
                        <span
                          className={`text-xs font-medium block truncate ${
                            k.isActive ? 'text-white' : 'line-through text-slate-500'
                          }`}
                        >
                          {k.keyword}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Priority: {k.priority}/10
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleMasterKeyword(k)}
                          className={`p-1 text-xs rounded ${
                            k.isActive ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                          title="Toggle Active"
                        >
                          {k.isActive ? 'Active' : 'Disabled'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMasterKeyword(k.id)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 6: GLOBAL FEEDBACK */}
        {activeTab === 'feedback' && (
          <div className="space-y-6">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              <span>Global Private Feedback ({feedbackList.length})</span>
            </h2>

            <div className="space-y-3">
              {feedbackList.map((fb) => {
                const biz = businesses.find((b) => b.id === fb.businessId);
                return (
                  <div
                    key={fb.id}
                    className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-300">
                        {biz?.name || 'Unknown Business'} ({fb.rating} ★)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(fb.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200">"{fb.message}"</p>
                    {fb.customerName && (
                      <span className="text-[11px] text-slate-400 block">
                        From: {fb.customerName} {fb.customerPhone ? `(${fb.customerPhone})` : ''}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 7: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-400" />
                <span>System Announcements</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Broadcast notices and updates displayed directly on all customer dashboards.
              </p>
            </div>

            <form
              onSubmit={handleCreateAnnouncement}
              className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-3 max-w-xl"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                  placeholder="e.g. Scheduled Maintenance or New Feature Update"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-600 bg-slate-900 text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Message *</label>
                <textarea
                  required
                  rows={2}
                  value={newAnnMsg}
                  onChange={(e) => setNewAnnMsg(e.target.value)}
                  placeholder="Details for the broadcast message..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-600 bg-slate-900 text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Type</label>
                <select
                  value={newAnnType}
                  onChange={(e) => setNewAnnType(e.target.value as any)}
                  className="text-xs p-2 rounded-lg border border-slate-600 bg-slate-900 text-white"
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                </select>
              </div>

              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Broadcast Announcement
              </button>
            </form>

            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-xs text-white">{ann.title}</h4>
                    <p className="text-xs text-slate-300 mt-0.5">{ann.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAnnouncement(ann.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 8: AUDIT LOGS */}
        {activeTab === 'audit-logs' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" />
                <span>Super Admin Audit Trail ({auditLogs.length})</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Immutable chronological log of privileged operations, impersonations, and setting changes.
              </p>
            </div>

            <div className="bg-slate-800/80 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="divide-y divide-slate-700/60 max-h-96 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-mono">
                          {log.action}
                        </span>
                        <span>{log.details}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">By {log.adminEmail}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 9: SYSTEM SETTINGS & SUPABASE GUIDE */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                <span>Application Configuration & Architecture</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                PostgreSQL schema, Row Level Security rules, and AI integration status.
              </p>
            </div>

            <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Database className="w-4 h-4" />
                <span>PostgreSQL & Supabase Multi-Tenant Engine</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                The database schema includes <code>profiles</code>, <code>businesses</code>, <code>master_keywords</code>, <code>business_keywords</code>, <code>private_feedback</code>, <code>qr_settings</code>, and <code>analytics_events</code> with strict Row Level Security (RLS) enforcement.
              </p>
              <div className="bg-slate-900 p-3 rounded-xl font-mono text-[11px] text-slate-400 border border-slate-800">
                SQL migrations are saved in: <code>/supabase/schema.sql</code> and <code>/supabase/rls.sql</code>.
              </div>
            </div>

            <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>Google Gemini API Status</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Protected server-side route <code>POST /api/ai/generate-drafts</code> uses modern <code>@google/genai</code> SDK and model <code>gemini-3.8-flash</code>.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-white">
                {editingCustomer ? 'Edit Customer Account' : 'Create New Customer'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddCustomerModal(false);
                  setEditingCustomer(null);
                }}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="Marcus Vance"
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="owner@business.com"
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {!editingCustomer && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Initial Password (Optional / Auto-generated if left empty)
                  </label>
                  <input
                    type="text"
                    value={custPassword}
                    onChange={(e) => setCustPassword(e.target.value)}
                    placeholder="e.g. Boost@2026 (or auto-generated)"
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Customer will use this password to sign in to their Customer Portal.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Max Businesses Limit</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={custMaxBiz}
                    onChange={(e) => setCustMaxBiz(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Subscription Expiry</label>
                  <input
                    type="date"
                    disabled={custIsLifetime}
                    value={custExpiry}
                    onChange={(e) => setCustExpiry(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isLifetime"
                  checked={custIsLifetime}
                  onChange={(e) => setCustIsLifetime(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
                <label htmlFor="isLifetime" className="text-slate-300 font-medium cursor-pointer">
                  Enable Lifetime Access (Never expires)
                </label>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {editingCustomer ? 'Save Customer Changes' : 'Create Customer & Issue Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Onboarding Credentials Modal */}
      {onboardingCredentials && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>Customer Onboarding Credentials Ready</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-xs">
              Account successfully provisioned for <strong className="text-white">{onboardingCredentials.fullName}</strong>. Share these login credentials with the business owner:
            </p>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5 font-mono text-[11px]">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Login Email:</span>
                <span className="text-white font-bold">{onboardingCredentials.email}</span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Password:</span>
                <span className="text-amber-400 font-bold bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/20">
                  {onboardingCredentials.temporaryPassword}
                </span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Business Quota:</span>
                <span className="text-purple-300 font-semibold">{onboardingCredentials.maxBusinesses} businesses</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Access Expiry:</span>
                <span className="text-slate-200">{onboardingCredentials.expiryDate}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const text = `LocalBoost AI Review - Customer Portal Login Credentials:\n\nEmail: ${onboardingCredentials.email}\nPassword: ${onboardingCredentials.temporaryPassword}\nBusiness Limit: ${onboardingCredentials.maxBusinesses}\nExpiry: ${onboardingCredentials.expiryDate}\n\nLogin at: ${window.location.origin}`;
                  navigator.clipboard.writeText(text);
                  notify('Onboarding credentials copied to clipboard!');
                }}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Onboarding Invitation Message</span>
              </button>

              <button
                type="button"
                onClick={() => setOnboardingCredentials(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
