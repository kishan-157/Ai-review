import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected route checking
  const isAdminRoute = pathname.startsWith('/admin');
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isAuthRoute = pathname.startsWith('/login');

  if (!user && (isAdminRoute || isDashboardRoute)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    // Fetch profile role from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    // Check if account has been disabled
    if (profile && !profile.is_active && (isAdminRoute || isDashboardRoute)) {
      const errorLoginUrl = new URL('/login', request.url);
      errorLoginUrl.searchParams.set('error', 'Your account has been deactivated. Contact support.');
      return NextResponse.redirect(errorLoginUrl);
    }

    const role = profile?.role; // 'super_admin' or 'customer'

    // If on /login, redirect logged-in users to their respective workspace
    if (isAuthRoute) {
      if (role === 'super_admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Role-based route enforcement
    if (isAdminRoute && role !== 'super_admin') {
      // Customer trying to access /admin -> redirect to /dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (isDashboardRoute && role === 'super_admin') {
      // Check if Super Admin is currently impersonating a customer
      const impersonatingId = request.cookies.get('impersonate_customer_id')?.value;
      if (!impersonatingId) {
        // Super Admin trying to access /dashboard directly without impersonation -> redirect to /admin
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }
  }

  return response;
}
