'use client';

import { useState } from 'react';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = useSafeSupabaseClient();

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
        // Ensure profile exists (handles users who signed up before the fix)
        try {
          const ensureResponse = await fetch('/api/auth/ensure-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: data.user.id,
              email: data.user.email,
              firstName: data.user.user_metadata?.first_name,
              lastName: data.user.user_metadata?.last_name,
              phone: data.user.user_metadata?.phone,
            }),
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
          // No organization - redirect to subscribe with tier from metadata if available
          const tierFromMetadata = data.user.user_metadata?.selected_tier;
          if (tierFromMetadata) {
            router.push(`/subscribe?tier=${tierFromMetadata}`);
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
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? 'Logging in...' : 'Log In'}
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
