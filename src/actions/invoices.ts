'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

export async function getInvoices() {
  const user = await getCurrentUser()
  if (!user?.organization_id) {
    return []
  }

  const supabase = await createClient()
  const { data, error } = await (supabase
    .from('invoices') as any)
    .select(`
      *,
      job:jobs(job_number, title),
      line_items:invoice_line_items(*)
    `)
    .eq('organization_id', user.organization_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching invoices:', error)
    return []
  }

  return data || []
}

export async function getInvoice(id: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id) {
    return null
  }

  const supabase = await createClient()
  const { data, error } = await (supabase
    .from('invoices') as any)
    .select(`
      *,
      job:jobs(*),
      quote:quotes(*),
      line_items:invoice_line_items(*),
      customer:contacts(*)
    `)
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  if (error) {
    console.error('Error fetching invoice:', error)
    return null
  }

  return data
}

export async function createInvoice(data: {
  job_id: string
  quote_id?: string
  due_date: string
  notes?: string
  line_items: Array<{
    job_code_id?: string
    description: string
    quantity: number
    unit_price: number
  }>
}) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canCreateInvoices) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()

    // Get next invoice number
    const { data: org } = await (supabase
      .from('organizations') as any)
      .select('invoice_number_sequence')
      .eq('id', user.organization_id)
      .single()

    const invoiceNumber = `INV${String(org.invoice_number_sequence).padStart(5, '0')}`

    // Calculate totals
    const subtotal = data.line_items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    )
    const gst = subtotal * 0.1 // 10% GST for Australia
    const total = subtotal + gst

    // Create invoice
    const { data: invoice, error: invoiceError } = await (supabase
      .from('invoices') as any)
      .insert({
        organization_id: user.organization_id,
        job_id: data.job_id,
        quote_id: data.quote_id || null,
        invoice_number: invoiceNumber,
        status: 'draft',
        subtotal: subtotal.toFixed(2),
        gst: gst.toFixed(2),
        total: total.toFixed(2),
        amount_paid: 0,
        due_date: data.due_date,
        notes: data.notes,
        created_by: user.id,
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError)
      return { error: 'Failed to create invoice' }
    }

    // Create line items
    const lineItems = data.line_items.map((item, index) => ({
      invoice_id: invoice.id,
      job_code_id: item.job_code_id || null,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: (item.quantity * item.unit_price).toFixed(2),
      sort_order: index,
    }))

    const { error: lineItemsError } = await (supabase
      .from('invoice_line_items') as any)
      .insert(lineItems)

    if (lineItemsError) {
      console.error('Error creating line items:', lineItemsError)
      return { error: 'Failed to create line items' }
    }

    // Update invoice number sequence
    await (supabase
      .from('organizations') as any)
      .update({ invoice_number_sequence: org.invoice_number_sequence + 1 })
      .eq('id', user.organization_id)

    // Log audit trail
    await (supabase.from('audit_trail') as any).insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'create',
      entity_type: 'invoice',
      entity_id: invoice.id,
      details: { invoice_number: invoiceNumber, job_id: data.job_id },
    })

    revalidatePath('/invoices')
    return { success: true, id: invoice.id }
  } catch (error) {
    console.error('Error creating invoice:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function updateInvoiceStatus(id: string, status: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canCreateInvoices) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()
  const updateData: any = { status, updated_at: new Date().toISOString() }
  
  if (status === 'paid') {
    updateData.paid_date = new Date().toISOString().split('T')[0]
  }

  const { error } = await (supabase
    .from('invoices') as any)
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', user.organization_id)

  if (error) {
    console.error('Error updating invoice status:', error)
    return { error: 'Failed to update invoice status' }
  }

  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'update',
    entity_type: 'invoice',
    entity_id: id,
    details: { status },
  })

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return { success: true }
}

export async function recordPayment(id: string, amount: number) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canCreateInvoices) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()
  
  // Get current invoice
  const { data: invoice } = await (supabase
    .from('invoices') as any)
    .select('amount_paid, total')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  if (!invoice) {
    return { error: 'Invoice not found' }
  }

  const newAmountPaid = parseFloat(invoice.amount_paid) + amount
  const isPaid = newAmountPaid >= parseFloat(invoice.total)

  const { error } = await (supabase
    .from('invoices') as any)
    .update({
      amount_paid: newAmountPaid.toFixed(2),
      status: isPaid ? 'paid' : 'sent',
      paid_date: isPaid ? new Date().toISOString().split('T')[0] : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', user.organization_id)

  if (error) {
    console.error('Error recording payment:', error)
    return { error: 'Failed to record payment' }
  }

  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'update',
    entity_type: 'invoice',
    entity_id: id,
    details: { payment_recorded: amount },
  })

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return { success: true }
}

export async function deleteInvoice(id: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canCreateInvoices) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()
  const { error } = await (supabase
    .from('invoices') as any)
    .delete()
    .eq('id', id)
    .eq('organization_id', user.organization_id)

  if (error) {
    console.error('Error deleting invoice:', error)
    return { error: 'Failed to delete invoice' }
  }

  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'delete',
    entity_type: 'invoice',
    entity_id: id,
  })

  revalidatePath('/invoices')
  return { success: true }
}
