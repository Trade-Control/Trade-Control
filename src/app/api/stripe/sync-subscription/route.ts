import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'
import { handleCheckoutSessionCompleted } from '@/lib/stripe/webhooks'

export async function POST(req: Request) {
  try {
    const { session_id } = await req.json()

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      )
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      )
    }

    console.log('Syncing subscription for session:', session_id)

    // Get current user first
    const supabase = await createClient()
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !currentUser) {
      console.error('Auth error in sync:', authError)
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('Current user:', currentUser.id)

    // Fetch the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription'],
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Use current user ID if session metadata doesn't have it (for existing users)
    const userId = session.metadata?.user_id || currentUser.id

    console.log('Using user ID:', userId)

    // Check if subscription already exists
    const { data: profile } = await (supabase
      .from('profiles') as any)
      .select('organization_id')
      .eq('id', userId)
      .single()

    if (profile?.organization_id) {
      // Check if subscription exists
      const { data: existingSubscription } = await (supabase
        .from('subscriptions') as any)
        .select('id, status, tier')
        .eq('organization_id', profile.organization_id)
        .maybeSingle()

      if (existingSubscription) {
        console.log('Subscription already exists:', existingSubscription)
        return NextResponse.json({
          success: true,
          message: 'Subscription already exists',
          subscription: existingSubscription,
          alreadyExists: true,
        })
      }
    }

    // Only process if this is an initial subscription
    if (session.metadata?.type !== 'initial_subscription') {
      console.log('Not an initial subscription, skipping webhook processing')
      return NextResponse.json({
        success: true,
        message: 'Session processed, no action needed',
      })
    }

    // Subscription doesn't exist, manually process the checkout session
    console.log('Processing checkout session manually...')
    await handleCheckoutSessionCompleted(session as any)

    // Verify it was created
    const { data: verifyProfile } = await (supabase
      .from('profiles') as any)
      .select('organization_id')
      .eq('id', userId)
      .single()

    if (verifyProfile?.organization_id) {
      const { data: verifySubscription } = await (supabase
        .from('subscriptions') as any)
        .select('id, status, tier')
        .eq('organization_id', verifyProfile.organization_id)
        .single()

      if (verifySubscription) {
        console.log('Subscription created successfully:', verifySubscription)
        return NextResponse.json({
          success: true,
          message: 'Subscription created successfully',
          subscription: verifySubscription,
        })
      }
    }

    return NextResponse.json(
      { error: 'Failed to create subscription - please contact support' },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('Error syncing subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync subscription' },
      { status: 500 }
    )
  }
}
