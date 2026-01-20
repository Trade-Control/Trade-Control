'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'

export async function getLicenses(): Promise<any[]> {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canManageLicenses) {
    return []
  }

  const supabase = await createClient()

  const { data, error } = await (supabase
    .from('licenses') as any)
    .select(`
      *,
      assigned_user:profiles(id, first_name, last_name, email, role)
    `)
    .eq('organization_id', user.organization_id)
    .order('created_at') as any

  if (error) {
    console.error('Error fetching licenses:', error)
    return []
  }

  return (data || []) as any[]
}

export async function assignLicense(licenseId: string, userId: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canManageLicenses) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { error } = await (supabase
    .from('licenses') as any)
    .update({ 
      assigned_to: userId, 
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', licenseId)
    .eq('organization_id', user.organization_id)

  if (error) {
    console.error('Error assigning license:', error)
    return { error: 'Failed to assign license' }
  }

  // Log audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'update',
    entity_type: 'license',
    entity_id: licenseId,
    details: { assigned_to: userId },
  })

  revalidatePath('/licenses')
  return { success: true }
}

export async function unassignLicense(licenseId: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canManageLicenses) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { error } = await (supabase
    .from('licenses') as any)
    .update({ 
      assigned_to: null, 
      status: 'unassigned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', licenseId)
    .eq('organization_id', user.organization_id)

  if (error) {
    console.error('Error unassigning license:', error)
    return { error: 'Failed to unassign license' }
  }

  // Log audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'update',
    entity_type: 'license',
    entity_id: licenseId,
    details: { unassigned: true },
  })

  revalidatePath('/licenses')
  return { success: true }
}

export async function purchaseLicense(type: 'management' | 'field_staff') {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canManageLicenses) {
    return { error: 'Unauthorized' }
  }

  // This would integrate with Stripe to add a subscription item
  // For now, return error indicating Stripe integration needed
  return { error: 'License purchase requires Stripe integration' }
}

export async function removeLicense(licenseId: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canManageLicenses) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  // Check if license is assigned
  const { data: license } = await (supabase
    .from('licenses') as any)
    .select('assigned_to, stripe_subscription_item_id')
    .eq('id', licenseId)
    .eq('organization_id', user.organization_id)
    .single()

  if (!license) {
    return { error: 'License not found' }
  }

  if (license.assigned_to) {
    return { error: 'Cannot remove assigned license. Unassign first.' }
  }

  // Delete license
  const { error } = await (supabase
    .from('licenses') as any)
    .delete()
    .eq('id', licenseId)
    .eq('organization_id', user.organization_id)

  if (error) {
    console.error('Error removing license:', error)
    return { error: 'Failed to remove license' }
  }

  // Log audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'delete',
    entity_type: 'license',
    entity_id: licenseId,
  })

  revalidatePath('/licenses')
  return { success: true }
}
