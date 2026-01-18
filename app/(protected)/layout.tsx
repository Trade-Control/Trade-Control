'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useSafeSupabaseClient();
  const [loading, setLoading] = useState(true);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (supabase && !checkedRef.current) {
      checkedRef.current = true;
      checkSubscriptionStatus();
    }
  }, [supabase]);

  const checkSubscriptionStatus = async () => {
    if (!supabase) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Skip checks for these pages
      if (pathname.startsWith('/onboarding') || 
          pathname.startsWith('/migration') ||
          pathname.startsWith('/subscription')) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        if (pathname !== '/subscribe') {
          router.push('/subscribe');
        } else {
          setLoading(false);
        }
        return;
      }

      // Check subscription status
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id, status')
        .eq('organization_id', profile.organization_id)
        .single();

      if (!subscription) {
        router.push('/migration');
        return;
      }

      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        router.push('/subscription/manage');
        return;
      }

      // Check onboarding
      const { data: org } = await supabase
        .from('organizations')
        .select('onboarding_completed')
        .eq('id', profile.organization_id)
        .single();

      if (!org?.onboarding_completed) {
        router.push('/onboarding');
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
