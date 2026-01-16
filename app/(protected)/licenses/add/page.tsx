'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { calculateProRata, formatPrice, PRICING } from '@/lib/services/stripe';
import { Subscription } from '@/lib/types/database.types';

export default function AddLicensePage() {
  const router = useRouter();
  const supabase = useSafeSupabaseClient();

  const [licenseType, setLicenseType] = useState<'management' | 'field_staff'>('management');
  const [quantity, setQuantity] = useState(1);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [proRata, setProRata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (supabase) {
      fetchSubscription();
    }
  }, [supabase]);

  useEffect(() => {
    if (subscription) {
      calculateCosts();
    }
  }, [licenseType, quantity, subscription]);

  const fetchSubscription = async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) return;

    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .single();

    setSubscription(data);
  };

  const calculateCosts = () => {
    if (!subscription) return;

    const monthlyPrice = licenseType === 'management' ? PRICING.MANAGEMENT_LICENSE : PRICING.FIELD_STAFF_LICENSE;
    const periodStart = new Date(subscription.current_period_start!);
    const periodEnd = new Date(subscription.current_period_end!);

    const proRataCalc = calculateProRata(monthlyPrice * quantity, periodStart, periodEnd);
    setProRata(proRataCalc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('Organization not found');
      if (!subscription) throw new Error('Subscription not found');

      // Check if Stripe subscription ID exists
      if (!subscription.stripe_subscription_id) {
        throw new Error('Stripe subscription not found. Please contact support.');
      }

      // Call checkout session API (handles payment method collection if needed)
      const checkoutResponse = await fetch('/api/licenses/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          licenseType,
          quantity,
        }),
      });

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const result = await checkoutResponse.json();

      // If payment method exists, license was added directly
      if (result.success) {
        router.push('/licenses');
        return;
      }

      // Otherwise, redirect to checkout session to collect payment method
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error('Error adding license:', err);
      setError(err.message || 'Failed to add license');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add New License</h1>
        <p className="text-gray-600 mt-2">Add management or field staff licenses to your team</p>
      </div>

      {subscription?.status === 'trialing' && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Trial Period Active</h3>
              <p className="text-sm text-blue-700">
                You can add licenses during your trial. If you don't have a payment method on file, you'll be asked to add one securely through Stripe's checkout page.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
        {/* License Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Select License Type *
          </label>
          
          <div className="space-y-3">
            <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-primary">
              <input
                type="radio"
                name="licenseType"
                value="management"
                checked={licenseType === 'management'}
                onChange={(e) => setLicenseType(e.target.value as 'management' | 'field_staff')}
                className="mt-1 mr-4"
              />
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-gray-900">Management Login</div>
                  <div className="text-lg font-bold text-primary">{formatPrice(PRICING.MANAGEMENT_LICENSE)}/mo</div>
                </div>
                <p className="text-sm text-gray-600">
                  Full access to manage jobs, create quotes/invoices, assign contractors, and view all data.
                  Cannot manage licenses or subscriptions.
                </p>
              </div>
            </label>

            <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-primary">
              <input
                type="radio"
                name="licenseType"
                value="field_staff"
                checked={licenseType === 'field_staff'}
                onChange={(e) => setLicenseType(e.target.value as 'management' | 'field_staff')}
                className="mt-1 mr-4"
              />
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-gray-900">Field Staff Login</div>
                  <div className="text-lg font-bold text-green-600">{formatPrice(PRICING.FIELD_STAFF_LICENSE)}/mo</div>
                </div>
                <p className="text-sm text-gray-600">
                  Limited access: Can only view assigned jobs, update job status, add notes, and upload photos.
                  Cannot create quotes, view invoices, or access unassigned jobs.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity *
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Enter number of licenses"
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter the number of licenses you need (1-100)
          </p>
        </div>

        {/* Pro-Rata Pricing Info */}
        {proRata && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Billing Details</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly price per license:</span>
                <span className="font-medium">{formatPrice(proRata.basePrice)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium">{quantity}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Days remaining in billing period:</span>
                <span className="font-medium">{proRata.daysRemaining} of {proRata.totalDays} days</span>
              </div>
              
              <div className="border-t border-blue-300 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Charge today (pro-rated):</span>
                  <span className="text-lg font-bold text-primary">{formatPrice(proRata.effectivePrice * quantity)}</span>
                </div>
              </div>
              
              <p className="text-xs text-gray-600 mt-2">
                Starting next billing period, you'll be charged {formatPrice(proRata.basePrice * quantity)}/month for {quantity === 1 ? 'this license' : 'these licenses'}.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !subscription}
            className="flex-1 bg-primary hover:bg-primary-hover text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Adding...' : `Add ${quantity === 1 ? 'License' : `${quantity} Licenses`}`}
          </button>
        </div>
      </form>
    </div>
  );
}
