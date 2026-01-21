import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe/client'
import { handleCheckoutSessionCompleted } from '@/lib/stripe/webhooks'
import { Database } from '@/types/database'

function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration is missing')
  }
  return createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

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
    const stripeCustomerId = session.customer as string

    console.log('Using user ID:', userId)
    console.log('Stripe customer ID:', stripeCustomerId)

    // Use admin client to bypass RLS and check for subscription by Stripe customer ID
    const supabaseAdmin = getSupabaseAdmin()
    
    const { data: existingSubByStripe, error: subError } = await (supabaseAdmin
      .from('subscriptions') as any)
      .select('organization_id, id, status, tier')
      .eq('stripe_customer_id', stripeCustomerId)
      .maybeSingle()

    if (subError) {
      console.error('Error checking subscription by Stripe customer ID:', subError)
    }

    if (existingSubByStripe) {
      console.log('Found subscription by Stripe customer ID:', existingSubByStripe)
      
      // Link user profile to this organization if not already linked
      const { data: profile } = await (supabaseAdmin
        .from('profiles') as any)
        .select('organization_id')
        .eq('id', userId)
        .single()

      if (profile && profile.organization_id !== existingSubByStripe.organization_id) {
        console.log('Linking user to correct organization:', existingSubByStripe.organization_id)
        await (supabaseAdmin
          .from('profiles') as any)
          .update({ organization_id: existingSubByStripe.organization_id })
          .eq('id', userId)
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription already exists',
        subscription: existingSubByStripe,
        alreadyExists: true,
      })
    }

    // Also check by organization_id (for cases where profile is already linked)
    const { data: profile } = await (supabase
      .from('profiles') as any)
      .select('organization_id')
      .eq('id', userId)
      .single()

    if (profile?.organization_id) {
      const { data: existingSubscription } = await (supabase
        .from('subscriptions') as any)
        .select('id, status, tier')
        .eq('organization_id', profile.organization_id)
        .maybeSingle()

      if (existingSubscription) {
        console.log('Subscription found by organization ID:', existingSubscription)
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
