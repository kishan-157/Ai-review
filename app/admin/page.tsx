'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import {
  Users,
  Building2,
  UserCheck,
  Power,
  Search,
  CheckCircle,
  Shield,
  Clock,
  Plus,
  Mail,
  Send,
  Edit2,
  AlertCircle,
  Calendar,
} from 'lucide-react';

interface ProfileItem {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'customer';
  business_limit: number;
  expiry_date?: string;
  invited_at?: string;
  is_active: boolean;
  created_at: string;
}

export default function SuperAdminDashboard() {
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [totalBusinesses, setTotalBusinesses] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Invite Customer Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteBusinessLimit, setInviteBusinessLimit] = useState(3);
  const [inviteExpiryDate, setInviteExpiryDate] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Edit Customer Modal
  const [editingProfile, setEditingProfile] = useState<ProfileItem | null>(null);
  const [editBusinessLimit, setEditBusinessLimit] = useState(3);
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all profiles
      const { data: profileList, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (pError) throw pError;
      setProfiles(profileList || []);

      // 2. Fetch total businesses count
      const { count, error: bError } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });

      if (bError) throw bError;
      setTotalBusinesses(count || 0);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteFullName) return;

    setInviteSubmitting(true);
    try {
      const res = await fetch('/api/admin/invite-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          fullName: inviteFullName.trim(),
          businessLimit: Number(inviteBusinessLimit) || 3,
          expiryDate: inviteExpiryDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invite');
      }

      setActionMessage(`Invitation successfully sent to ${inviteEmail}!`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteFullName('');
      setInviteBusinessLimit(3);
      setInviteExpiryDate('');
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Error sending invite');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;

    setEditSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          business_limit: Number(editBusinessLimit),
          expiry_date: editExpiryDate ? new Date(editExpiryDate).toISOString() : null,
        })
        .eq('id', editingProfile.id);

      if (error) throw error;

      setActionMessage(`Customer limits for ${editingProfile.full_name} updated!`);
      setEditingProfile(null);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update customer');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleToggleCustomerStatus = async (customer: ProfileItem) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !customer.is_active })
        .eq('id', customer.id);

      if (error) throw error;

      setProfiles((prev) =>
        prev.map((p) => (p.id === customer.id ? { ...p, is_active: !p.is_active } : p))
      );

      setActionMessage(
        `Customer ${customer.full_name} has been ${customer.is_active ? 'deactivated' : 'activated'}.`
      );
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleImpersonate = async (customerId: string) => {
    setImpersonatingId(customerId);
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Impersonation request failed');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to start impersonation');
    } finally {
      setImpersonatingId(null);
    }
  };

  // Helper to determine customer status: Active, Expired, Pending Invite
  const getCustomerStatus = (c: ProfileItem): 'Active' | 'Expired' | 'Pending Invite' | 'Disabled' => {
    if (!c.is_active) return 'Disabled';
    if (c.expiry_date && new Date(c.expiry_date) < new Date()) return 'Expired';
    if (c.invited_at && (!c.created_at || c.created_at === c.invited_at)) return 'Pending Invite';
    return 'Active';
  };

  const customerList = profiles.filter((p) => p.role === 'customer');
  const activeCount = customerList.filter((p) => getCustomerStatus(p) === 'Active').length;
  const expiredCount = customerList.filter((p) => getCustomerStatus(p) === 'Expired').length;
  const pendingCount = customerList.filter((p) => getCustomerStatus(p) === 'Pending Invite').length;

  const filteredCustomers = customerList.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionMessage && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Customers</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{customerList.length}</div>
          <span className="text-[11px] text-emerald-400 mt-1 block">
            {activeCount} Active • {expiredCount} Expired • {pendingCount} Pending
          </span>
        </div>

        <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Businesses</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalBusinesses}</div>
          <span className="text-[11px] text-purple-300 mt-1 block">Across all tenant accounts</span>
        </div>

        <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Invites & Onboarding</span>
            <Mail className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-emerald-400 mt-1">SMTP Automated</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Magic Link Set-Password</span>
        </div>

        <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Audit Security</span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-base font-bold text-white mt-1">RLS Protected</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Strict Tenant Isolation</span>
        </div>
      </div>

      {/* Customer Management Section */}
      <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Customer Accounts & Tenant Access
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Invite customers via email, adjust business quotas and expiry dates, or impersonate their workspace.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Customer</span>
            </button>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-600 bg-slate-900 text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-700">
              <tr>
                <th className="p-3.5">Customer Name & Email</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Business Limit</th>
                <th className="p-3.5">Access Expiry Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 bg-slate-850">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Loading customer records from Supabase...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const status = getCustomerStatus(customer);
                  return (
                    <tr key={customer.id} className="hover:bg-slate-800/70 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-white">{customer.full_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{customer.email}</div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            status === 'Active'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : status === 'Expired'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : status === 'Pending Invite'
                              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              status === 'Active'
                                ? 'bg-emerald-400'
                                : status === 'Expired'
                                ? 'bg-amber-400'
                                : status === 'Pending Invite'
                                ? 'bg-sky-400'
                                : 'bg-rose-400'
                            }`}
                          />
                          <span>{status}</span>
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-white">{customer.business_limit || 3}</span>
                        <span className="text-slate-400"> locations max</span>
                      </td>
                      <td className="p-3.5">
                        {customer.expiry_date ? (
                          <span>{new Date(customer.expiry_date).toLocaleDateString()}</span>
                        ) : (
                          <span className="text-slate-400 italic">No Expiry (Lifetime)</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        {/* Edit Limits Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProfile(customer);
                            setEditBusinessLimit(customer.business_limit || 3);
                            setEditExpiryDate(
                              customer.expiry_date ? customer.expiry_date.split('T')[0] : ''
                            );
                          }}
                          className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                          title="Edit Expiry & Business Limit"
                        >
                          Edit
                        </button>

                        {/* Audited Impersonation Button */}
                        <button
                          type="button"
                          onClick={() => handleImpersonate(customer.id)}
                          disabled={impersonatingId === customer.id || !customer.is_active}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50"
                          title="Impersonate Customer Dashboard (Logged to Audit Table)"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{impersonatingId === customer.id ? 'Connecting...' : 'Impersonate'}</span>
                        </button>

                        {/* Enable / Disable Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleCustomerStatus(customer)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                            customer.is_active
                              ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{customer.is_active ? 'Disable' : 'Enable'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE CUSTOMER & SEND INVITE MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-400" />
                <span>Create & Invite Customer</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Customer Email *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="owner@company.com"
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  placeholder="e.g. Marcus Vance"
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Business Limit (Number)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={inviteBusinessLimit}
                    onChange={(e) => setInviteBusinessLimit(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Access Expiry Date</label>
                  <input
                    type="date"
                    value={inviteExpiryDate}
                    onChange={(e) => setInviteExpiryDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-slate-300 text-[11px] leading-relaxed">
                <strong>Onboarding Flow:</strong> Supabase Auth Admin will dispatch an invite email. When the customer opens the link, they are routed to <code>/set-password</code> to establish their password and enter their dashboard.
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
                >
                  {inviteSubmitting ? (
                    <span>Sending Invite via Supabase...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Invite</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editingProfile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-white">
                Edit Customer: {editingProfile.full_name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Business Limit</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={editBusinessLimit}
                  onChange={(e) => setEditBusinessLimit(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Access Expiry Date</label>
                <input
                  type="date"
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Leave blank for Lifetime Unlimited Access
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition cursor-pointer"
                >
                  {editSubmitting ? 'Saving Changes...' : 'Save Customer Limits'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
