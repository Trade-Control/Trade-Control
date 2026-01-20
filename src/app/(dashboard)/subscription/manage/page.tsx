import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

async function getSubscriptionDetails(organizationId: string) {
  const supabase = await createClient()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  return subscription
}

export default async function SubscriptionManagePage() {
  const user = await getCurrentUser()

  if (!user || user.role !== 'owner') {
    redirect('/dashboard')
  }

  const subscription = await getSubscriptionDetails(user.organizationId!)

  if (!subscription) {
    redirect('/dashboard')
  }

  const tierNames = {
    operations: 'Operations',
    operations_pro_scale: 'Operations Pro Scale',
    operations_pro_unlimited: 'Operations Pro Unlimited',
  }

  const tierPrices = {
    operations: '$49',
    operations_pro_scale: '$148',
    operations_pro_unlimited: '$248',
  }

  const statusColors = {
    trialing: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    past_due: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your Trade Control subscription and billing
        </p>
      </div>

      {/* Current Plan */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Current Plan</h2>
            <p className="mt-1 text-3xl font-bold text-primary">
              {tierNames[subscription.tier as keyof typeof tierNames]}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {tierPrices[subscription.tier as keyof typeof tierPrices]} AUD/month
            </p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              statusColors[subscription.status as keyof typeof statusColors]
            }`}
          >
            {subscription.status}
          </span>
        </div>

        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Billing Period</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(subscription.current_period_start).toLocaleDateString()} -{' '}
              {new Date(subscription.current_period_end).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Next Billing Date</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(subscription.current_period_end).toLocaleDateString()}
              {' '}
              ({formatDistanceToNow(new Date(subscription.current_period_end), {
                addSuffix: true,
              })})
            </dd>
          </div>
          {subscription.trial_end && subscription.status === 'trialing' && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Trial Ends</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(subscription.trial_end).toLocaleDateString()}
                {' '}
                ({formatDistanceToNow(new Date(subscription.trial_end), {
                  addSuffix: true,
                })})
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Available Plans */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Available Plans</h2>

        <div className="space-y-4">
          {/* Operations */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium text-gray-900">Operations</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Base platform with job management, quotes, invoices
                </p>
                <p className="text-lg font-bold text-primary mt-2">$49 AUD/month</p>
              </div>
              {subscription.tier === 'operations' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Current Plan
                </span>
              ) : (
                <button
                  disabled
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed"
                >
                  Downgrade
                </button>
              )}
            </div>
          </div>

          {/* Operations Pro Scale */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium text-gray-900">Operations Pro Scale</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Everything in Operations + contractor management (up to 50 contractors)
                </p>
                <p className="text-lg font-bold text-primary mt-2">$148 AUD/month</p>
              </div>
              {subscription.tier === 'operations_pro_scale' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Current Plan
                </span>
              ) : (
                <button
                  disabled
                  className="px-4 py-2 border border-primary text-sm font-medium rounded-md text-primary hover:bg-blue-50"
                >
                  {subscription.tier === 'operations' ? 'Upgrade' : 'Change Plan'}
                </button>
              )}
            </div>
          </div>

          {/* Operations Pro Unlimited */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium text-gray-900">
                  Operations Pro Unlimited
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Everything in Operations + contractor management (unlimited contractors)
                </p>
                <p className="text-lg font-bold text-primary mt-2">$248 AUD/month</p>
              </div>
              {subscription.tier === 'operations_pro_unlimited' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Current Plan
                </span>
              ) : (
                <button
                  disabled
                  className="px-4 py-2 border border-primary text-sm font-medium rounded-md text-primary hover:bg-blue-50"
                >
                  {subscription.tier === 'operations' || subscription.tier === 'operations_pro_scale'
                    ? 'Upgrade'
                    : 'Change Plan'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Billing Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Billing Information</h2>
        <p className="text-sm text-gray-500">
          Manage your payment methods and billing details in the Stripe Customer Portal.
        </p>
        <button
          disabled
          className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Manage Billing
        </button>
      </div>

      {/* Cancel Subscription */}
      {subscription.status !== 'cancelled' && (
        <div className="bg-white shadow rounded-lg p-6 border-l-4 border-red-500">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Cancel Subscription</h2>
          <p className="text-sm text-gray-500 mb-4">
            Your access will continue until the end of your current billing period.
          </p>
          <button
            disabled
            className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
          >
            Cancel Subscription
          </button>
        </div>
      )}
    </div>
  )
}
