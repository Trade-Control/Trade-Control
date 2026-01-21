import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { stripe, STRIPE_PRICES } from '@/lib/stripe/client'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    const body = await req.json()
    const { license_type, quantity = 1 } = body

    if (!license_type || !['management', 'field_staff'].includes(license_type)) {
      return NextResponse.json(
        { error: 'Invalid license type' },
        { status: 400 }
      )
    }

    // Get organization subscription
    const supabase = await createClient()
    const { data: subscription, error: subError } = await (supabase
      .from('subscriptions') as any)
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('organization_id', user.organization_id)
      .single()

    if (subError || !subscription) {
      console.error('Error fetching subscription:', subError)
      return NextResponse.json(
        { error: 'No active subscription found. Please set up a subscription first.' },
        { status: 404 }
      )
    }

    // Determine price ID based on license type
    const priceId = license_type === 'management' 
      ? STRIPE_PRICES.MANAGEMENT_LICENSE 
      : STRIPE_PRICES.FIELD_STAFF_LICENSE

    const origin = req.headers.get('origin') || 'http://localhost:3000'

    // Create a checkout session for adding license to existing subscription
    const session = await stripe.checkout.sessions.create({
      customer: subscription.stripe_customer_id,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      success_url: `${origin}/licenses?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/licenses/purchase`,
      subscription_data: {
        metadata: {
          organization_id: user.organization_id!,
          license_type: license_type,
        },
      },
      metadata: {
        organization_id: user.organization_id!,
        license_type: license_type,
        quantity: quantity.toString(),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Error creating license checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
