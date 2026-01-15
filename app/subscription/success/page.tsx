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

  useEffect(() => {
    if (!supabase) return;
    handleSuccess();
  }, [supabase, searchParams]);

  const handleSuccess = async () => {
    try {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        throw new Error('No session ID provided');
      }

      // Ensure user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('You must be logged in to complete subscription setup');
      }
      
      console.log('✅ User authenticated:', user.id);

      // Verify checkout session
      console.log('🔍 Verifying Stripe checkout session...');
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
      
      console.log('✅ Stripe session verified');

      // Get pending subscription details from sessionStorage
      const pendingData = sessionStorage.getItem('pending_subscription');
      if (!pendingData) {
        throw new Error('Pending subscription data not found. Please contact support if you were charged.');
      }

      const pendingSubscription = JSON.parse(pendingData);
      
      // Verify the user_id matches
      if (pendingSubscription.user_id !== user.id) {
        throw new Error('User mismatch - please contact support');
      }
      
      console.log('✅ Subscription data retrieved from session storage');

      // Complete signup via API route
      console.log('📝 Creating organization and subscription...');
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
      
      console.log('✅ Organization and subscription created successfully');
      console.log('Organization ID:', signupResult.organization_id);

      // Verify profile was updated with organization_id
      const { data: verifyProfile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
        
      if (!verifyProfile?.organization_id) {
        throw new Error('Profile was not updated with organization. Please contact support.');
      }
      
      console.log('✅ Profile verified with organization_id:', verifyProfile.organization_id);

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
          <p className="text-gray-600">Processing your subscription...</p>
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscription Created!</h1>
        <p className="text-gray-600 mb-6">Your account has been set up successfully. Redirecting to onboarding...</p>
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
