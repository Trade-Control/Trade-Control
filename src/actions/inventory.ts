'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'

export async function getInventoryItems(): Promise<any[]> {
  const user = await getCurrentUser()
  if (!user?.organization_id) {
    return []
  }
  const supabase = await createClient()

  const { data, error } = await (supabase
    .from('inventory_items') as any)
    .select('*')
    .eq('organization_id', user.organization_id)
    .order('name') as any

  if (error) {
    console.error('Error fetching inventory:', error)
    return []
  }

  return (data || []) as any[]
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
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canManageInventory) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { data, error } = await (supabase
    .from('inventory_items') as any)
    .insert({
      organization_id: user.organization_id,
      ...formData,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating inventory item:', error)
    return { error: 'Failed to create inventory item' }
  }

  // Log audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'create',
    entity_type: 'inventory_item',
    entity_id: data.id,
    details: { name: formData.name },
  })

  revalidatePath('/inventory')
  return { success: true, id: data.id }
}

export async function updateInventoryItem(
  id: string,
  formData: {
    name?: string
    sku?: string
    description?: string
    quantity?: number
    unit_cost?: number
    location?: string
    reorder_level?: number
  }
) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canManageInventory) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { error } = await (supabase
    .from('inventory_items') as any)
    .update({ ...formData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', user.organization_id)

  if (error) {
    console.error('Error updating inventory item:', error)
    return { error: 'Failed to update inventory item' }
  }

  // Log audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'update',
    entity_type: 'inventory_item',
    entity_id: id,
    details: formData,
  })

  revalidatePath('/inventory')
  return { success: true }
}

export async function allocateInventory(formData: {
  inventory_item_id: string
  job_id: string
  quantity: number
}) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canAllocateInventory) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  // Check if enough inventory available
  const { data: item } = await (supabase
    .from('inventory_items') as any)
    .select('quantity')
    .eq('id', formData.inventory_item_id)
    .single()

  if (!item || parseFloat(item.quantity) < formData.quantity) {
    return { error: 'Insufficient inventory' }
  }

  // Create allocation
  const { data: allocation, error: allocError } = await (supabase
    .from('inventory_allocations') as any)
    .insert({
      organization_id: user.organization_id,
      ...formData,
      allocated_by: user.id,
    })
    .select()
    .single()

  if (allocError) {
    console.error('Error allocating inventory:', allocError)
    return { error: 'Failed to allocate inventory' }
  }

  // Update inventory quantity
  const newQuantity = parseFloat(item.quantity) - formData.quantity
  await (supabase
    .from('inventory_items') as any)
    .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
    .eq('id', formData.inventory_item_id)

  // Log audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'create',
    entity_type: 'inventory_allocation',
    entity_id: allocation.id,
    details: formData,
  })

  revalidatePath('/inventory')
  revalidatePath(`/jobs/${formData.job_id}`)
  return { success: true, id: allocation.id }
}

export async function deallocateInventory(allocationId: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canAllocateInventory) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  // Get allocation details
  const { data: allocation } = await (supabase
    .from('inventory_allocations') as any)
    .select('*')
    .eq('id', allocationId)
    .eq('organization_id', user.organization_id)
    .single()

  if (!allocation) {
    return { error: 'Allocation not found' }
  }

  // Delete allocation
  const { error } = await (supabase
    .from('inventory_allocations') as any)
    .delete()
    .eq('id', allocationId)

  if (error) {
    console.error('Error deallocating inventory:', error)
    return { error: 'Failed to deallocate inventory' }
  }

  // Return inventory to stock
  const { data: item } = await (supabase
    .from('inventory_items') as any)
    .select('quantity')
    .eq('id', allocation.inventory_item_id)
    .single()

  if (item) {
    const newQuantity = parseFloat(item.quantity) + allocation.quantity
    await (supabase
      .from('inventory_items') as any)
      .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
      .eq('id', allocation.inventory_item_id)
  }

  // Log audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'delete',
    entity_type: 'inventory_allocation',
    entity_id: allocationId,
  })

  revalidatePath('/inventory')
  revalidatePath(`/jobs/${allocation.job_id}`)
  return { success: true }
}
