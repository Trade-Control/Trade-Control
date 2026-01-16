'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSafeSupabaseClient();
  
  // Get returnUrl, verified status, and error from query params
  const returnUrl = searchParams.get('returnUrl');
  const verified = searchParams.get('verified');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  
  // Check if user is already authenticated (e.g., after email verification)
  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false);
      return;
    }

    const checkSession = async () => {
      try {
        // First, check if there are auth tokens in the URL hash (from email verification)
        // Supabase includes tokens in the hash like #access_token=...&type=recovery
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hasAuthTokens = hashParams.has('access_token') || hashParams.has('code');
        
        if (hasAuthTokens) {
          // Get session to process the tokens
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Error processing auth tokens:', sessionError);
            setError('Failed to verify email. Please try logging in manually.');
            setCheckingSession(false);
            // Clear the hash from URL
            window.history.replaceState({}, '', window.location.pathname + window.location.search);
            return;
          }
          
          // Clear the hash from URL after processing
          if (session) {
            window.history.replaceState({}, '', window.location.pathname + window.location.search);
          }
        }
        
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (user && !authError) {
          // User is authenticated - redirect them appropriately
          console.log('User already authenticated, redirecting...');
          
          // Ensure profile exists
          try {
            await fetch('/api/auth/ensure-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            });
          } catch (e) {
            console.warn('Failed to ensure profile:', e);
          }

          // Check if user has an organization
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
              const { data: org } = await supabase
                .from('organizations')
                .select('onboarding_completed')
                .eq('id', profile.organization_id)
                .single();

              if (org?.onboarding_completed) {
                router.push('/dashboard');
              } else {
                router.push('/onboarding');
              }
            } else {
              router.push('/dashboard');
            }
          } else {
            // No organization - redirect to subscribe
            if (returnUrl) {
              router.push(returnUrl);
            } else {
              router.push('/subscribe');
            }
          }
        } else {
          // Not authenticated - show login form
          setCheckingSession(false);
          
          // Show success message if they just verified
          if (verified === 'true') {
            // Clear the verified param from URL
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('verified');
            window.history.replaceState({}, '', newUrl.toString());
          }
          
          // Clear error params from URL after displaying
          if (errorParam) {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('error');
            newUrl.searchParams.delete('error_description');
            window.history.replaceState({}, '', newUrl.toString());
          }
        }
      } catch (err) {
        console.error('Error checking session:', err);
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [supabase, router, returnUrl, verified]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!supabase) {
      setError('Configuration error. Please refresh the page.');
      return;
    }
    
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Ensure profile exists (handles users who signed up before the fix or if trigger failed)
        // SECURITY: The API extracts userId from the JWT session, not from request body
        try {
          const ensureResponse = await fetch('/api/auth/ensure-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}), // Empty body - API uses JWT session for user identification
          });

          if (!ensureResponse.ok) {
            console.warn('Failed to ensure profile, continuing anyway');
          } else {
            const ensureData = await ensureResponse.json();
            if (ensureData.profileCreated) {
              console.log('Profile was created during login');
            }
          }
        } catch (ensureError) {
          console.warn('Error ensuring profile:', ensureError);
          // Don't block login if this fails
        }

        // Check if user has an organization
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', data.user.id)
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
              router.push('/dashboard');
            } else {
              router.push('/onboarding');
            }
          } else {
            // Has organization but no active subscription
            router.push('/dashboard');
          }
        } else {
          // No organization - check if we have a returnUrl
          if (returnUrl) {
            router.push(returnUrl);
          } else {
            router.push('/subscribe');
          }
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Provide more helpful error messages
      let errorMessage = error.message || 'Failed to log in';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email address before logging in. Check your inbox for the verification link.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-[#1a7aad] items-center justify-center p-12">
        <div className="text-white text-center max-w-md">
          <div className="mb-8 bg-white/95 rounded-xl p-6 shadow-lg">
            <Link href="/" className="block hover:opacity-90 transition-opacity">
              <Image 
                src="/logo.png" 
                alt="Trade Control" 
                width={280} 
                height={93} 
                className="mx-auto"
                priority
              />
            </Link>
          </div>
          <h2 className="text-3xl font-bold mb-4">Welcome Back</h2>
          <p className="text-lg text-white/90">
            Professional business management for Australian tradespeople
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
              <Image 
                src="/logo.png" 
                alt="Trade Control" 
                width={200} 
                height={67} 
                className="mx-auto"
                priority
              />
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Log in to your account</h1>
            <p className="text-gray-600">Enter your credentials to access Trade Control</p>
          </div>

          {checkingSession && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm mb-4">
              Checking your session...
            </div>
          )}

          {verified === 'true' && !checkingSession && !errorParam && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
              ✓ Email verified successfully! Please log in to continue.
            </div>
          )}

          {errorParam === 'verification_failed' && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {errorDescription || 'Email verification failed. Please try logging in manually or request a new verification email.'}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-gray-900"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-gray-900"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || checkingSession}
              className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? 'Logging in...' : checkingSession ? 'Checking...' : 'Log In'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/signup" className="text-primary hover:text-primary-hover font-semibold transition">
                Sign up for free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
