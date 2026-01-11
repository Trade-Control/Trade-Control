'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (supabase) {
      checkSubscriptionStatus();
    }
  }, [pathname, supabase]);

  const checkSubscriptionStatus = async () => {
    if (!supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Skip checks for onboarding, migration, subscription management pages
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
        // No organization - redirect to subscribe (but avoid loop)
        if (pathname !== '/subscribe') {
          router.push('/subscribe');
        } else {
          setLoading(false);
        }
        return;
      }

      // Check if organization has subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id, status')
        .eq('organization_id', profile.organization_id)
        .single();

      if (!subscription) {
        // No subscription - redirect to migration for existing users
        router.push('/migration');
        return;
      }

      // Check if subscription is active
      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        // Inactive subscription
        router.push('/subscription/manage');
        return;
      }

      // Check if onboarding is complete
      const { data: org } = await supabase
        .from('organizations')
        .select('onboarding_completed')
        .eq('id', profile.organization_id)
        .single();

      if (!org?.onboarding_completed) {
        // Redirect to onboarding
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
