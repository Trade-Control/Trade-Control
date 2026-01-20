'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CheckoutPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const initiateCheckout = async () => {
      try {
        const supabase = createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          router.push('/login')
          return
        }

        // Check if user already has a subscription
        const { data: profile } = await (supabase
          .from('profiles') as any)
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (profile?.organization_id) {
          // Already has organization, check subscription
          const { data: subscription } = await (supabase
            .from('subscriptions') as any)
            .select('status')
            .eq('organization_id', profile.organization_id)
            .single()

          if (subscription) {
            router.push('/dashboard')
            return
          }
        }

        // Create Stripe checkout session
        const response = await fetch('/api/checkout/create-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
            name: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim(),
          }),
        })

        const { url, error: checkoutError } = await response.json()

        if (checkoutError) {
          setError(checkoutError)
          setLoading(false)
          return
        }

        // Redirect to Stripe Checkout
        window.location.href = url
      } catch (err) {
        console.error('Checkout error:', err)
        setError('Failed to initiate checkout')
        setLoading(false)
      }
    }

    initiateCheckout()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-red-600 text-xl font-semibold">Error</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.push('/signup')}
            className="text-primary hover:text-blue-700 font-medium"
          >
            Return to signup
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-600">
          {loading ? 'Redirecting to checkout...' : 'Processing...'}
        </p>
      </div>
    </div>
  )
}
