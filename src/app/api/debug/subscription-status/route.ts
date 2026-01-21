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

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const supabaseAdmin = getSupabaseAdmin()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get profile with RLS
    const { data: profile, error: profileError } = await (supabase
      .from('profiles') as any)
      .select('*')
      .eq('id', user.id)
      .single()

    // Get profile with admin (no RLS)
    const { data: adminProfile, error: adminProfileError } = await (supabaseAdmin
      .from('profiles') as any)
      .select('*')
      .eq('id', user.id)
      .single()

    // Get all organizations for this user (admin)
    const { data: allOrgs, error: orgsError } = await (supabaseAdmin
      .from('organizations') as any)
      .select('*')

    // Get all subscriptions (admin)
    const { data: allSubs, error: subsError } = await (supabaseAdmin
      .from('subscriptions') as any)
      .select('*')

    // Try to get subscription via RLS
    let rlsSubscription = null
    if (profile?.organization_id) {
      const { data: sub } = await (supabase
        .from('subscriptions') as any)
        .select('*')
        .eq('organization_id', profile.organization_id)
        .maybeSingle()
      rlsSubscription = sub
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile: {
        withRLS: profile,
        withAdmin: adminProfile,
        error: profileError || adminProfileError,
      },
      organizations: {
        all: allOrgs,
        count: allOrgs?.length || 0,
      },
      subscriptions: {
        all: allSubs,
        count: allSubs?.length || 0,
        foundViaRLS: rlsSubscription,
      },
      diagnosis: {
        hasProfile: !!profile,
        hasOrganizationId: !!profile?.organization_id,
        organizationId: profile?.organization_id,
        canSeeSubscriptionViaRLS: !!rlsSubscription,
        subscriptionsInDB: allSubs?.length || 0,
      },
    })
  } catch (error: any) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}
