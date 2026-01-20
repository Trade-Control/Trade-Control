'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SubscriptionExpiredPage() {
  const router = useRouter()
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSubscription = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await (supabase
        .from('profiles') as any)
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (profile?.organization_id) {
        const { data: sub } = await (supabase
          .from('subscriptions') as any)
          .select('*')
          .eq('organization_id', profile.organization_id)
          .single()

        setSubscription(sub)
      }

      setLoading(false)
    }

    loadSubscription()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 text-red-600 mb-4">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Subscription {subscription?.status === 'past_due' ? 'Payment Failed' : 'Expired'}
          </h2>
          
          <div className="mt-4 space-y-3">
            <p className="text-base text-gray-600">
              {subscription?.status === 'past_due' 
                ? 'Your payment has failed. Please update your payment method to continue using Trade Control.'
                : 'Your subscription has been cancelled. Reactivate to continue using Trade Control.'}
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <button
            onClick={() => router.push('/subscription/manage')}
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Manage Subscription
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            View Dashboard (Read Only)
          </button>
        </div>

        <p className="text-xs text-gray-500">
          Need help? Contact support at support@tradecontrol.com.au
        </p>
      </div>
    </div>
  )
}
