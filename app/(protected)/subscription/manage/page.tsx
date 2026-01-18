'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { Subscription, License } from '@/lib/types/database.types';
import { getUserPermissions } from '@/lib/middleware/role-check';
import { formatPrice, PRICING, cancelSubscription } from '@/lib/services/stripe';
import Link from 'next/link';

export default function ManageSubscriptionPage() {
  const router = useRouter();
  const supabase = useSafeSupabaseClient();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [selectedProLevel, setSelectedProLevel] = useState<'scale' | 'unlimited'>('scale');

  useEffect(() => {
    checkPermissions();
    if (supabase) {
      fetchData();
    }
  }, [supabase]);

  const checkPermissions = async () => {
    const permissions = await getUserPermissions();
    setCanManage(permissions?.canManageSubscription || false);
  };

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) return;

    // Fetch subscription
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .single();

    setSubscription(subData);

    // Fetch licenses
    const { data: licenseData } = await supabase
      .from('licenses')
      .select('*')
      .eq('organization_id', profile.organization_id);

    setLicenses(licenseData || []);
    setLoading(false);
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;
    
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access at the end of the billing period.')) {
      return;
    }

    try {
      await cancelSubscription(subscription.stripe_subscription_id!, true);
      
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscription.id);

      alert('Subscription cancelled. Access will continue until ' + new Date(subscription.current_period_end!).toLocaleDateString());
      fetchData();
    } catch (err) {
      alert('Error cancelling subscription');
    }
  };

  const handleUpgradeToPro = async () => {
    if (!subscription || subscription.tier === 'operations_pro') return;

    // Check if Stripe subscription ID exists
    if (!subscription.stripe_subscription_id) {
      alert('Stripe subscription not found. Please contact support.');
      return;
    }

    // No confirmation popup - user will consent through Stripe checkout
    setUpgrading(true);

    try {
      // Create checkout session for upgrade
      const checkoutResponse = await fetch('/api/subscriptions/create-upgrade-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          newTier: 'operations_pro',
          operationsProLevel: selectedProLevel,
        }),
      });

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json();
        throw new Error(errorData.error || 'Failed to create upgrade checkout session');
      }

      const result = await checkoutResponse.json();

      // Redirect to checkout session
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error('Upgrade error:', err);
      alert('Error upgrading subscription: ' + (err.message || 'Unknown error'));
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <p className="text-gray-600">Only owners can manage subscriptions.</p>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">No Subscription Found</h1>
        <p className="text-gray-600 mb-6">Please contact support.</p>
      </div>
    );
  }

  const managementLicenses = licenses.filter(l => l.license_type === 'management');
  const fieldStaffLicenses = licenses.filter(l => l.license_type === 'field_staff');
  const managementCount = managementLicenses.length;
  const fieldStaffCount = fieldStaffLicenses.length;
  const managementScheduledForRemoval = managementLicenses.filter(l => l.scheduled_for_removal).length;
  const fieldStaffScheduledForRemoval = fieldStaffLicenses.filter(l => l.scheduled_for_removal).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manage Subscription</h1>
        <p className="text-gray-600 mt-2">View and manage your subscription plan</p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {subscription.tier === 'operations' ? 'Operations' : 'Operations Pro'}
              {subscription.tier === 'operations_pro' && subscription.operations_pro_level && (
                <span className="ml-2 text-lg text-purple-600">
                  ({subscription.operations_pro_level === 'scale' ? 'Scale' : 'Unlimited'})
                </span>
              )}
            </h2>
            <p className="text-gray-600">
              Status: <span className={`font-semibold ${
                subscription.status === 'active' ? 'text-green-600' : 
                subscription.status === 'trialing' ? 'text-blue-600' : 
                'text-red-600'
              }`}>
                {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
              </span>
            </p>
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold text-primary mb-1">
              {formatPrice(subscription.total_price * 100)}
            </div>
            <div className="text-gray-600">per month</div>
          </div>
        </div>

        {subscription.status === 'trialing' && subscription.trial_ends_at && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div className="font-semibold text-blue-900">Free Trial Active</div>
                <div className="text-sm text-blue-700">
                  Your trial ends on {new Date(subscription.trial_ends_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {subscription.current_period_end && (
          <div className="text-sm text-gray-600 mb-6">
            Current billing period ends: {new Date(subscription.current_period_end).toLocaleDateString()}
            {subscription.current_period_end && (
              <span className="ml-2 text-xs text-gray-500">
                (Next billing date: {new Date(subscription.current_period_end).toLocaleDateString()})
              </span>
            )}
          </div>
        )}

        {/* Billing Breakdown */}
        <div className="border-t pt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Billing Breakdown</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Plan:</span>
              <span className="font-medium">{formatPrice(PRICING.OPERATIONS_BASE)}</span>
            </div>

            {subscription.tier === 'operations_pro' && subscription.operations_pro_level && (
              <div className="flex justify-between">
                <span className="text-gray-600">Operations Pro ({subscription.operations_pro_level}):</span>
                <span className="font-medium">
                  {formatPrice(subscription.operations_pro_level === 'scale' ? PRICING.OPERATIONS_PRO_SCALE : PRICING.OPERATIONS_PRO_UNLIMITED)}
                </span>
              </div>
            )}

            {managementCount > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Management Licenses ({managementCount}
                    {managementScheduledForRemoval > 0 && (
                      <span className="text-orange-600">, {managementScheduledForRemoval} scheduled for removal</span>
                    )}
                    ):
                  </span>
                  <span className="font-medium">{formatPrice(PRICING.MANAGEMENT_LICENSE * managementCount)}</span>
                </div>
                {managementScheduledForRemoval > 0 && (
                  <div className="text-xs text-orange-600 ml-4">
                    {managementScheduledForRemoval} license{managementScheduledForRemoval > 1 ? 's' : ''} will be removed at end of billing period
                  </div>
                )}
              </div>
            )}

            {fieldStaffCount > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Field Staff Licenses ({fieldStaffCount}
                    {fieldStaffScheduledForRemoval > 0 && (
                      <span className="text-orange-600">, {fieldStaffScheduledForRemoval} scheduled for removal</span>
                    )}
                    ):
                  </span>
                  <span className="font-medium">{formatPrice(PRICING.FIELD_STAFF_LICENSE * fieldStaffCount)}</span>
                </div>
                {fieldStaffScheduledForRemoval > 0 && (
                  <div className="text-xs text-orange-600 ml-4">
                    {fieldStaffScheduledForRemoval} license{fieldStaffScheduledForRemoval > 1 ? 's' : ''} will be removed at end of billing period
                  </div>
                )}
              </div>
            )}

            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold text-gray-900">Total:</span>
              <span className="text-lg font-bold text-primary">{formatPrice(subscription.total_price * 100)}/mo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Link
          href="/licenses"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-center"
        >
          <div className="text-4xl mb-3">🎫</div>
          <h3 className="font-semibold text-gray-900 mb-2">Manage Licenses</h3>
          <p className="text-sm text-gray-600 mb-4">Add, remove, or assign licenses to team members</p>
          <span className="text-primary font-medium">Manage Licenses →</span>
        </Link>

        {subscription.tier === 'operations' && (
          <div className="bg-purple-600 hover:bg-purple-700 rounded-lg shadow p-6 text-white transition-all">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="font-semibold mb-2">Upgrade to Operations Pro</h3>
            <p className="text-sm mb-4 opacity-90">Add contractor management and compliance tracking</p>
            
            {/* Operations Pro Level Selection */}
            <div className="mb-4 space-y-3">
              <label className="flex items-start cursor-pointer p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors">
                <input
                  type="radio"
                  name="proLevel"
                  value="scale"
                  checked={selectedProLevel === 'scale'}
                  onChange={(e) => setSelectedProLevel(e.target.value as 'scale')}
                  className="mr-3 mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold">
                    Scale (50 contractors) - {formatPrice(PRICING.OPERATIONS_PRO_SCALE)}/mo
                  </div>
                  <div className="text-sm font-bold mt-1">
                    Combined Total: {formatPrice(PRICING.OPERATIONS_BASE + PRICING.OPERATIONS_PRO_SCALE)}/mo
                  </div>
                  <div className="text-xs opacity-75 mt-1">
                    Includes Base ({formatPrice(PRICING.OPERATIONS_BASE)}) + Pro ({formatPrice(PRICING.OPERATIONS_PRO_SCALE)})
                  </div>
                </div>
              </label>
              <label className="flex items-start cursor-pointer p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors">
                <input
                  type="radio"
                  name="proLevel"
                  value="unlimited"
                  checked={selectedProLevel === 'unlimited'}
                  onChange={(e) => setSelectedProLevel(e.target.value as 'unlimited')}
                  className="mr-3 mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold">
                    Unlimited Contractors - {formatPrice(PRICING.OPERATIONS_PRO_UNLIMITED)}/mo
                  </div>
                  <div className="text-sm font-bold mt-1">
                    Combined Total: {formatPrice(PRICING.OPERATIONS_BASE + PRICING.OPERATIONS_PRO_UNLIMITED)}/mo
                  </div>
                  <div className="text-xs opacity-75 mt-1">
                    Includes Base ({formatPrice(PRICING.OPERATIONS_BASE)}) + Pro ({formatPrice(PRICING.OPERATIONS_PRO_UNLIMITED)})
                  </div>
                </div>
              </label>
            </div>

            <button
              onClick={handleUpgradeToPro}
              disabled={upgrading}
              className="w-full bg-white text-purple-600 hover:bg-purple-50 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {upgrading ? 'Redirecting to Checkout...' : 'Upgrade Now →'}
            </button>
            
            <div className="mt-3 p-3 bg-white bg-opacity-20 rounded-lg">
              <p className="text-xs opacity-90">
                {subscription.status === 'trialing' ? (
                  <>💳 Checkout will charge the full combined monthly amount (Base + Pro). Your trial continues until it ends, then regular billing begins.</>
                ) : (
                  <>💳 Checkout will charge the combined monthly amount (Base + Pro) starting immediately.</>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      {subscription.status !== 'cancelled' && (
        <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-red-200">
          <h3 className="text-xl font-bold text-red-600 mb-4">Danger Zone</h3>
          <p className="text-gray-600 mb-4">
            Cancelling your subscription will disable access at the end of the current billing period.
            All data will be preserved.
          </p>
          <button
            onClick={handleCancelSubscription}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Cancel Subscription
          </button>
        </div>
      )}

      {subscription.status === 'cancelled' && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <h3 className="font-semibold text-red-900 mb-2">Subscription Cancelled</h3>
          <p className="text-red-700">
            Your subscription is cancelled and will end on {new Date(subscription.current_period_end!).toLocaleDateString()}.
          </p>
        </div>
      )}
    </div>
  );
}
