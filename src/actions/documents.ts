'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

export async function getDocuments(jobId?: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id) {
    return []
  }

  const supabase = await createClient()
  let query = (supabase
    .from('documents') as any)
    .select(`
      *,
      job:jobs(job_number, title),
      uploaded_by_user:profiles!documents_uploaded_by_fkey(first_name, last_name)
    `)
    .eq('organization_id', user.organization_id)

  if (jobId) {
    query = query.eq('job_id', jobId)
  }

  // Field staff can only see documents for their assigned jobs
  if (user.role === 'field_staff') {
    query = query.in('job_id', user.assignedJobIds)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error('Error fetching documents:', error)
    return []
  }

  return data || []
}

export async function uploadDocument(data: {
  job_id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
}) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canUploadDocuments) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()

    const { data: document, error } = await (supabase
      .from('documents') as any)
      .insert({
        organization_id: user.organization_id,
        job_id: data.job_id,
        uploaded_by: user.id,
        file_name: data.file_name,
        file_path: data.file_path,
        file_size: data.file_size,
        file_type: data.file_type,
      })
      .select()
      .single()

    if (error) {
      console.error('Error uploading document:', error)
      return { error: 'Failed to upload document' }
    }

    // Log audit trail
    await (supabase.from('audit_trail') as any).insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'create',
      entity_type: 'document',
      entity_id: document.id,
      details: { file_name: data.file_name, job_id: data.job_id },
    })

    revalidatePath(`/jobs/${data.job_id}`)
    return { success: true, id: document.id }
  } catch (error) {
    console.error('Error uploading document:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function deleteDocument(id: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()

    // Get document details
    const { data: document } = await (supabase
      .from('documents') as any)
      .select('file_path, job_id')
      .eq('id', id)
      .eq('organization_id', user.organization_id)
      .single()

    if (!document) {
      return { error: 'Document not found' }
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.file_path])

    if (storageError) {
      console.error('Error deleting from storage:', storageError)
    }

    // Delete from database
    const { error } = await (supabase
      .from('documents') as any)
      .delete()
      .eq('id', id)
      .eq('organization_id', user.organization_id)

    if (error) {
      console.error('Error deleting document:', error)
      return { error: 'Failed to delete document' }
    }

    // Log audit trail
    await (supabase.from('audit_trail') as any).insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'delete',
      entity_type: 'document',
      entity_id: id,
    })

    revalidatePath(`/jobs/${document.job_id}`)
    return { success: true }
  } catch (error) {
    console.error('Error deleting document:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function getDocumentDownloadUrl(filePath: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 60) // URL valid for 60 seconds

    if (error) {
      console.error('Error creating signed URL:', error)
      return { error: 'Failed to get download URL' }
    }

    return { success: true, url: data.signedUrl }
  } catch (error) {
    console.error('Error getting download URL:', error)
    return { error: 'An unexpected error occurred' }
  }
}
