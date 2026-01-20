'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requirePermissions } from '@/lib/auth/get-user'
import { permissions } from '@/lib/auth/permissions'

export async function getLicenses(): Promise<any[]> {
  const user = await requireAuth()
  const userPerms = await requirePermissions()

  if (!permissions.canManageLicenses(userPerms)) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()

  const { data, error } = await (supabase
    .from('licenses') as any)
    .select(`
      *,
      assigned_user:profiles(id, first_name, last_name, email, role)
    `)
    .eq('organization_id', user.organizationId)
    .order('created_at') as any

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as any[]
}

export async function getAvailableUsers(): Promise<any[]> {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data, error } = await (supabase
    .from('profiles') as any)
    .select('id, first_name, last_name, email, role')
    .eq('organization_id', user.organizationId)
    .neq('role', 'owner') as any

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as any[]
}

export async function assignLicense(licenseId: string, userId: string) {
  const user = await requireAuth()
  const userPerms = await requirePermissions()

  if (!permissions.canManageLicenses(userPerms)) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()

  // Update license
  const { error: licenseError } = await (supabase
    .from('licenses') as any)
    .update({
      assigned_to: userId,
      status: 'active',
    })
    .eq('id', licenseId)
    .eq('organization_id', user.organizationId)

  if (licenseError) {
    throw new Error(licenseError.message)
  }

  // Get license type to update user role
  const { data: license } = await (supabase
    .from('licenses') as any)
    .select('type')
    .eq('id', licenseId)
    .single() as any

  if (license) {
    await (supabase
      .from('profiles') as any)
      .update({ role: license.type })
      .eq('id', userId)
  }

  // Log to audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organizationId,
    user_id: user.id,
    action: 'assign_license',
    resource_type: 'license',
    resource_id: licenseId,
    details: { assigned_user_id: userId },
  })

  revalidatePath('/licenses')
}

export async function unassignLicense(licenseId: string) {
  const user = await requireAuth()
  const userPerms = await requirePermissions()

  if (!permissions.canManageLicenses(userPerms)) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()

  // Get current assignment
  const { data: license } = await (supabase
    .from('licenses') as any)
    .select('assigned_to')
    .eq('id', licenseId)
    .single() as any

  // Update license
  const { error } = await (supabase
    .from('licenses') as any)
    .update({
      assigned_to: null,
      status: 'unassigned',
    })
    .eq('id', licenseId)
    .eq('organization_id', user.organizationId)

  if (error) {
    throw new Error(error.message)
  }

  // Log to audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organizationId,
    user_id: user.id,
    action: 'unassign_license',
    resource_type: 'license',
    resource_id: licenseId,
    details: { unassigned_user_id: license?.assigned_to },
  })

  revalidatePath('/licenses')
}
