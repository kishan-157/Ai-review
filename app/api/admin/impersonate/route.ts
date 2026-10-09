import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const searchParams = request.nextUrl.searchParams;

  // 1. Authenticate requester
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
  }

  // 2. Verify Super Admin role
  const { data: requesterProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !requesterProfile || requesterProfile.role !== 'super_admin' || !requesterProfile.is_active) {
    return NextResponse.json(
      { error: 'Forbidden: Super Admin privileges required' },
      { status: 403 }
    );
  }

  // Check for exit impersonation request
  if (searchParams.get('exit') === 'true') {
    // Clear impersonation cookie
    cookieStore.delete('impersonate_customer_id');

    // Audit log impersonation end
    await supabase.from('admin_audit_logs').insert({
      admin_id: requesterProfile.id,
      admin_email: requesterProfile.email,
      action: 'EXIT_IMPERSONATION',
      target_type: 'CUSTOMER',
      details: 'Super Admin exited customer impersonation session',
    });

    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // 3. Parse customerId from body
  let customerId: string | null = null;
  try {
    const body = await request.json();
    customerId = body.customerId;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!customerId) {
    return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
  }

  // 4. Verify target customer exists
  const { data: targetCustomer, error: targetError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active')
    .eq('id', customerId)
    .single();

  if (targetError || !targetCustomer) {
    return NextResponse.json({ error: 'Target customer profile not found' }, { status: 404 });
  }

  // 5. Log action in admin_audit_logs table
  const { error: auditError } = await supabase.from('admin_audit_logs').insert({
    admin_id: requesterProfile.id,
    admin_email: requesterProfile.email,
    action: 'IMPERSONATE_CUSTOMER',
    target_type: 'CUSTOMER',
    target_id: targetCustomer.id,
    details: `Super Admin ${requesterProfile.email} initiated impersonation of ${targetCustomer.full_name} (${targetCustomer.email})`,
  });

  if (auditError) {
    console.error('Audit log insertion warning:', auditError);
  }

  // 6. Set impersonation cookie
  cookieStore.set('impersonate_customer_id', targetCustomer.id, {
    path: '/',
    httpOnly: false, // Accessible by client layout for banner and business filtering
    sameSite: 'lax',
    maxAge: 3600 * 4, // 4 hours
  });

  return NextResponse.json({
    success: true,
    message: `Impersonating customer ${targetCustomer.full_name}`,
    customer: targetCustomer,
  });
}
