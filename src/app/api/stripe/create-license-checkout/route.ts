import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { stripe, STRIPE_PRICES, addSubscriptionItem } from '@/lib/stripe/client'

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
      .select('stripe_customer_id, stripe_subscription_id, status')
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

    // Add license(s) to existing subscription as subscription item(s)
    // Stripe automatically handles trial billing - items added during trial are billed when trial ends
    const createdLicenses = []
    
    for (let i = 0; i < quantity; i++) {
      // Add subscription item in Stripe
      const subscriptionItem = await addSubscriptionItem({
        subscriptionId: subscription.stripe_subscription_id,
        priceId: priceId,
        quantity: 1, // Each license is a separate item for easier management
        prorationBehavior: 'create_prorations',
      })

      // Create license record in database
      const { data: license, error: licenseError } = await (supabase
        .from('licenses') as any)
        .insert({
          organization_id: user.organization_id,
          type: license_type,
          status: 'active',
          stripe_subscription_item_id: subscriptionItem.id,
          // assigned_to: null (unassigned initially)
        })
        .select()
        .single()

      if (licenseError) {
        console.error('Error creating license record:', licenseError)
        // Continue with other licenses even if one fails
      } else {
        createdLicenses.push(license)
      }
    }

    return NextResponse.json({ 
      success: true, 
      licenses: createdLicenses,
      message: `Successfully added ${quantity} ${license_type} license(s). ${
        subscription.status === 'trialing' 
          ? 'You will be charged when your trial ends.' 
          : 'Charges will appear on your next invoice.'
      }`
    })
  } catch (error: any) {
    console.error('Error creating license checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
