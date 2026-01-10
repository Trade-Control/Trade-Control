import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user is authenticated
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                     request.nextUrl.pathname.startsWith('/signup') ||
                     request.nextUrl.pathname.startsWith('/subscribe') ||
                     request.nextUrl.pathname.startsWith('/get-started');
  const isOrgSetup = request.nextUrl.pathname.startsWith('/organization-setup');
  const isPublicRoute = request.nextUrl.pathname === '/' || 
                        request.nextUrl.pathname.startsWith('/contractor-access');

  if (!user && !isAuthPage && !isPublicRoute) {
    // Redirect to login if not authenticated (except for auth pages and public routes)
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Only check organization for protected routes (not auth pages, org setup, or public routes)
  if (user && !isAuthPage && !isOrgSetup && !isPublicRoute) {
    // Check if user has an organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      // Redirect to subscribe if no organization (for new signups)
      const url = request.nextUrl.clone();
      url.pathname = '/subscribe';
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from login/signup pages (but allow subscribe)
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    // Check if authenticated user has organization before redirecting
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profile?.organization_id) {
      // Has organization - redirect to dashboard
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    } else {
      // No organization - redirect to subscribe
      const url = request.nextUrl.clone();
      url.pathname = '/subscribe';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
