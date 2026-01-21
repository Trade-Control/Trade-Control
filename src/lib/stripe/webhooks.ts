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
  const startTime = Date.now()
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  const userId = session.metadata?.user_id

  console.log('=== WEBHOOK: checkout.session.completed ===')
  console.log('Session ID:', session.id)
  console.log('Customer ID:', customerId)
  console.log('Subscription ID:', subscriptionId)
  console.log('User ID:', userId)
  console.log('Metadata:', session.metadata)

  if (!userId) {
    console.error('❌ No user_id in session metadata')
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
    
    // IDEMPOTENCY CHECK: Check if subscription already exists for this Stripe subscription ID
    const { data: existingSubscription } = await (supabaseAdmin
      .from('subscriptions') as any)
      .select('id, organization_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle()
    
    if (existingSubscription) {
      console.log('✓ Subscription already exists (idempotent check), skipping creation')
      console.log('Existing organization ID:', existingSubscription.organization_id)
      
      // Verify profile is linked correctly
      const { data: profile } = await (supabaseAdmin
        .from('profiles') as any)
        .select('organization_id')
        .eq('id', userId)
        .single()
      
      if (profile && profile.organization_id !== existingSubscription.organization_id) {
        console.log('⚠️  Profile linked to wrong org, fixing...')
        await (supabaseAdmin
          .from('profiles') as any)
          .update({ organization_id: existingSubscription.organization_id })
          .eq('id', userId)
        console.log('✓ Profile relinked to correct organization')
      }
      
      const duration = Date.now() - startTime
      console.log(`✓ Webhook completed (idempotent) in ${duration}ms`)
      return
    }

    // IDEMPOTENCY CHECK: Check if organization already exists for this user
    const { data: existingProfile } = await (supabaseAdmin
      .from('profiles') as any)
      .select('organization_id')
      .eq('id', userId)
      .single()
    
    let organizationId: string
    let isNewOrganization = false

    if (existingProfile?.organization_id) {
      console.log('✓ User already has organization:', existingProfile.organization_id)
      organizationId = existingProfile.organization_id
      
      // Check if this org already has a subscription
      const { data: orgSubscription } = await (supabaseAdmin
        .from('subscriptions') as any)
        .select('id')
        .eq('organization_id', organizationId)
        .maybeSingle()
      
      if (orgSubscription) {
        console.log('⚠️  Organization already has subscription, updating it instead')
        // Update existing subscription
        await (supabaseAdmin
          .from('subscriptions') as any)
          .update({
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
          .eq('id', orgSubscription.id)
        
        const duration = Date.now() - startTime
        console.log(`✓ Webhook completed (updated existing) in ${duration}ms`)
        return
      }
    } else {
      // Create new organization
      console.log('Creating new organization...')
      const { data: organization, error: orgError } = await (supabaseAdmin
        .from('organizations') as any)
        .insert({
          name: session.metadata?.organization_name || 'My Organization',
        })
        .select()
        .single() as any

      if (orgError || !organization) {
        console.error('❌ Failed to create organization:', orgError)
        return
      }
      
      organizationId = organization.id
      isNewOrganization = true
      console.log('✓ Organization created:', organizationId)
    }

    // Create subscription record
    console.log('Creating subscription record...')
    const { error: subError } = await (supabaseAdmin
      .from('subscriptions') as any)
      .insert({
        organization_id: organizationId,
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
      console.error('❌ Failed to create subscription:', subError)
      // Rollback: delete organization if we created it
      if (isNewOrganization) {
        console.log('Rolling back: deleting organization...')
        await (supabaseAdmin
          .from('organizations') as any)
          .delete()
          .eq('id', organizationId)
      }
      return
    }
    console.log('✓ Subscription created')

    // Update user profile to link to organization (if not already linked)
    if (!existingProfile?.organization_id || existingProfile.organization_id !== organizationId) {
      console.log('Linking user profile to organization...')
      const { error: profileError } = await (supabaseAdmin
        .from('profiles') as any)
        .update({
          organization_id: organizationId,
          role: 'owner',
        })
        .eq('id', userId)

      if (profileError) {
        console.error('❌ Failed to update profile:', profileError)
        // Continue anyway - subscription is created
      } else {
        console.log('✓ Profile linked to organization')
      }
    }

    // Create owner license (free, automatically assigned) if it doesn't exist
    const { data: existingLicense } = await (supabaseAdmin
      .from('licenses') as any)
      .select('id')
      .eq('organization_id', organizationId)
      .eq('type', 'owner')
      .eq('assigned_to', userId)
      .maybeSingle()

    if (!existingLicense) {
      console.log('Creating owner license...')
      const { error: licenseError } = await (supabaseAdmin
        .from('licenses') as any)
        .insert({
          organization_id: organizationId,
          type: 'owner',
          assigned_to: userId,
          status: 'active',
        })

      if (licenseError) {
        console.error('❌ Failed to create owner license:', licenseError)
        // Continue anyway - not critical
      } else {
        console.log('✓ Owner license created')
      }
    } else {
      console.log('✓ Owner license already exists')
    }

    const duration = Date.now() - startTime
    console.log(`✓ Webhook completed successfully in ${duration}ms`)
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
