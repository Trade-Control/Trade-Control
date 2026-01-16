'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

function SignupForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailVerificationNotice, setShowEmailVerificationNotice] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      // Use client-side signUp - this automatically triggers Supabase's verification email
      const supabase = createClient();
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Pass user metadata - the database trigger will use this to create the profile
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
          },
          // Redirect URL after email verification
          emailRedirectTo: `${window.location.origin}/login?verified=true`,
        },
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        console.error('Error details:', {
          message: signUpError.message,
          status: signUpError.status,
          name: signUpError.name,
        });
        
        // Handle specific error types
        if (signUpError.message?.includes('already registered') || 
            signUpError.message?.includes('already been registered')) {
          setError('This email is already registered. Please try logging in instead.');
        } else if (signUpError.message?.includes('valid email')) {
          setError('Please enter a valid email address.');
        } else if (signUpError.message?.includes('password')) {
          setError('Password must be at least 6 characters long.');
        } else if (signUpError.message?.includes('rate limit')) {
          setError('Too many signup attempts. Please wait a moment and try again.');
        } else if (signUpError.message?.includes('Database error') || 
                   signUpError.message?.includes('database') ||
                   signUpError.message?.includes('finding user') ||
                   (signUpError as any).code === 'unexpected_failure') {
          // Database error - likely orphaned/duplicate identity records
          setError(
            'Database error during signup. This is usually caused by orphaned identity records. ' +
            'Please run the SQL cleanup script "FIX_IDENTITY_DUPLICATES_AGGRESSIVE.sql" in Supabase Dashboard → SQL Editor, ' +
            'then try signing up again.'
          );
        } else {
          setError(signUpError.message || 'Failed to create account. Please try again.');
        }
        return;
      }

      // Check if email confirmation is required
      if (data?.user && !data.user.confirmed_at) {
        // User created but needs email verification
        console.log('Signup successful, verification email sent:', data.user.email);
        setSignupEmail(email);
        setShowEmailVerificationNotice(true);
      } else if (data?.user?.confirmed_at) {
        // Email already confirmed (shouldn't happen for new signups, but handle it)
        console.log('User already confirmed, redirecting to login');
        router.push('/login');
      } else {
        // Fallback - show verification notice
        setSignupEmail(email);
        setShowEmailVerificationNotice(true);
      }

    } catch (error: any) {
      console.error('Signup error:', error);
      setError('Network error. Please check your connection and try again.');
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
          <h2 className="text-3xl font-bold mb-4">Start Managing Your Business Today</h2>
          <p className="text-lg text-white/90">
            Join thousands of Australian tradespeople using Trade Control to streamline their operations
          </p>
        </div>
      </div>

      {/* Right side - Signup Form */}
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h1>
            <p className="text-gray-600">Get started with Trade Control in minutes</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-gray-900"
                  placeholder="John"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-gray-900"
                  placeholder="Doe"
                />
              </div>
            </div>

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
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-gray-900"
                placeholder="+61 400 000 000"
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
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-gray-900"
                placeholder="Re-enter your password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {showEmailVerificationNotice && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                      Step 3: Verify Your Email Address
                    </h3>
                    <p className="text-sm text-blue-800 mb-3">
                      We've sent a verification email to <strong>{signupEmail}</strong>. Please check your inbox and click the verification link to activate your account.
                    </p>
                    <p className="text-sm text-blue-700 mb-4">
                      <strong>Why verify?</strong> We need to verify your email address before you can set up billing and access your account. This keeps your account secure.
                    </p>
                    <p className="text-sm text-blue-700 mb-4">
                      <strong>Next steps:</strong> After verifying your email, log in to complete your subscription setup and start your 14-day free trial.
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          router.push('/login');
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Go to Login
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEmailVerificationNotice(false);
                          setEmail('');
                          setPhone('');
                          setPassword('');
                          setConfirmPassword('');
                          setFirstName('');
                          setLastName('');
                        }}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Start Over
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!showEmailVerificationNotice && (
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            )}
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:text-primary-hover font-semibold transition">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return <SignupForm />;
}
