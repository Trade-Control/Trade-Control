'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase config:', { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!serviceRoleKey 
    })
    throw new Error('Supabase admin configuration is missing')
  }
  
  return createAdminClient<Database>(supabaseUrl, serviceRoleKey)
}

export async function ensureOrganization() {
  try {
    // First check if we can get the auth user directly
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('ensureOrganization: Auth error:', authError)
      console.error('Auth error details:', JSON.stringify(authError, null, 2))
      return { error: `Authentication error: ${authError.message}` }
    }
    
    if (!authUser) {
      console.error('ensureOrganization: No auth user found - cookies may not be set')
      return { error: 'Unauthorized - please log in' }
    }
    
    console.log('ensureOrganization: Auth user found', { userId: authUser.id, email: authUser.email })
    
    // Check if profile exists, create if it doesn't
    const { data: existingProfile, error: profileCheckError } = await (supabase
      .from('profiles') as any)
      .select('id, organization_id')
      .eq('id', authUser.id)
      .single()

    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      console.error('ensureOrganization: Error checking profile:', profileCheckError)
    }

    let profile = existingProfile

    // Create profile if it doesn't exist
    if (!profile) {
      console.log('ensureOrganization: Profile not found, creating profile for user:', authUser.id)
      
      // Use admin client to create profile (bypass RLS)
      let supabaseAdmin
      try {
        supabaseAdmin = getSupabaseAdmin()
      } catch (adminError: any) {
        console.error('Failed to get admin client for profile creation:', adminError)
        return { error: 'Server configuration error. Please contact support.' }
      }
      
      const { data: newProfile, error: createProfileError } = await (supabaseAdmin
        .from('profiles') as any)
        .insert({
          id: authUser.id,
          email: authUser.email,
          first_name: authUser.user_metadata?.first_name || null,
          last_name: authUser.user_metadata?.last_name || null,
          role: 'owner',
        })
        .select()
        .single()

      if (createProfileError || !newProfile) {
        console.error('ensureOrganization: Failed to create profile:', createProfileError)
        return { error: `Failed to create user profile: ${createProfileError?.message || 'Unknown error'}` }
      }

      profile = newProfile
      console.log('ensureOrganization: Profile created:', profile.id)
    }

    const userId = authUser.id
    const organizationId = profile.organization_id

    // Check if user already has organization
    if (organizationId) {
      // Verify organization exists
      const { data: org, error: orgError } = await (supabase
        .from('organizations') as any)
        .select('id, onboarding_completed')
        .eq('id', organizationId)
        .single()

      if (orgError) {
        console.error('Error fetching organization:', orgError)
      }

      if (org) {
        console.log('Organization found:', org.id)
        return { success: true, organization_id: org.id, onboarding_completed: org.onboarding_completed }
      }
    }

    // Use admin client to check for subscription and create org if needed
    let supabaseAdmin
    try {
      supabaseAdmin = getSupabaseAdmin()
    } catch (adminError: any) {
      console.error('Failed to get admin client:', adminError)
      return { error: 'Server configuration error. Please contact support.' }
    }
    
    // Check if profile was updated recently (webhook might have run)
    const { data: updatedProfile, error: updatedProfileError } = await (supabaseAdmin
      .from('profiles') as any)
      .select('organization_id')
      .eq('id', userId)
      .single()

    if (updatedProfileError) {
      console.error('Error fetching updated profile:', updatedProfileError)
    }

    if (updatedProfile?.organization_id) {
      const { data: org, error: orgError } = await (supabaseAdmin
        .from('organizations') as any)
        .select('id, onboarding_completed')
        .eq('id', updatedProfile.organization_id)
        .single()

      if (orgError) {
        console.error('Error fetching organization from admin:', orgError)
      }

      if (org) {
        console.log('Organization found via admin:', org.id)
        return { success: true, organization_id: org.id, onboarding_completed: org.onboarding_completed }
      }
    }

    // Create new organization (fallback if webhook hasn't fired yet)
    // Use admin client to bypass RLS
    console.log('Creating new organization for user:', userId)
    const { data: newOrg, error: orgError } = await (supabaseAdmin
      .from('organizations') as any)
      .insert({
        name: 'My Organization',
        onboarding_completed: false,
      })
      .select()
      .single()

    if (orgError || !newOrg) {
      console.error('Failed to create organization:', orgError)
      return { error: `Failed to create organization: ${orgError?.message || 'Unknown error'}` }
    }

    console.log('Organization created:', newOrg.id)

    // Update profile with new organization using admin client
    const { error: updateError } = await (supabaseAdmin
      .from('profiles') as any)
      .update({ organization_id: newOrg.id })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to update profile:', updateError)
      return { error: `Failed to link organization: ${updateError.message || 'Unknown error'}` }
    }

    console.log('Profile updated with organization:', newOrg.id)
    return { success: true, organization_id: newOrg.id, onboarding_completed: false }
  } catch (error: any) {
    console.error('ensureOrganization exception:', error)
    console.error('Error stack:', error.stack)
    return { error: `Unexpected error: ${error.message || error.toString()}` }
  }
}

export async function updateOrganization(data: {
  name: string
  abn?: string
  address?: string
  city?: string
  state?: string
  postcode?: string
  phone?: string
  email?: string
}) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      console.error('updateOrganization: No user found')
      return { error: 'Unauthorized - please log in' }
    }
    
    if (!user.organization_id) {
      console.error('updateOrganization: User has no organization_id', { 
        userId: user.id, 
        email: user.email 
      })
      // Try to ensure organization exists first
      const ensureResult = await ensureOrganization()
      if (ensureResult.error || !ensureResult.organization_id) {
        return { error: 'No organization found. Please contact support.' }
      }
      // Retry with the new organization_id
      const retryUser = await getCurrentUser()
      if (!retryUser?.organization_id) {
        return { error: 'Failed to create organization. Please try again.' }
      }
      // Continue with update using retryUser
      return updateOrganizationWithOrgId(data, retryUser.organization_id)
    }

    return updateOrganizationWithOrgId(data, user.organization_id)
  } catch (error: any) {
    console.error('updateOrganization exception:', error)
    console.error('Error stack:', error.stack)
    return { error: `Unexpected error: ${error.message || error.toString()}` }
  }
}

async function updateOrganizationWithOrgId(
  data: {
    name: string
    abn?: string
    address?: string
    city?: string
    state?: string
    postcode?: string
    phone?: string
    email?: string
  },
  organizationId: string
) {
  const supabase = await createClient()

  const { error } = await (supabase
    .from('organizations') as any)
    .update({
      name: data.name,
      abn: data.abn || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      postcode: data.postcode || null,
      phone: data.phone || null,
      email: data.email || null,
      onboarding_completed: true,
    })
    .eq('id', organizationId)

  if (error) {
    console.error('Error updating organization:', error)
    return { error: error.message || 'Failed to update organization' }
  }

  return { success: true }
}
