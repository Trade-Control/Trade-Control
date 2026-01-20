import Stripe from 'stripe'
import { stripe } from './client'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Create admin client for server-side operations (lazy initialization)
function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration is missing')
  }
  return createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  const userId = session.metadata?.user_id

  if (!userId) {
    console.error('No user_id in session metadata')
    return
  }

  // Get subscription details from Stripe
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as any

  // Determine tier based on price ID
  const priceId = subscription.items.data[0]?.price.id
  let tier: 'operations' | 'operations_pro_scale' | 'operations_pro_unlimited' = 'operations'

  // Check if this is an initial subscription or an addon
  const isInitialSubscription = session.metadata?.type === 'initial_subscription'

  if (isInitialSubscription) {
    const supabaseAdmin = getSupabaseAdmin()
    // Create organization
    const { data: organization, error: orgError } = await (supabaseAdmin
      .from('organizations') as any)
      .insert({
        name: session.metadata?.organization_name || 'My Organization',
      })
      .select()
      .single() as any

    if (orgError || !organization) {
      console.error('Failed to create organization:', orgError)
      return
    }

    // Create subscription record
    const { error: subError } = await (supabaseAdmin
      .from('subscriptions') as any)
      .insert({
        organization_id: organization.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        tier,
        status: subscription.status === 'trialing' ? 'trialing' : 'active',
        current_period_start: new Date((subscription.current_period_start || 0) * 1000).toISOString(),
        current_period_end: new Date((subscription.current_period_end || 0) * 1000).toISOString(),
        trial_end: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
      })

    if (subError) {
      console.error('Failed to create subscription:', subError)
      return
    }

    // Update user profile to link to organization
    const { error: profileError } = await (supabaseAdmin
      .from('profiles') as any)
      .update({
        organization_id: organization.id,
        role: 'owner',
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Failed to update profile:', profileError)
      return
    }

    // Create owner license (free, automatically assigned)
    const { error: licenseError } = await (supabaseAdmin
      .from('licenses') as any)
      .insert({
        organization_id: organization.id,
        type: 'owner',
        assigned_to: userId,
        status: 'active',
      })

    if (licenseError) {
      console.error('Failed to create owner license:', licenseError)
      return
    }
  } else {
    // This is a license purchase
    const licenseType = session.metadata?.license_type as 'management' | 'field_staff'
    const organizationId = session.metadata?.organization_id

    if (!organizationId || !licenseType) {
      console.error('Missing organization_id or license_type in metadata')
      return
    }

    // Get the subscription item ID
    const subscriptionItemId = subscription.items.data[0]?.id

    const supabaseAdmin = getSupabaseAdmin()
    // Create license record
    const { error: licenseError } = await (supabaseAdmin
      .from('licenses') as any)
      .insert({
        organization_id: organizationId,
        stripe_subscription_item_id: subscriptionItemId,
        type: licenseType,
        status: 'unassigned',
      })

    if (licenseError) {
      console.error('Failed to create license:', licenseError)
      return
    }
  }
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  const sub = subscription as any
  const supabaseAdmin = getSupabaseAdmin()
  // Update subscription status in database
  const { error } = await (supabaseAdmin
    .from('subscriptions') as any)
    .update({
      status: sub.status as any,
      current_period_start: new Date((sub.current_period_start || 0) * 1000).toISOString(),
      current_period_end: new Date((sub.current_period_end || 0) * 1000).toISOString(),
      trial_end: sub.trial_end
        ? new Date(sub.trial_end * 1000).toISOString()
        : null,
    })
    .eq('stripe_subscription_id', sub.id)

  if (error) {
    console.error('Failed to update subscription:', error)
  }
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
) {
  const sub = subscription as any
  const supabaseAdmin = getSupabaseAdmin()
  // Mark subscription as cancelled
  const { error } = await (supabaseAdmin
    .from('subscriptions') as any)
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', sub.id)

  if (error) {
    console.error('Failed to cancel subscription:', error)
  }
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
) {
  const inv = invoice as any
  const subscriptionId = inv.subscription as string

  if (!subscriptionId) return

  const supabaseAdmin = getSupabaseAdmin()
  // Update subscription status to past_due
  const { error } = await (supabaseAdmin
    .from('subscriptions') as any)
    .update({
      status: 'past_due',
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    console.error('Failed to update subscription to past_due:', error)
  }

  // TODO: Send email notification to organization owner
}
