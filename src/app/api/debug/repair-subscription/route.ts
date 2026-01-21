import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
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
    const supabase = await createClient()
    const supabaseAdmin = getSupabaseAdmin()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('Repairing subscription for user:', user.id)

    // Get user's profile
    const { data: profile } = await (supabaseAdmin
      .from('profiles') as any)
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    console.log('Current profile:', profile)

    // Find ANY subscription in the database
    const { data: allSubscriptions } = await (supabaseAdmin
      .from('subscriptions') as any)
      .select('*')
      .in('status', ['trialing', 'active'])
      .order('created_at', { ascending: false })

    console.log('Found subscriptions:', allSubscriptions?.length)

    if (!allSubscriptions || allSubscriptions.length === 0) {
      return NextResponse.json({
        error: 'No active subscriptions found in database',
        needsNewSubscription: true,
      }, { status: 404 })
    }

    // Try to find a subscription that matches this user's email via Stripe customer
    // For now, just take the most recent active subscription
    const targetSubscription = allSubscriptions[0]
    const targetOrgId = targetSubscription.organization_id

    console.log('Target subscription:', targetSubscription.id)
    console.log('Target organization:', targetOrgId)

    // Get the target organization
    const { data: targetOrg } = await (supabaseAdmin
      .from('organizations') as any)
      .select('*')
      .eq('id', targetOrgId)
      .single()

    // Update user's profile to link to this organization
    const { error: updateError } = await (supabaseAdmin
      .from('profiles') as any)
      .update({
        organization_id: targetOrgId,
        role: 'owner', // Ensure they're an owner
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Check if owner license exists for this user in the organization
    const { data: existingLicense } = await (supabaseAdmin
      .from('licenses') as any)
      .select('*')
      .eq('organization_id', targetOrgId)
      .eq('type', 'owner')
      .eq('assigned_to', user.id)
      .maybeSingle()

    if (!existingLicense) {
      // Create owner license
      await (supabaseAdmin
        .from('licenses') as any)
        .insert({
          organization_id: targetOrgId,
          type: 'owner',
          assigned_to: user.id,
          status: 'active',
        })
      console.log('Created owner license')
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription repaired successfully',
      changes: {
        linkedToOrganization: targetOrgId,
        organizationName: targetOrg?.name,
        subscription: {
          id: targetSubscription.id,
          tier: targetSubscription.tier,
          status: targetSubscription.status,
        },
      },
    })
  } catch (error: any) {
    console.error('Repair error:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}
