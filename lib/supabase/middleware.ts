import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

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
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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
                     request.nextUrl.pathname.startsWith('/signup');
  const isSubscribePage = request.nextUrl.pathname.startsWith('/subscribe');
  const isOnboardingPage = request.nextUrl.pathname.startsWith('/onboarding');
  const isSuccessPage = request.nextUrl.pathname.startsWith('/subscription/success') ||
                        request.nextUrl.pathname.startsWith('/licenses/add/success');
  const isPublicRoute = request.nextUrl.pathname === '/' || 
                        request.nextUrl.pathname.startsWith('/contractor-access') ||
                        request.nextUrl.pathname.startsWith('/contractor-onboard') ||
                        request.nextUrl.pathname.startsWith('/debug');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  // Skip middleware for API routes - they handle their own auth and return JSON
  if (isApiRoute) {
    return supabaseResponse;
  }

  // Allow access to public routes without authentication
  if (isPublicRoute) {
    return supabaseResponse;
  }

  // Allow access to success pages without additional checks
  if (isSuccessPage) {
    return supabaseResponse;
  }

  // If not authenticated, redirect to login (except for auth pages)
  if (!user && !isAuthPage && !isSubscribePage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login/signup pages
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    // Check if authenticated user has organization before redirecting
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profile?.organization_id) {
      // Has organization - check subscription and onboarding status
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('organization_id', profile.organization_id)
        .single();

      if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
        // Check onboarding status
        const { data: org } = await supabase
          .from('organizations')
          .select('onboarding_completed')
          .eq('id', profile.organization_id)
          .single();

        if (org?.onboarding_completed) {
          const url = request.nextUrl.clone();
          url.pathname = '/dashboard';
          return NextResponse.redirect(url);
        } else {
          const url = request.nextUrl.clone();
          url.pathname = '/onboarding';
          return NextResponse.redirect(url);
        }
      } else {
        // Has organization but no active subscription - redirect to dashboard
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    } else {
      // No organization - redirect to subscribe
      const url = request.nextUrl.clone();
      url.pathname = '/subscribe';
      return NextResponse.redirect(url);
    }
  }

  // Handle subscribe page - require authentication
  if (isSubscribePage) {
    if (!user) {
      // Not authenticated - redirect to signup
      const url = request.nextUrl.clone();
      url.pathname = '/signup';
      return NextResponse.redirect(url);
    }
    // Authenticated - allow access to subscribe page
    return supabaseResponse;
  }

  // Handle onboarding page - require authentication and organization
  if (isOnboardingPage) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      // No organization - redirect to subscribe
      const url = request.nextUrl.clone();
      url.pathname = '/subscribe';
      return NextResponse.redirect(url);
    }
    
    return supabaseResponse;
  }

  // For all other protected routes, check if user has organization
  if (user && !isAuthPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      // No organization - redirect to subscribe
      const url = request.nextUrl.clone();
      url.pathname = '/subscribe';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
