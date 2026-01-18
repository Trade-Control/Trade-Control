'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { verifyCheckoutSession } from '@/lib/services/stripe';

function SuccessHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSafeSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [pollingMessage, setPollingMessage] = useState('');

  useEffect(() => {
    if (!supabase) return;
    handleSuccess();
  }, [supabase, searchParams]);

  const handleSuccess = async () => {
    try {
      // Get session_id from URL params or sessionStorage (in case user was redirected to login)
      let sessionId = searchParams.get('session_id');
      if (!sessionId) {
        sessionId = sessionStorage.getItem('pending_stripe_session');
      }
      
      if (!sessionId) {
        throw new Error('No session ID provided');
      }
      
      // Clear sessionStorage if we got it from there
      if (sessionStorage.getItem('pending_stripe_session')) {
        sessionStorage.removeItem('pending_stripe_session');
      }

      // Verify checkout session FIRST to get user_id from metadata
      // This allows us to handle unauthenticated users
      const session = await fetch('/api/subscriptions/verify-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      }).then(res => res.json());

      if (!session.success) {
        throw new Error(session.error || 'Failed to verify checkout session');
      }
      
      // Get user_id from Stripe metadata
      const userIdFromStripe = session.metadata?.user_id;
      if (!userIdFromStripe) {
        throw new Error('User ID not found in checkout session. Please contact support.');
      }

      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      // If not authenticated, redirect to login with return URL
      if (authError || !user) {
        // Store session_id in sessionStorage so we can retrieve it after login
        sessionStorage.setItem('pending_stripe_session', sessionId);
        router.push(`/login?returnUrl=${encodeURIComponent('/subscription/success?session_id=' + sessionId)}`);
        return;
      }
      
      // Verify user_id matches
      if (user.id !== userIdFromStripe) {
        throw new Error('User ID mismatch. Please contact support.');
      }

      // Check if this is an upgrade (action === 'upgrade_to_pro') or new signup
      const action = session.metadata?.action;
      const isUpgrade = action === 'upgrade_to_pro';

      if (isUpgrade) {
        // Upgrade flow: Poll for webhook to update subscription tier
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!profile?.organization_id) {
          throw new Error('Organization not found. Please contact support.');
        }

        // Poll for subscription tier update (webhook may take a few seconds)
        const pollForSubscriptionUpdate = async (maxAttempts = 5): Promise<boolean> => {
          for (let i = 0; i < maxAttempts; i++) {
            // Wait 2 seconds between attempts (except first attempt)
            if (i > 0) {
              setPollingMessage(`Waiting for upgrade to process... (${i}/${maxAttempts - 1})`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              setPollingMessage('Verifying upgrade...');
            }
            
            const { data: subscription, error: subError } = await supabase
              .from('subscriptions')
              .select('tier, status')
              .eq('organization_id', profile.organization_id)
              .single();

            if (subError) {
              console.error('Error checking subscription:', subError);
              continue;
            }

            if (!subscription) {
              continue;
            }

            // Check if tier was updated to operations_pro
            if (subscription.tier === 'operations_pro' && 
                (subscription.status === 'active' || subscription.status === 'trialing')) {
              setPollingMessage('');
              return true;
            }
          }
          setPollingMessage('');
          return false;
        };

        const upgradeSuccessful = await pollForSubscriptionUpdate(5);
        
        if (!upgradeSuccessful) {
          // Still show success but warn that it may take a moment
          setStatus('success');
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
          return;
        }
        
        setStatus('success');
        
        // Redirect to contractors page (pro plan feature) with refresh param
        // This ensures the page re-checks access immediately
        setTimeout(() => {
          router.push('/contractors?refresh=true');
        }, 2000);
        return;
      }

      // New signup flow: Get pending subscription details from sessionStorage
      const pendingData = sessionStorage.getItem('pending_subscription');
      if (!pendingData) {
        throw new Error('Pending subscription data not found. Please contact support if you were charged.');
      }

      const pendingSubscription = JSON.parse(pendingData);
      
      // Verify the user_id matches
      if (pendingSubscription.user_id !== user.id) {
        throw new Error('User mismatch - please contact support');
      }
      
      // Complete signup via API route
      const signupResponse = await fetch('/api/signup/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: pendingSubscription.user_id,
          organization_name: pendingSubscription.businessName,
          tier: pendingSubscription.tier,
          operations_pro_level: pendingSubscription.operationsProLevel,
          stripe_customer_id: session.customerId,
          stripe_subscription_id: session.subscriptionId,
          base_price: pendingSubscription.totalPrice,
          total_price: pendingSubscription.totalPrice,
          current_period_start: session.currentPeriodStart,
          current_period_end: session.currentPeriodEnd,
          trial_ends_at: session.trialEnd,
        }),
      });

      if (!signupResponse.ok) {
        const errorData = await signupResponse.json();
        throw new Error(errorData.error || 'Failed to complete signup');
      }

      const signupResult = await signupResponse.json();
      
      if (!signupResult.success) {
        throw new Error('Signup failed - no success confirmation');
      }

      // Verify profile was updated with organization_id
      const { data: verifyProfile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
        
      if (!verifyProfile?.organization_id) {
        throw new Error('Profile was not updated with organization. Please contact support.');
      }

      // Clear pending subscription data
      sessionStorage.removeItem('pending_subscription');

      setStatus('success');
      
      // Redirect to onboarding after a short delay
      setTimeout(() => {
        router.push('/onboarding');
      }, 2000);
    } catch (err: any) {
      console.error('Success handler error:', err);
      setError(err.message || 'Failed to complete signup');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  if (loading || status === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{pollingMessage || 'Processing your subscription...'}</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Signup Failed</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/subscribe')}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-green-600 text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Success!</h1>
        <p className="text-gray-600 mb-6">Your subscription has been updated successfully. Redirecting...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}

function SuccessLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<SuccessLoading />}>
      <SuccessHandler />
    </Suspense>
  );
}
