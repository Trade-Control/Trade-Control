'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'

export async function getContacts(type?: 'customer' | 'supplier'): Promise<any[]> {
  const user = await getCurrentUser()
  if (!user?.organization_id) {
    return []
  }
  const supabase = await createClient()

  let query = (supabase
    .from('contacts') as any)
    .select('*')
    .eq('organization_id', user.organization_id)

  if (type) {
    query = query.eq('type', type)
  }

  query = query.order('name', { ascending: true })

  const { data, error } = await query

  if (error) {
    console.error('Error fetching contacts:', error)
    return []
  }

  return (data || []) as any[]
}

export async function getContact(id: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id) {
    return null
  }
  const supabase = await createClient()

  const { data, error } = await (supabase
    .from('contacts') as any)
    .select('*')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single() as any

  if (error) {
    console.error('Error fetching contact:', error)
    return null
  }

  return data as any
}

export async function createContact(data: {
  type: 'customer' | 'supplier'
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postcode?: string
  abn?: string
}) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canManageContacts) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { data: contact, error } = await (supabase
    .from('contacts') as any)
    .insert({
      organization_id: user.organization_id,
      ...data,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating contact:', error)
    return { error: 'Failed to create contact' }
  }

  // Log audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'create',
    entity_type: 'contact',
    entity_id: contact.id,
    details: { name: data.name, type: data.type },
  })

  revalidatePath('/contacts')
  return { success: true, id: contact.id }
}

export async function updateContact(
  id: string,
  data: {
    name?: string
    email?: string
    phone?: string
    address?: string
    city?: string
    state?: string
    postcode?: string
    abn?: string
  }
) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canManageContacts) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { error } = await (supabase
    .from('contacts') as any)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', user.organization_id)

  if (error) {
    console.error('Error updating contact:', error)
    return { error: 'Failed to update contact' }
  }

  // Log audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'update',
    entity_type: 'contact',
    entity_id: id,
    details: data,
  })

  revalidatePath('/contacts')
  revalidatePath(`/contacts/${id}`)
  return { success: true }
}

export async function deleteContact(id: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canManageContacts) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { error } = await (supabase
    .from('contacts') as any)
    .delete()
    .eq('id', id)
    .eq('organization_id', user.organization_id)

  if (error) {
    console.error('Error deleting contact:', error)
    return { error: 'Failed to delete contact' }
  }

  // Log audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'delete',
    entity_type: 'contact',
    entity_id: id,
  })

  revalidatePath('/contacts')
  return { success: true }
}
