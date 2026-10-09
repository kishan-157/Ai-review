import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { cookies } from 'next/headers';
import { LogoutButton } from '../../components/LogoutButton';
import { Building2, ShieldAlert, Sparkles, User, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const cookieStore = await cookies();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

  // Fetch logged in profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    redirect('/login?error=Account deactivated');
  }

  // Check if this is an impersonation session by Super Admin
  const impersonatedCustomerId = cookieStore.get('impersonate_customer_id')?.value;
  const isImpersonating = Boolean(profile.role === 'super_admin' && impersonatedCustomerId);

  // If super_admin without impersonation, redirect to admin
  if (profile.role === 'super_admin' && !isImpersonating) {
    redirect('/admin');
  }

  // If impersonating, fetch the impersonated customer's name
  let targetCustomerName = profile.full_name;
  if (isImpersonating && impersonatedCustomerId) {
    const { data: targetCust } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', impersonatedCustomerId)
      .single();
    if (targetCust) {
      targetCustomerName = `${targetCust.full_name} (${targetCust.email})`;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Impersonation Top Bar */}
      {isImpersonating && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>
              IMPERSONATION ACTIVE: Viewing tenant dashboard for <u>{targetCustomerName}</u>. All actions are logged.
            </span>
          </div>
          <form action="/api/admin/impersonate?exit=true" method="POST">
            <button
              type="submit"
              className="px-3 py-1 bg-slate-950 text-white rounded hover:bg-slate-850 transition cursor-pointer font-bold text-xs"
            >
              Exit Impersonation & Return to Admin &rarr;
            </button>
          </form>
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
              Customer Portal • {targetCustomerName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-100">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Multi-Tenant Active</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {children}
      </main>
    </div>
  );
}
