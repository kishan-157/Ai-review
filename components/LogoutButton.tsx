'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { LogOut } from 'lucide-react';

interface LogoutButtonProps {
  className?: string;
  showIcon?: boolean;
  label?: string;
}

export function LogoutButton({
  className = '',
  showIcon = true,
  label = 'Sign Out',
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${className || 'text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200'}`}
      title="Sign Out"
    >
      {showIcon && <LogOut className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
      <span>{loading ? 'Signing out...' : label}</span>
    </button>
  );
}
