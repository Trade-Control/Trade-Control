import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Check subscription status for dashboard routes (after authentication check)
  const path = request.nextUrl.pathname
  const isDashboardRoute = path.startsWith('/dashboard') || 
                           path.startsWith('/jobs') || 
                           path.startsWith('/quotes') || 
                           path.startsWith('/invoices') ||
                           path.startsWith('/contacts') ||
                           path.startsWith('/inventory') ||
                           path.startsWith('/contractors') ||
                           path.startsWith('/reports') ||
                           path.startsWith('/settings') ||
                           path.startsWith('/audit') ||
                           path.startsWith('/licenses') ||
                           path.startsWith('/travel-tracking')

  // Skip subscription check for certain routes
  const skipSubscriptionCheck = path.startsWith('/auth/') || 
                                 path.startsWith('/onboarding') ||
                                 path.startsWith('/subscription/') ||
                                 path === '/' ||
                                 !isDashboardRoute

  if (user && isDashboardRoute && !skipSubscriptionCheck) {
    // Get user profile and check subscription
    const { data: profile } = await (supabase
      .from('profiles') as any)
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profile?.organization_id) {
      // Check if organization has valid subscription
      const { data: subscription } = await (supabase
        .from('subscriptions') as any)
        .select('status')
        .eq('organization_id', profile.organization_id)
        .maybeSingle()

      // Redirect if no subscription or invalid status
      if (!subscription) {
        console.log('No subscription found for user, redirecting to checkout')
        return NextResponse.redirect(new URL('/auth/checkout', request.url))
      }

      if (subscription.status === 'cancelled') {
        console.log('Subscription cancelled, redirecting to expired page')
        return NextResponse.redirect(new URL('/subscription/expired', request.url))
      }

      if (subscription.status === 'past_due') {
        // Allow access but with warning - redirect to subscription page
        if (!path.startsWith('/subscription/manage')) {
          console.log('Subscription past due, redirecting to manage page')
          return NextResponse.redirect(new URL('/subscription/manage', request.url))
        }
      }
    } else if (profile && !profile.organization_id) {
      // User has no organization, redirect to checkout
      console.log('User has no organization, redirecting to checkout')
      return NextResponse.redirect(new URL('/auth/checkout', request.url))
    }
  }

  return response
}
