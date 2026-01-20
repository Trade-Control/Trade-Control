'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requirePermissions } from '@/lib/auth/get-user'
import { permissions } from '@/lib/auth/permissions'

export async function getInventoryItems() {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('organization_id', user.organizationId)
    .order('name')

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function createInventoryItem(formData: {
  name: string
  sku?: string
  description?: string
  quantity: number
  unit_cost?: number
  location?: string
  reorder_level?: number
}) {
  const user = await requireAuth()
  const userPerms = await requirePermissions()

  if (!permissions.canManageInventory(userPerms)) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_items')
    .insert({
      organization_id: user.organizationId,
      ...formData,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/inventory')
  return data
}

export async function allocateInventoryToJob(params: {
  inventory_item_id: string
  job_id: string
  quantity: number
}) {
  const user = await requireAuth()
  const userPerms = await requirePermissions()

  if (!permissions.canManageInventory(userPerms)) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()

  // Check available quantity
  const { data: item } = await supabase
    .from('inventory_items')
    .select('quantity')
    .eq('id', params.inventory_item_id)
    .single()

  if (!item || item.quantity < params.quantity) {
    throw new Error('Insufficient inventory quantity')
  }

  // Create allocation
  const { data, error } = await supabase
    .from('inventory_allocations')
    .insert({
      inventory_item_id: params.inventory_item_id,
      job_id: params.job_id,
      quantity: params.quantity,
      allocated_by: user.id,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Update inventory quantity
  await supabase
    .from('inventory_items')
    .update({ quantity: item.quantity - params.quantity })
    .eq('id', params.inventory_item_id)

  revalidatePath('/inventory')
  revalidatePath(`/jobs/${params.job_id}`)
  
  return data
}
