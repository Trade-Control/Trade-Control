'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createCustomer, createSubscription, PRICING, formatPrice, calculateSubscriptionPrice } from '@/lib/services/stripe-mock';
import { SubscriptionTier, OperationsProLevel } from '@/lib/types/database.types';

function SubscribeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [tier, setTier] = useState<SubscriptionTier>((searchParams.get('tier') as SubscriptionTier) || 'operations');
  const [operationsProLevel, setOperationsProLevel] = useState<OperationsProLevel | undefined>('scale');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Mock card details (for UI only)
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');

  // Calculate total price
  const totalPrice = calculateSubscriptionPrice(
    tier,
    tier === 'operations_pro' ? operationsProLevel : undefined
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
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
      console.log('🔵 Starting subscription flow...');
      
      // Step 1: Create auth user
      console.log('Step 1: Creating auth user...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }
      if (!authData.user) throw new Error('Failed to create user');
      console.log('✅ User created:', authData.user.id);

      // Step 2: Create Stripe customer (mock)
      console.log('Step 2: Creating Stripe customer...');
      const customer = await createCustomer({
        email,
        name: businessName,
        metadata: {
          user_id: authData.user.id,
        },
      });
      console.log('✅ Customer created');

      // Step 3: Create Stripe subscription (mock)
      console.log('Step 3: Creating Stripe subscription...');
      const subscription = await createSubscription({
        customerId: customer.id,
        tier,
        operationsProLevel: tier === 'operations_pro' ? operationsProLevel : undefined,
        trialDays: 14, // 14-day trial
      });
      console.log('✅ Stripe subscription created');

      // Step 4: Complete signup via API route
      // This creates organization, subscription, and license in one database transaction
      console.log('Step 4: Completing signup (organization, subscription, license)...');
      const signupResponse = await fetch('/api/signup/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: authData.user.id,
          organization_name: businessName,
          tier,
          operations_pro_level: tier === 'operations_pro' ? operationsProLevel : null,
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          base_price: totalPrice / 100, // Convert from cents
          total_price: totalPrice / 100,
          current_period_start: subscription.currentPeriodStart,
          current_period_end: subscription.currentPeriodEnd,
          trial_ends_at: subscription.trialEnd,
        }),
      });

      if (!signupResponse.ok) {
        // Check content type before parsing
        const contentType = signupResponse.headers.get('content-type');
        let errorData: any = { error: 'Unknown error' };
        
        if (contentType && contentType.includes('application/json')) {
          try {
            errorData = await signupResponse.json();
          } catch (e) {
            console.error('Failed to parse error JSON:', e);
          }
        } else {
          const text = await signupResponse.text();
          console.error('Received non-JSON response:', text.substring(0, 200));
          errorData = { error: `Server error (${signupResponse.status}): ${signupResponse.statusText}` };
        }
        
        console.error('❌ Signup completion failed:', errorData);
        throw new Error(errorData.error || `Failed to complete signup: ${signupResponse.statusText}`);
      }

      const signupResult = await signupResponse.json();
      
      if (!signupResult.success) {
        throw new Error('Signup failed - no success confirmation');
      }
      
      console.log('✅ Organization created:', signupResult.organization_id);
      console.log('✅ Subscription created:', signupResult.subscription_id);
      console.log('✅ License created:', signupResult.license_id);

      console.log('🎉 Subscription flow complete! Redirecting to onboarding...');
      // Redirect to onboarding
      router.push('/onboarding');
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
      if (err?.code === '42P01' || err?.message?.includes('relation') || err?.message?.includes('does not exist')) {
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="••••••••"
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

              {/* Mock Payment Details */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Information</h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Mock Mode:</strong> This is a test environment. Enter any card details.
                    No actual charges will be made.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md"
                      placeholder="4242 4242 4242 4242"
                      maxLength={19}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Exp Month
                      </label>
                      <input
                        type="text"
                        value={expMonth}
                        onChange={(e) => setExpMonth(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md"
                        placeholder="12"
                        maxLength={2}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Exp Year
                      </label>
                      <input
                        type="text"
                        value={expYear}
                        onChange={(e) => setExpYear(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md"
                        placeholder="2025"
                        maxLength={4}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVC
                      </label>
                      <input
                        type="text"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md"
                        placeholder="123"
                        maxLength={4}
                      />
                    </div>
                  </div>
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
                {loading ? 'Creating Account...' : 'Start 14-Day Free Trial'}
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
