import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Auth Callback Route
 * 
 * This route handles Supabase auth callbacks, including email verification.
 * When a user clicks the email verification link, Supabase redirects here
 * with tokens in the URL. This route processes those tokens and sets up
 * the session, then redirects to the appropriate page.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const errorParam = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const next = requestUrl.searchParams.get('next') || '/login?verified=true';

  // Handle errors from Supabase
  if (errorParam) {
    console.error('Auth callback error:', errorParam, errorDescription);
    const errorUrl = new URL('/login', requestUrl.origin);
    errorUrl.searchParams.set('error', 'verification_failed');
    if (errorDescription) {
      errorUrl.searchParams.set('error_description', errorDescription);
    }
    return NextResponse.redirect(errorUrl.toString());
  }

  if (code) {
    const supabase = await createClient();
    
    try {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Error exchanging code for session:', error);
        // Redirect to login with error message
        const errorUrl = new URL('/login', requestUrl.origin);
        errorUrl.searchParams.set('error', 'verification_failed');
        errorUrl.searchParams.set('error_description', error.message);
        return NextResponse.redirect(errorUrl.toString());
      }

      if (data.session) {
        console.log('Session created successfully for user:', data.session.user.id);
      }

      // Success - redirect to the next page (usually login with verified=true)
      return NextResponse.redirect(new URL(next, requestUrl.origin).toString());
    } catch (err: any) {
      console.error('Unexpected error in auth callback:', err);
      const errorUrl = new URL('/login', requestUrl.origin);
      errorUrl.searchParams.set('error', 'verification_failed');
      errorUrl.searchParams.set('error_description', err.message || 'An unexpected error occurred');
      return NextResponse.redirect(errorUrl.toString());
    }
  }

  // No code provided - redirect to login
  console.warn('Auth callback called without code parameter');
  return NextResponse.redirect(new URL('/login', requestUrl.origin).toString());
}
