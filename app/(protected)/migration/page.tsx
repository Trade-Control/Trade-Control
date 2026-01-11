'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createCustomer, createSubscription, PRICING, formatPrice } from '@/lib/services/stripe';
import { SubscriptionTier, OperationsProLevel } from '@/lib/types/database.types';

export default function MigrationPage() {
  const router = useRouter();
  const supabase = createClient();

  const [tier, setTier] = useState<SubscriptionTier>('operations');
  const [operationsProLevel, setOperationsProLevel] = useState<OperationsProLevel>('scale');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [organizationId, setOrganizationId] = useState('');

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      router.push('/dashboard');
      return;
    }

    setOrganizationId(profile.organization_id);

    // Check if already has subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .single();

    if (subscription) {
      // Already migrated
      router.push('/dashboard');
    }

    // Make user owner if they don't have a role
    if (!profile.role) {
      await supabase
        .from('profiles')
        .update({ role: 'owner' })
        .eq('id', user.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (!org) throw new Error('Organization not found');

      // Create Stripe customer
      const customer = await createCustomer({
        email: user.email!,
        name: org.name,
        metadata: {
          organization_id: organizationId,
        },
      });

      // Create subscription with 14-day trial
      const subscription = await createSubscription({
        customerId: customer.id,
        tier,
        operationsProLevel: tier === 'operations_pro' ? operationsProLevel : undefined,
        trialDays: 14,
      });

      // Save to database
      const { data: dbSub, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          organization_id: organizationId,
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          tier,
          operations_pro_level: tier === 'operations_pro' ? operationsProLevel : null,
          status: 'trialing',
          current_period_start: subscription.currentPeriodStart,
          current_period_end: subscription.currentPeriodEnd,
          trial_ends_at: subscription.trialEnd,
          base_price: PRICING.OPERATIONS_BASE / 100,
          total_price: subscription.totalPrice / 100,
        })
        .select()
        .single();

      if (subError) throw subError;

      // Update organization
      await supabase
        .from('organizations')
        .update({
          subscription_id: dbSub.id,
          onboarding_completed: true,
        })
        .eq('id', organizationId);

      // Create owner license
      await supabase
        .from('licenses')
        .insert({
          organization_id: organizationId,
          profile_id: user.id,
          license_type: 'owner',
          status: 'active',
          monthly_cost: 0,
          assigned_at: new Date().toISOString(),
        });

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Migration error:', err);
      setError(err.message || 'Failed to migrate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Trade Control 2.0!</h1>
          <p className="text-xl text-gray-600 mb-2">
            We've upgraded to a subscription-based model with exciting new features
          </p>
          <p className="text-lg text-green-600 font-semibold">
            ✨ Get a 14-day free trial to try the new features!
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Plan</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tier Selection */}
            <div className="space-y-4">
              <label className="flex items-start p-6 border-2 rounded-lg cursor-pointer transition-all hover:border-primary">
                <input
                  type="radio"
                  name="tier"
                  value="operations"
                  checked={tier === 'operations'}
                  onChange={(e) => setTier(e.target.value as SubscriptionTier)}
                  className="mt-1 mr-4"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-xl font-bold text-gray-900">Operations</div>
                      <div className="text-sm text-gray-600">For sole traders & small teams</div>
                    </div>
                    <div className="text-2xl font-bold text-primary">{formatPrice(PRICING.OPERATIONS_BASE)}/mo</div>
                  </div>
                  <ul className="text-sm text-gray-700 space-y-1 mt-3">
                    <li>✓ Manage direct employees</li>
                    <li>✓ Job tracking & scheduling</li>
                    <li>✓ Quotes & invoices</li>
                    <li>✓ Timesheets & documents</li>
                    <li>✓ Inventory & travel tracking</li>
                  </ul>
                </div>
              </label>

              <label className="flex items-start p-6 border-2 rounded-lg cursor-pointer transition-all hover:border-purple-500">
                <input
                  type="radio"
                  name="tier"
                  value="operations_pro"
                  checked={tier === 'operations_pro'}
                  onChange={(e) => setTier(e.target.value as SubscriptionTier)}
                  className="mt-1 mr-4"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-xl font-bold text-gray-900">Operations Pro</div>
                      <div className="text-sm text-gray-600">For property managers & contractors</div>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">Base + $99-199/mo</div>
                  </div>
                  <ul className="text-sm text-gray-700 space-y-1 mt-3">
                    <li>✓ Everything in Operations, plus:</li>
                    <li>✓ External contractor management</li>
                    <li>✓ Compliance Shield (auto-flagging)</li>
                    <li>✓ Email job assignments</li>
                    <li>✓ Token-based contractor access</li>
                    <li>✓ Activity feed & email logging</li>
                  </ul>
                </div>
              </label>
            </div>

            {/* Operations Pro Level */}
            {tier === 'operations_pro' && (
              <div className="ml-8 space-y-3 border-l-4 border-purple-200 pl-6">
                <h3 className="font-semibold text-gray-900 mb-3">Select Contractor Limit</h3>
                
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-purple-50">
                  <input
                    type="radio"
                    name="proLevel"
                    value="scale"
                    checked={operationsProLevel === 'scale'}
                    onChange={(e) => setOperationsProLevel(e.target.value as OperationsProLevel)}
                    className="mr-3"
                  />
                  <div className="flex-1 flex justify-between">
                    <span className="font-medium">Scale (Up to 50 contractors)</span>
                    <span className="font-bold text-purple-600">+{formatPrice(PRICING.OPERATIONS_PRO_SCALE)}/mo</span>
                  </div>
                </label>

                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-purple-50">
                  <input
                    type="radio"
                    name="proLevel"
                    value="unlimited"
                    checked={operationsProLevel === 'unlimited'}
                    onChange={(e) => setOperationsProLevel(e.target.value as OperationsProLevel)}
                    className="mr-3"
                  />
                  <div className="flex-1 flex justify-between">
                    <span className="font-medium">Unlimited Contractors</span>
                    <span className="font-bold text-purple-600">+{formatPrice(PRICING.OPERATIONS_PRO_UNLIMITED)}/mo</span>
                  </div>
                </label>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-green-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <div className="font-semibold text-green-900 mb-1">14-Day Free Trial</div>
                  <div className="text-sm text-green-700">
                    Try all features risk-free. Cancel anytime during the trial period.
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-lg font-semibold text-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Start 14-Day Free Trial'}
            </button>

            <p className="text-center text-sm text-gray-600">
              No credit card required for trial • Cancel anytime
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
