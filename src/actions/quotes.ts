'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

export async function getQuotes() {
  const user = await getCurrentUser()
  if (!user?.organization_id) {
    return []
  }

  const supabase = await createClient()
  const { data, error } = await (supabase
    .from('quotes') as any)
    .select(`
      *,
      job:jobs(job_number, title),
      line_items:quote_line_items(*)
    `)
    .eq('organization_id', user.organization_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching quotes:', error)
    return []
  }

  return data || []
}

export async function getQuote(id: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id) {
    return null
  }

  const supabase = await createClient()
  const { data, error } = await (supabase
    .from('quotes') as any)
    .select(`
      *,
      job:jobs(*),
      line_items:quote_line_items(*),
      customer:contacts(*)
    `)
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  if (error) {
    console.error('Error fetching quote:', error)
    return null
  }

  return data
}

export async function createQuote(data: {
  job_id: string
  valid_until: string
  notes?: string
  line_items: Array<{
    job_code_id?: string
    description: string
    quantity: number
    unit_price: number
  }>
}) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canCreateQuotes) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()

    // Get next quote number
    const { data: org } = await (supabase
      .from('organizations') as any)
      .select('quote_number_sequence')
      .eq('id', user.organization_id)
      .single()

    const quoteNumber = `Q${String(org.quote_number_sequence).padStart(5, '0')}`

    // Calculate totals
    const subtotal = data.line_items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    )
    const gst = subtotal * 0.1 // 10% GST for Australia
    const total = subtotal + gst

    // Create quote
    const { data: quote, error: quoteError } = await (supabase
      .from('quotes') as any)
      .insert({
        organization_id: user.organization_id,
        job_id: data.job_id,
        quote_number: quoteNumber,
        status: 'draft',
        subtotal: subtotal.toFixed(2),
        gst: gst.toFixed(2),
        total: total.toFixed(2),
        valid_until: data.valid_until,
        notes: data.notes,
        created_by: user.id,
      })
      .select()
      .single()

    if (quoteError) {
      console.error('Error creating quote:', quoteError)
      return { error: 'Failed to create quote' }
    }

    // Create line items
    const lineItems = data.line_items.map((item, index) => ({
      quote_id: quote.id,
      job_code_id: item.job_code_id || null,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: (item.quantity * item.unit_price).toFixed(2),
      sort_order: index,
    }))

    const { error: lineItemsError } = await (supabase
      .from('quote_line_items') as any)
      .insert(lineItems)

    if (lineItemsError) {
      console.error('Error creating line items:', lineItemsError)
      return { error: 'Failed to create line items' }
    }

    // Update quote number sequence
    await (supabase
      .from('organizations') as any)
      .update({ quote_number_sequence: org.quote_number_sequence + 1 })
      .eq('id', user.organization_id)

    // Log audit trail
    await (supabase.from('audit_trail') as any).insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'create',
      entity_type: 'quote',
      entity_id: quote.id,
      details: { quote_number: quoteNumber, job_id: data.job_id },
    })

    revalidatePath('/quotes')
    return { success: true, id: quote.id }
  } catch (error) {
    console.error('Error creating quote:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function updateQuoteStatus(id: string, status: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canCreateQuotes) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()
  const { error } = await (supabase
    .from('quotes') as any)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', user.organization_id)

  if (error) {
    console.error('Error updating quote status:', error)
    return { error: 'Failed to update quote status' }
  }

  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'update',
    entity_type: 'quote',
    entity_id: id,
    details: { status },
  })

  revalidatePath('/quotes')
  revalidatePath(`/quotes/${id}`)
  return { success: true }
}

export async function deleteQuote(id: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canCreateQuotes) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()
  const { error } = await (supabase
    .from('quotes') as any)
    .delete()
    .eq('id', id)
    .eq('organization_id', user.organization_id)

  if (error) {
    console.error('Error deleting quote:', error)
    return { error: 'Failed to delete quote' }
  }

  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'delete',
    entity_type: 'quote',
    entity_id: id,
  })

  revalidatePath('/quotes')
  return { success: true }
}
