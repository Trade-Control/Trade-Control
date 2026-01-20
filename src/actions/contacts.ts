'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requirePermissions } from '@/lib/auth/get-user'
import { permissions } from '@/lib/auth/permissions'
import { Database } from '@/types/database'

export async function getContacts(type?: 'customer' | 'supplier'): Promise<any[]> {
  const user = await requireAuth()
  const supabase = await createClient()

  let query = (supabase
    .from('contacts') as any)
    .select('*')
    .eq('organization_id', user.organizationId)
    .order('name')

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query as any

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as any[]
}

export async function getContact(id: string) {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data, error } = await (supabase
    .from('contacts') as any)
    .select('*')
    .eq('id', id)
    .eq('organization_id', user.organizationId)
    .single() as any

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function createContact(formData: {
  type: 'customer' | 'supplier'
  name: string
  company?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postcode?: string
  abn?: string
}) {
  const user = await requireAuth()
  const userPerms = await requirePermissions()

  if (!permissions.canManageContacts(userPerms)) {
    throw new Error('Unauthorized')
  }

  if (!user.organizationId) {
    throw new Error('Organization not found')
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      organization_id: user.organizationId,
      type: formData.type,
      name: formData.name,
      company: formData.company,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      postcode: formData.postcode,
      abn: formData.abn,
    } as any)
    .select()
    .single() as any

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Failed to create contact')
  }

  // Log to audit trail
  await supabase.from('audit_trail').insert({
    organization_id: user.organizationId,
    user_id: user.id,
    action: 'create',
    resource_type: 'contact',
    resource_id: data.id,
    details: { name: formData.name, type: formData.type },
  } as any)

  revalidatePath('/contacts')
  revalidatePath('/dashboard')

  return data
}

export async function updateContact(
  id: string,
  formData: {
    type?: 'customer' | 'supplier'
    name?: string
    company?: string
    email?: string
    phone?: string
    address?: string
    city?: string
    state?: string
    postcode?: string
    abn?: string
  }
) {
  const user = await requireAuth()
  const userPerms = await requirePermissions()

  if (!permissions.canManageContacts(userPerms)) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()

  const { data, error } = await (supabase
    .from('contacts') as any)
    .update(formData)
    .eq('id', id)
    .eq('organization_id', user.organizationId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Log to audit trail
  await supabase.from('audit_trail').insert({
    organization_id: user.organizationId,
    user_id: user.id,
    action: 'update',
    resource_type: 'contact',
    resource_id: id,
    details: formData,
  } as any)

  revalidatePath('/contacts')
  revalidatePath(`/contacts/${id}`)

  return data
}

export async function deleteContact(id: string) {
  const user = await requireAuth()
  const userPerms = await requirePermissions()

  if (!permissions.canManageContacts(userPerms)) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id)
    .eq('organization_id', user.organizationId)

  if (error) {
    throw new Error(error.message)
  }

  // Log to audit trail
  await supabase.from('audit_trail').insert({
    organization_id: user.organizationId,
    user_id: user.id,
    action: 'delete',
    resource_type: 'contact',
    resource_id: id,
  } as any)

  revalidatePath('/contacts')
}
