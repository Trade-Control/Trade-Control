'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { PRICING, formatPrice, calculateSubscriptionPrice } from '@/lib/services/stripe';
import { SubscriptionTier, OperationsProLevel } from '@/lib/types/database.types';

function SubscribeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSafeSupabaseClient();

  // Get tier from URL params or default to operations
  const tierParam = searchParams.get('tier') as SubscriptionTier;
  const [tier, setTier] = useState<SubscriptionTier>(tierParam || 'operations');
  const [operationsProLevel, setOperationsProLevel] = useState<OperationsProLevel | undefined>('scale');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Form state
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);


  // Check if user is authenticated on mount and has active subscription
  useEffect(() => {
    const checkAuthAndSubscription = async () => {
      if (!supabase) {
        setCheckingAuth(false);
        return;
      }

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (!user || authError) {
          // Not authenticated - redirect to signup
          console.log('User not authenticated, redirecting to signup');
          router.push(`/signup${tierParam ? `?tier=${tierParam}` : ''}`);
          return;
        }

        // User is authenticated
        setUserId(user.id);
        setEmail(user.email || '');
        
        // Get tier from user metadata if not in URL
        if (!tierParam && user.user_metadata?.selected_tier) {
          setTier(user.user_metadata.selected_tier as SubscriptionTier);
        }
        
        // Check if user already has an organization
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profile?.organization_id) {
          // Check subscription status
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('organization_id', profile.organization_id)
            .single();

          if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
            // User has active subscription - check onboarding status
            const { data: org } = await supabase
              .from('organizations')
              .select('onboarding_completed')
              .eq('id', profile.organization_id)
              .single();

            if (org?.onboarding_completed) {
              // Redirect to dashboard
              router.push('/dashboard');
              return;
            } else {
              // Redirect to onboarding
              router.push('/onboarding');
              return;
            }
          }
        }
        
        // User is authenticated but has no organization - allow them to continue
        setCheckingAuth(false);
      } catch (err) {
        console.error('Error checking auth:', err);
        router.push(`/signup${tierParam ? `?tier=${tierParam}` : ''}`);
      }
    };

    checkAuthAndSubscription();
  }, [supabase, router, tierParam]);

  // Calculate total price
  const totalPrice = calculateSubscriptionPrice(
    tier,
    tier === 'operations_pro' ? operationsProLevel : undefined
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!supabase) {
      setError('Configuration error. Please refresh the page.');
      return;
    }

    // Validation
    if (!userId) {
      setError('You must be logged in to subscribe');
      return;
    }

    if (!businessName.trim()) {
      setError('Business name is required');
      return;
    }

    if (!acceptTerms) {
      setError('Please accept the terms and conditions');
      return;
    }

    if (tier === 'operations_pro' && !operationsProLevel) {
      setError('Please select an Operations Pro level');
      return;
    }

    setLoading(true);

    try {
      console.log('🔵 Starting subscription flow for authenticated user...');
      console.log('User ID:', userId);

      // Step 2: Store subscription details temporarily for success page
      const pendingSubscription = {
        user_id: userId,
        email: email,
        businessName,
        tier,
        operationsProLevel: tier === 'operations_pro' ? operationsProLevel : null,
        totalPrice: totalPrice / 100, // Convert from cents
      };
      
      sessionStorage.setItem('pending_subscription', JSON.stringify(pendingSubscription));
      console.log('✅ Subscription details stored');

      // Step 3: Create checkout session and redirect
      console.log('Step 2: Creating Stripe Checkout Session...');
      const checkoutResponse = await fetch('/api/subscriptions/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          tier,
          operationsProLevel: tier === 'operations_pro' ? operationsProLevel : undefined,
          userId: userId,
          businessName,
        }),
      });

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await checkoutResponse.json();
      
      if (!url) {
        throw new Error('Failed to create checkout session - no URL returned');
      }

      console.log('✅ Checkout session created, redirecting to Stripe...');
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err: any) {
      console.error('❌ Subscription error:', err);
      console.error('Error details:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
      });
      
      let errorMessage = 'Failed to create subscription. Please try again.';
      
      if (err?.message) {
        errorMessage = err.message;
      }
      
      // Check for common issues
      if (err?.message?.includes('STRIPE_SECRET_KEY is not configured')) {
        errorMessage = 'Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables. See ROLLOUT_GUIDE.md for setup instructions.';
      } else if (err?.code === '42P01' || err?.message?.includes('relation') || err?.message?.includes('does not exist')) {
        errorMessage = 'Database tables not found. Please run the migration SQL file first. See README.md for instructions.';
      } else if (err?.code === '23505') {
        errorMessage = 'This email is already registered. Please try logging in instead.';
      } else if (err?.message?.includes('RLS')) {
        errorMessage = 'Database permission error. Please check Row Level Security policies.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Start Your Free Trial</h1>
          <p className="text-gray-600">14 days free, no credit card required for trial</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
              {/* Account Details */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Details</h2>
                
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Signed in as:</strong> {email}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="Your Business Name"
                    />
                  </div>
                </div>
              </div>

              {/* Plan Selection */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Select Your Plan</h2>
                
                <div className="space-y-4">
                  {/* Tier Selection */}
                  <div className="space-y-3">
                    <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-primary">
                      <input
                        type="radio"
                        name="tier"
                        value="operations"
                        checked={tier === 'operations'}
                        onChange={(e) => setTier(e.target.value as SubscriptionTier)}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-gray-900">Operations</div>
                            <div className="text-sm text-gray-600">For sole traders & small teams</div>
                          </div>
                          <div className="text-lg font-bold text-primary">{formatPrice(PRICING.OPERATIONS_BASE)}/mo</div>
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-purple-500">
                      <input
                        type="radio"
                        name="tier"
                        value="operations_pro"
                        checked={tier === 'operations_pro'}
                        onChange={(e) => setTier(e.target.value as SubscriptionTier)}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-gray-900">Operations Pro</div>
                            <div className="text-sm text-gray-600">For property managers & contractors</div>
                          </div>
                          <div className="text-lg font-bold text-purple-600">Base + $99 or $199/mo</div>
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Operations Pro Level Selection */}
                  {tier === 'operations_pro' && (
                    <div className="ml-8 space-y-3 border-l-4 border-purple-200 pl-4">
                      <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-purple-50">
                        <input
                          type="radio"
                          name="proLevel"
                          value="scale"
                          checked={operationsProLevel === 'scale'}
                          onChange={(e) => setOperationsProLevel(e.target.value as OperationsProLevel)}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-medium">Scale (50 contractors)</span>
                            <span className="font-bold text-purple-600">+{formatPrice(PRICING.OPERATIONS_PRO_SCALE)}/mo</span>
                          </div>
                        </div>
                      </label>

                      <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-purple-50">
                        <input
                          type="radio"
                          name="proLevel"
                          value="unlimited"
                          checked={operationsProLevel === 'unlimited'}
                          onChange={(e) => setOperationsProLevel(e.target.value as OperationsProLevel)}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-medium">Unlimited Contractors</span>
                            <span className="font-bold text-purple-600">+{formatPrice(PRICING.OPERATIONS_PRO_UNLIMITED)}/mo</span>
                          </div>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Information Notice */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Information</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Secure Payment:</strong> You'll be redirected to Stripe's secure checkout page to complete your subscription. 
                    No card details are collected on this page for your security.
                  </p>
                </div>
              </div>

              {/* Terms */}
              <div>
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 mr-3"
                  />
                  <span className="text-sm text-gray-600">
                    I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and{' '}
                    <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                  </span>
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-lg font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Redirecting to Secure Checkout...' : 'Start 14-Day Free Trial'}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {tier === 'operations' ? 'Operations' : 'Operations Pro'} Plan
                  </span>
                  <span className="font-medium">{formatPrice(PRICING.OPERATIONS_BASE)}</span>
                </div>

                {tier === 'operations_pro' && operationsProLevel && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {operationsProLevel === 'scale' ? 'Scale (50 contractors)' : 'Unlimited Contractors'}
                    </span>
                    <span className="font-medium">
                      {formatPrice(operationsProLevel === 'scale' ? PRICING.OPERATIONS_PRO_SCALE : PRICING.OPERATIONS_PRO_UNLIMITED)}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total per month</span>
                    <span className="text-2xl font-bold text-primary">{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <div className="font-semibold text-green-900">14-Day Free Trial</div>
                    <div className="text-sm text-green-700">Cancel anytime during trial</div>
                  </div>
                </div>
              </div>

              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-primary mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Includes Owner/License Manager seat
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-primary mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Add licenses anytime
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-primary mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Pro-rata billing
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-primary mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Cancel anytime
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubscribeLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<SubscribeLoading />}>
      <SubscribeForm />
    </Suspense>
  );
}
