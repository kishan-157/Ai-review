import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { LogoutButton } from '../../components/LogoutButton';
import { Shield, Users, Building2, Tag, MessageSquare, History, Settings } from 'lucide-react';
import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/admin');
  }

  // Verify Super Admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'super_admin' || !profile.is_active) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Super Admin Nav */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white font-black shadow-xs">
            <Shield className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                Super Admin Console
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                RBAC Root
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block">{profile.email}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs text-slate-400 hover:text-white transition px-2 py-1"
          >
            Customer View &rarr;
          </Link>
          <LogoutButton className="text-slate-400 hover:text-rose-400 border-slate-800 hover:bg-slate-850" />
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {children}
      </main>
    </div>
  );
}
