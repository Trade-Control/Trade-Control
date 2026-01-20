'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

export async function getTimesheets(jobId?: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id) {
    return []
  }

  const supabase = await createClient()
  let query = (supabase
    .from('timesheets') as any)
    .select(`
      *,
      job:jobs(job_number, title),
      user:profiles(first_name, last_name, email)
    `)
    .eq('organization_id', user.organization_id)

  if (jobId) {
    query = query.eq('job_id', jobId)
  }

  // Field staff can only see their own timesheets
  if (user.role === 'field_staff') {
    query = query.eq('user_id', user.id)
  }

  query = query.order('clock_on', { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error('Error fetching timesheets:', error)
    return []
  }

  return data || []
}

export async function getActiveTimesheet() {
  const user = await getCurrentUser()
  if (!user?.organization_id) {
    return null
  }

  const supabase = await createClient()
  const { data, error } = await (supabase
    .from('timesheets') as any)
    .select(`
      *,
      job:jobs(job_number, title)
    `)
    .eq('organization_id', user.organization_id)
    .eq('user_id', user.id)
    .is('clock_off', null)
    .order('clock_on', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') { // Not found error is OK
    console.error('Error fetching active timesheet:', error)
    return null
  }

  return data
}

export async function clockIn(jobId: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canClockInOut) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()

    // Check if already clocked in
    const activeTimesheet = await getActiveTimesheet()
    if (activeTimesheet) {
      return { error: 'You are already clocked in to another job' }
    }

    // Create timesheet
    const { data, error } = await (supabase
      .from('timesheets') as any)
      .insert({
        organization_id: user.organization_id,
        job_id: jobId,
        user_id: user.id,
        clock_on: new Date().toISOString(),
        is_manual: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error clocking in:', error)
      return { error: 'Failed to clock in' }
    }

    // Log audit trail
    await (supabase.from('audit_trail') as any).insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'create',
      entity_type: 'timesheet',
      entity_id: data.id,
      details: { action: 'clock_in', job_id: jobId },
    })

    revalidatePath('/jobs')
    revalidatePath(`/jobs/${jobId}`)
    return { success: true, id: data.id }
  } catch (error) {
    console.error('Error clocking in:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function clockOut(timesheetId: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canClockInOut) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()

    // Get timesheet
    const { data: timesheet } = await (supabase
      .from('timesheets') as any)
      .select('clock_on, job_id')
      .eq('id', timesheetId)
      .eq('user_id', user.id)
      .single()

    if (!timesheet) {
      return { error: 'Timesheet not found' }
    }

    const clockOff = new Date()
    const clockOn = new Date(timesheet.clock_on)
    const hours = (clockOff.getTime() - clockOn.getTime()) / (1000 * 60 * 60)

    // Update timesheet
    const { error } = await (supabase
      .from('timesheets') as any)
      .update({
        clock_off: clockOff.toISOString(),
        hours: hours.toFixed(2),
        updated_at: new Date().toISOString(),
      })
      .eq('id', timesheetId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error clocking out:', error)
      return { error: 'Failed to clock out' }
    }

    // Log audit trail
    await (supabase.from('audit_trail') as any).insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'update',
      entity_type: 'timesheet',
      entity_id: timesheetId,
      details: { action: 'clock_out', hours: hours.toFixed(2) },
    })

    revalidatePath('/jobs')
    revalidatePath(`/jobs/${timesheet.job_id}`)
    return { success: true }
  } catch (error) {
    console.error('Error clocking out:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function createManualTimesheet(data: {
  job_id: string
  clock_on: string
  clock_off: string
  notes?: string
}) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canManualTimesheet) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()

    const clockOn = new Date(data.clock_on)
    const clockOff = new Date(data.clock_off)
    const hours = (clockOff.getTime() - clockOn.getTime()) / (1000 * 60 * 60)

    if (hours <= 0) {
      return { error: 'Clock off time must be after clock on time' }
    }

    // Create timesheet
    const { data: timesheet, error } = await (supabase
      .from('timesheets') as any)
      .insert({
        organization_id: user.organization_id,
        job_id: data.job_id,
        user_id: user.id,
        clock_on: clockOn.toISOString(),
        clock_off: clockOff.toISOString(),
        hours: hours.toFixed(2),
        notes: data.notes,
        is_manual: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating manual timesheet:', error)
      return { error: 'Failed to create timesheet' }
    }

    // Log audit trail
    await (supabase.from('audit_trail') as any).insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'create',
      entity_type: 'timesheet',
      entity_id: timesheet.id,
      details: { manual: true, hours: hours.toFixed(2) },
    })

    revalidatePath('/jobs')
    revalidatePath(`/jobs/${data.job_id}`)
    return { success: true, id: timesheet.id }
  } catch (error) {
    console.error('Error creating manual timesheet:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function deleteTimesheet(id: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  // Field staff can only delete their own timesheets
  let query = (supabase.from('timesheets') as any).delete().eq('id', id)

  if (user.role === 'field_staff') {
    query = query.eq('user_id', user.id)
  } else {
    query = query.eq('organization_id', user.organization_id)
  }

  const { error } = await query

  if (error) {
    console.error('Error deleting timesheet:', error)
    return { error: 'Failed to delete timesheet' }
  }

  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'delete',
    entity_type: 'timesheet',
    entity_id: id,
  })

  revalidatePath('/jobs')
  return { success: true }
}
