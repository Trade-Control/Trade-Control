'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'

export async function getJobs(): Promise<any[]> {
  const user = await getCurrentUser()
  if (!user?.organization_id) {
    return []
  }
  const supabase = await createClient()

  const { data, error} = await (supabase
    .from('jobs') as any)
    .select(`
      *,
      contact:contacts(id, name),
      created_by_user:profiles!jobs_created_by_fkey(first_name, last_name)
    `)
    .eq('organization_id', user.organization_id)
    .order('created_at', { ascending: false }) as any

  if (error) {
    console.error('Error fetching jobs:', error)
    return []
  }

  return (data || []) as any[]
}

export async function getJob(id: string): Promise<any> {
  const user = await getCurrentUser()
  if (!user?.organization_id) {
    return null
  }
  const supabase = await createClient()

  const { data, error } = await (supabase
    .from('jobs') as any)
    .select(`
      *,
      contact:contacts(*),
      created_by_user:profiles!jobs_created_by_fkey(first_name, last_name)
    `)
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single() as any

  if (error) {
    console.error('Error fetching job:', error)
    return null
  }

  return data as any
}

export async function createJob(formData: {
  title: string
  description?: string
  contact_id?: string
  site_address?: string
  site_city?: string
  site_state?: string
  site_postcode?: string
  start_date?: string
  due_date?: string
  status?: string
}) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canCreateJobs) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  // Get next job number
  const { data: org } = await (supabase
    .from('organizations') as any)
    .select('job_prefix, job_number_sequence')
    .eq('id', user.organization_id)
    .single()

  if (!org) {
    return { error: 'Organization not found' }
  }

  const jobNumber = `${org.job_prefix}${String(org.job_number_sequence).padStart(4, '0')}`

  const { data, error } = await (supabase
    .from('jobs') as any)
    .insert({
      organization_id: user.organization_id,
      job_number: jobNumber,
      status: formData.status || 'pending',
      created_by: user.id,
      ...formData,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating job:', error)
    return { error: 'Failed to create job' }
  }

  // Update job number sequence
  await (supabase
    .from('organizations') as any)
    .update({ job_number_sequence: org.job_number_sequence + 1 })
    .eq('id', user.organization_id)

  // Log audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'create',
    entity_type: 'job',
    entity_id: data.id,
    details: { job_number: jobNumber, title: formData.title },
  })

  revalidatePath('/jobs')
  return { success: true, id: data.id }
}

export async function updateJob(
  id: string,
  formData: {
    title?: string
    description?: string
    contact_id?: string
    site_address?: string
    site_city?: string
    site_state?: string
    site_postcode?: string
    start_date?: string
    due_date?: string
  }
) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canEditJobs) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { error } = await (supabase
    .from('jobs') as any)
    .update({ ...formData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', user.organization_id)

  if (error) {
    console.error('Error updating job:', error)
    return { error: 'Failed to update job' }
  }

  // Log audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'update',
    entity_type: 'job',
    entity_id: id,
    details: formData,
  })

  revalidatePath('/jobs')
  revalidatePath(`/jobs/${id}`)
  return { success: true }
}

export async function updateJobStatus(id: string, status: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canUpdateJobStatus) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { error } = await (supabase
    .from('jobs') as any)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', user.organization_id)

  if (error) {
    console.error('Error updating job status:', error)
    return { error: 'Failed to update job status' }
  }

  // Log audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'update',
    entity_type: 'job',
    entity_id: id,
    details: { status },
  })

  revalidatePath('/jobs')
  revalidatePath(`/jobs/${id}`)
  return { success: true }
}

export async function deleteJob(id: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canDeleteJobs) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { error } = await (supabase
    .from('jobs') as any)
    .delete()
    .eq('id', id)
    .eq('organization_id', user.organization_id)

  if (error) {
    console.error('Error deleting job:', error)
    return { error: 'Failed to delete job' }
  }

  // Log audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'delete',
    entity_type: 'job',
    entity_id: id,
  })

  revalidatePath('/jobs')
  return { success: true }
}

export async function assignUserToJob(jobId: string, userId: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canAssignFieldStaff) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  // Get current assigned_job_ids for the user
  const { data: profile } = await (supabase
    .from('profiles') as any)
    .select('assigned_job_ids')
    .eq('id', userId)
    .eq('organization_id', user.organization_id)
    .single()

  if (!profile) {
    return { error: 'User not found' }
  }

  const assignedJobIds = Array.isArray(profile.assigned_job_ids) 
    ? profile.assigned_job_ids 
    : []
  
  if (assignedJobIds.includes(jobId)) {
    return { error: 'User already assigned to this job' }
  }

  // Add job to assigned_job_ids
  const { error } = await (supabase
    .from('profiles') as any)
    .update({ 
      assigned_job_ids: [...assignedJobIds, jobId],
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .eq('organization_id', user.organization_id)

  if (error) {
    console.error('Error assigning user to job:', error)
    return { error: 'Failed to assign user' }
  }

  // Log audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organization_id,
    user_id: user.id,
    action: 'update',
    entity_type: 'job',
    entity_id: jobId,
    details: { assigned_user: userId },
  })

  revalidatePath('/jobs')
  revalidatePath(`/jobs/${jobId}`)
  return { success: true }
}
