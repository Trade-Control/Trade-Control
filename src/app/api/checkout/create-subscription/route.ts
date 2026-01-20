import { NextResponse } from 'next/server'
import { createCustomer, createCheckoutSession, STRIPE_PRICES } from '@/lib/stripe/client'

export async function POST(req: Request) {
  try {
    const { userId, email, name } = await req.json()

    if (!userId || !email || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create Stripe customer
    const customer = await createCustomer({
      email,
      name,
      metadata: {
        user_id: userId,
      },
    })

    // Create checkout session for Operations plan with 14-day trial
    const session = await createCheckoutSession({
      customerId: customer.id,
      priceId: STRIPE_PRICES.OPERATIONS,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/signup`,
      trialPeriodDays: 14,
      metadata: {
        user_id: userId,
        type: 'initial_subscription',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Create subscription error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
