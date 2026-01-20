'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function validateToken(token: string) {
  const supabase = await createClient()
  
  const { data: assignment, error } = await (supabase
    .from('contractor_job_assignments') as any)
    .select(`
      *,
      job:jobs(*),
      contractor:contractors(*),
      organization:organizations(*)
    `)
    .eq('access_token', token)
    .single()

  if (error || !assignment) {
    return { valid: false, error: 'Invalid or expired token' }
  }

  // Check if token has expired
  const now = new Date()
  const expiresAt = new Date(assignment.token_expires_at)

  if (expiresAt < now) {
    return { valid: false, error: 'Token has expired' }
  }

  return {
    valid: true,
    assignment,
    job: assignment.job,
    contractor: assignment.contractor,
    organization: assignment.organization,
  }
}

export async function submitContractorTimesheet(token: string, data: {
  clock_on: string
  clock_off: string
  notes?: string
}) {
  const validation = await validateToken(token)
  
  if (!validation.valid || !validation.assignment) {
    return { error: validation.error || 'Invalid token' }
  }

  try {
    const supabase = await createClient()

    const clockOn = new Date(data.clock_on)
    const clockOff = new Date(data.clock_off)
    const hours = (clockOff.getTime() - clockOn.getTime()) / (1000 * 60 * 60)

    if (hours <= 0) {
      return { error: 'Clock off time must be after clock on time' }
    }

    const { data: timesheet, error } = await (supabase
      .from('timesheets') as any)
      .insert({
        organization_id: validation.assignment.organization_id,
        job_id: validation.assignment.job_id,
        user_id: validation.assignment.contractor_id,
        clock_on: clockOn.toISOString(),
        clock_off: clockOff.toISOString(),
        hours: hours.toFixed(2),
        notes: data.notes,
        is_manual: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error submitting timesheet:', error)
      return { error: 'Failed to submit timesheet' }
    }

    return { success: true, id: timesheet.id }
  } catch (error) {
    console.error('Error submitting timesheet:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function submitContractorDocument(token: string, data: {
  file_name: string
  file_path: string
  file_size: number
  file_type: string
}) {
  const validation = await validateToken(token)
  
  if (!validation.valid || !validation.assignment) {
    return { error: validation.error || 'Invalid token' }
  }

  try {
    const supabase = await createClient()

    const { data: document, error } = await (supabase
      .from('contractor_submissions') as any)
      .insert({
        organization_id: validation.assignment.organization_id,
        contractor_id: validation.assignment.contractor_id,
        job_id: validation.assignment.job_id,
        file_name: data.file_name,
        file_path: data.file_path,
        file_size: data.file_size,
        file_type: data.file_type,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error submitting document:', error)
      return { error: 'Failed to submit document' }
    }

    return { success: true, id: document.id }
  } catch (error) {
    console.error('Error submitting document:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function submitContractorNotes(token: string, notes: string) {
  const validation = await validateToken(token)
  
  if (!validation.valid || !validation.assignment) {
    return { error: validation.error || 'Invalid token' }
  }

  try {
    const supabase = await createClient()

    const { error } = await (supabase
      .from('contractor_job_assignments') as any)
      .update({
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('access_token', token)

    if (error) {
      console.error('Error submitting notes:', error)
      return { error: 'Failed to submit notes' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error submitting notes:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function getContractorSubmissions(jobId: string, contractorId: string) {
  const supabase = await createClient()
  
  const { data, error } = await (supabase
    .from('contractor_submissions') as any)
    .select('*')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching submissions:', error)
    return []
  }

  return data || []
}
