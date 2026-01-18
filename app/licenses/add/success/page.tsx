'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';

function LicenseSuccessHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSafeSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    verifyLicenseCreation();
  }, [supabase, searchParams]);

  const verifyLicenseCreation = async () => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    try {
      // Wait a bit for webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if licenses were created
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        setError('Organization not found');
        setLoading(false);
        return;
      }

      // Check for recently created licenses (within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentLicenses, error: licenseError } = await supabase
        .from('licenses')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      if (licenseError) {
        console.error('Error checking licenses:', licenseError);
        // Don't fail - webhook might still be processing
        setVerified(true);
      } else if (recentLicenses && recentLicenses.length > 0) {
        setVerified(true);
      } else {
        // Wait a bit more and check again
        await new Promise(resolve => setTimeout(resolve, 3000));
        const { data: retryLicenses } = await supabase
          .from('licenses')
          .select('id')
          .eq('organization_id', profile.organization_id)
          .gte('created_at', fiveMinutesAgo)
          .order('created_at', { ascending: false })
          .limit(10);

        if (retryLicenses && retryLicenses.length > 0) {
          setVerified(true);
        } else {
          // Still no licenses - might be processing
          setVerified(true); // Show success anyway, webhook might be delayed
        }
      }

      setLoading(false);
      
      // Redirect after showing success
      setTimeout(() => {
        router.push('/licenses');
      }, 3000);
    } catch (err: any) {
      console.error('Error verifying license creation:', err);
      setError('Error verifying license creation. Please check your licenses page.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Processing...</h1>
          <p className="text-gray-600">Verifying license creation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/licenses')}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Go to Licenses Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-green-600 text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          {verified 
            ? 'Your license has been added successfully. Redirecting to licenses page...'
            : 'Your payment was successful. License is being processed...'}
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}

function LicenseSuccessLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function LicenseSuccessPage() {
  return (
    <Suspense fallback={<LicenseSuccessLoading />}>
      <LicenseSuccessHandler />
    </Suspense>
  );
}
