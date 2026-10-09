import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabase, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify that the requester is an authenticated Super Admin
    const authSupabase = await createServerSupabase();
    const {
      data: { user: requesterUser },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !requesterUser) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const { data: requesterProfile } = await authSupabase
      .from('profiles')
      .select('id, email, role, is_active')
      .eq('id', requesterUser.id)
      .single();

    if (
      !requesterProfile ||
      requesterProfile.role !== 'super_admin' ||
      !requesterProfile.is_active
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admins can invite new customers.' },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { email, fullName, businessLimit = 3, expiryDate } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid customer email address is required.' },
        { status: 400 }
      );
    }

    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { error: 'Customer full name is required.' },
        { status: 400 }
      );
    }

    // 3. Initialize Privileged Service-Role Supabase Admin Client
    const adminSupabase = createAdminClient();

    // Determine the base URL for the invitation redirect
    const origin =
      request.headers.get('origin') ||
      request.nextUrl.origin ||
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';

    const redirectTo = `${origin}/set-password`;

    // 4. Send official invite email using Supabase Auth Admin API
    const { data: inviteData, error: inviteError } =
      await adminSupabase.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
        redirectTo,
        data: {
          full_name: fullName.trim(),
        },
      });

    if (inviteError) {
      return NextResponse.json(
        {
          error: `Supabase invitation failed: ${inviteError.message}`,
          details: inviteError,
        },
        { status: 400 }
      );
    }

    const invitedUserId = inviteData.user.id;

    // 5. Upsert customer profile with RBAC role, business limit & expiry date
    const { data: profileData, error: profileUpsertError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: invitedUserId,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        role: 'customer',
        business_limit: Number(businessLimit) || 3,
        expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
        invited_at: new Date().toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (profileUpsertError) {
      console.error('Failed to create customer profile record:', profileUpsertError);
    }

    // 6. Record in immutable admin_audit_logs table
    await adminSupabase.from('admin_audit_logs').insert({
      admin_id: requesterProfile.id,
      admin_email: requesterProfile.email,
      action: 'INVITE_CUSTOMER',
      target_type: 'CUSTOMER',
      target_id: invitedUserId,
      details: `Super Admin invited customer ${fullName} (${email}) with limit ${businessLimit} and expiry ${expiryDate || 'Unlimited'}`,
    });

    return NextResponse.json({
      success: true,
      message: `Invitation successfully sent to ${email}`,
      user: inviteData.user,
      profile: profileData,
    });
  } catch (error: any) {
    console.error('Customer invitation endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while inviting customer.' },
      { status: 500 }
    );
  }
}
