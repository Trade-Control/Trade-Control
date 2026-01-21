import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    // Get organization subscription
    const supabase = await createClient()
    const { data: subscription, error: subError } = await (supabase
      .from('subscriptions') as any)
      .select('stripe_customer_id')
      .eq('organization_id', user.organization_id)
      .single()

    if (subError || !subscription) {
      console.error('Error fetching subscription:', subError)
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    // Get the request body to check for return_url
    const body = await req.json().catch(() => ({}))
    const returnUrl = body.return_url || `${req.headers.get('origin')}/subscription/manage`

    // Create Stripe Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error: any) {
    console.error('Error creating portal session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
