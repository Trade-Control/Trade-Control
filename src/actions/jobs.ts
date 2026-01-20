'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requirePermissions } from '@/lib/auth/get-user'
import { permissions } from '@/lib/auth/permissions'

export async function getJobs(): Promise<any[]> {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data, error } = await (supabase
    .from('jobs') as any)
    .select(`
      *,
      contact:contacts(id, name, company),
      created_by_user:profiles!jobs_created_by_fkey(first_name, last_name)
    `)
    .eq('organization_id', user.organizationId)
    .order('created_at', { ascending: false }) as any

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as any[]
}

export async function getJob(id: string): Promise<any> {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data, error } = await (supabase
    .from('jobs') as any)
    .select(`
      *,
      contact:contacts(id, name, company, email, phone, address, city, state, postcode),
      created_by_user:profiles!jobs_created_by_fkey(first_name, last_name)
    `)
    .eq('id', id)
    .eq('organization_id', user.organizationId)
    .single() as any

  if (error) {
    throw new Error(error.message)
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
}) {
  const user = await requireAuth()
  const userPerms = await requirePermissions()
  
  if (!permissions.canCreateJob(userPerms)) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()

  // Get organization for job numbering
  const { data: org } = await (supabase
    .from('organizations') as any)
    .select('job_prefix, job_number_sequence')
    .eq('id', user.organizationId)
    .single() as any

  if (!org) {
    throw new Error('Organization not found')
  }

  const jobNumber = org.job_prefix
    ? `${org.job_prefix}${org.job_number_sequence.toString().padStart(4, '0')}`
    : org.job_number_sequence.toString().padStart(6, '0')

  // Create job
  const { data, error } = await (supabase
    .from('jobs') as any)
    .insert({
      organization_id: user.organizationId,
      job_number: jobNumber,
      title: formData.title,
      description: formData.description,
      contact_id: formData.contact_id,
      site_address: formData.site_address,
      site_city: formData.site_city,
      site_state: formData.site_state,
      site_postcode: formData.site_postcode,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Increment job number sequence
  await (supabase
    .from('organizations') as any)
    .update({ job_number_sequence: org.job_number_sequence + 1 })
    .eq('id', user.organizationId)

  // Log to audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organizationId,
    user_id: user.id,
    action: 'create',
    resource_type: 'job',
    resource_id: data.id,
    details: { job_number: jobNumber, title: formData.title },
  })

  revalidatePath('/jobs')
  revalidatePath('/dashboard')
  
  return data
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
    status?: string
  }
) {
  const user = await requireAuth()
  const userPerms = await requirePermissions()
  
  if (!permissions.canEditJob(userPerms, id)) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()

  const { data, error } = await (supabase
    .from('jobs') as any)
    .update(formData)
    .eq('id', id)
    .eq('organization_id', user.organizationId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Log to audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organizationId,
    user_id: user.id,
    action: 'update',
    resource_type: 'job',
    resource_id: id,
    details: formData,
  })

  revalidatePath('/jobs')
  revalidatePath(`/jobs/${id}`)
  revalidatePath('/dashboard')
  
  return data
}

export async function deleteJob(id: string) {
  const user = await requireAuth()
  const userPerms = await requirePermissions()
  
  if (!permissions.canDeleteJob(userPerms)) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()

  const { error } = await (supabase
    .from('jobs') as any)
    .delete()
    .eq('id', id)
    .eq('organization_id', user.organizationId)

  if (error) {
    throw new Error(error.message)
  }

  // Log to audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organizationId,
    user_id: user.id,
    action: 'delete',
    resource_type: 'job',
    resource_id: id,
  })

  revalidatePath('/jobs')
  revalidatePath('/dashboard')
}

export async function assignFieldStaff(jobId: string, userId: string) {
  const user = await requireAuth()
  const userPerms = await requirePermissions()
  
  if (!permissions.canEditJob(userPerms, jobId)) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()

  // Get current assigned jobs for the user
  const { data: profile } = await (supabase
    .from('profiles') as any)
    .select('assigned_job_ids')
    .eq('id', userId)
    .single() as any

  if (!profile) {
    throw new Error('User not found')
  }

  const assignedJobs = ((profile as any).assigned_job_ids || []) as string[]
  
  if (!assignedJobs.includes(jobId)) {
    assignedJobs.push(jobId)
  }

  // Update profile with new assigned jobs
  const { error } = await (supabase
    .from('profiles') as any)
    .update({ assigned_job_ids: assignedJobs })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }

  // Log to audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organizationId,
    user_id: user.id,
    action: 'assign_field_staff',
    resource_type: 'job',
    resource_id: jobId,
    details: { assigned_user_id: userId },
  })

  revalidatePath(`/jobs/${jobId}`)
}

export async function unassignFieldStaff(jobId: string, userId: string) {
  const user = await requireAuth()
  const userPerms = await requirePermissions()
  
  if (!permissions.canEditJob(userPerms, jobId)) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()

  // Get current assigned jobs for the user
  const { data: profile } = await (supabase
    .from('profiles') as any)
    .select('assigned_job_ids')
    .eq('id', userId)
    .single() as any

  if (!profile) {
    throw new Error('User not found')
  }

  const assignedJobs = ((profile as any).assigned_job_ids || []).filter((id: string) => id !== jobId)

  // Update profile
  const { error } = await (supabase
    .from('profiles') as any)
    .update({ assigned_job_ids: assignedJobs })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }

  // Log to audit trail
  await (supabase.from('audit_trail') as any).insert({
    organization_id: user.organizationId,
    user_id: user.id,
    action: 'unassign_field_staff',
    resource_type: 'job',
    resource_id: jobId,
    details: { unassigned_user_id: userId },
  })

  revalidatePath(`/jobs/${jobId}`)
}
