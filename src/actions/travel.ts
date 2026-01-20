'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

export async function getTravelLogs(jobId?: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id) {
    return []
  }

  const supabase = await createClient()
  let query = (supabase
    .from('travel_logs') as any)
    .select(`
      *,
      job:jobs(job_number, title),
      user:profiles(first_name, last_name)
    `)
    .eq('organization_id', user.organization_id)

  if (jobId) {
    query = query.eq('job_id', jobId)
  }

  // Field staff can only see their own travel logs
  if (user.role === 'field_staff') {
    query = query.eq('user_id', user.id)
  }

  query = query.order('date', { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error('Error fetching travel logs:', error)
    return []
  }

  return data || []
}

export async function logTravel(data: {
  job_id: string
  origin: string
  destination: string
  distance?: number
  duration?: number
  date: string
  notes?: string
}) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canLogTravel) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()

    const { data: travel, error } = await (supabase
      .from('travel_logs') as any)
      .insert({
        organization_id: user.organization_id,
        job_id: data.job_id,
        user_id: user.id,
        origin: data.origin,
        destination: data.destination,
        distance: data.distance,
        duration: data.duration,
        date: data.date,
        notes: data.notes,
      })
      .select()
      .single()

    if (error) {
      console.error('Error logging travel:', error)
      return { error: 'Failed to log travel' }
    }

    // Log audit trail
    await (supabase.from('audit_trail') as any).insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'create',
      entity_type: 'travel_log',
      entity_id: travel.id,
      details: { job_id: data.job_id, distance: data.distance },
    })

    revalidatePath(`/jobs/${data.job_id}`)
    revalidatePath('/travel')
    return { success: true, id: travel.id }
  } catch (error) {
    console.error('Error logging travel:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function deleteTravel(id: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  // Field staff can only delete their own travel logs
  let query = (supabase.from('travel_logs') as any).delete().eq('id', id)

  if (user.role === 'field_staff') {
    query = query.eq('user_id', user.id)
  } else {
    query = query.eq('organization_id', user.organization_id)
  }

  const { error } = await query

  if (error) {
    console.error('Error deleting travel log:', error)
    return { error: 'Failed to delete travel log' }
  }

  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'delete',
    entity_type: 'travel_log',
    entity_id: id,
  })

  revalidatePath('/travel')
  return { success: true }
}
