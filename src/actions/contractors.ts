'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

export async function getContractors() {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canManageContractors) {
    return []
  }

  const supabase = await createClient()
  const { data, error } = await (supabase
    .from('contractors') as any)
    .select('*')
    .eq('organization_id', user.organization_id)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching contractors:', error)
    return []
  }

  return data || []
}

export async function getContractor(id: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canManageContractors) {
    return null
  }

  const supabase = await createClient()
  const { data, error } = await (supabase
    .from('contractors') as any)
    .select(`
      *,
      job_assignments:contractor_job_assignments(
        id,
        job:jobs(job_number, title, status)
      )
    `)
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  if (error) {
    console.error('Error fetching contractor:', error)
    return null
  }

  return data
}

export async function createContractor(data: {
  name: string
  email: string
  phone?: string
  abn?: string
  company?: string
  insurance_expiry?: string
  license_number?: string
  license_expiry?: string
  notes?: string
}) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canManageContractors) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()

    // Check contractor limit for Pro Scale tier
    if (user.subscription?.tier === 'operations_pro_scale') {
      const { data: contractors } = await (supabase
        .from('contractors') as any)
        .select('id')
        .eq('organization_id', user.organization_id)

      if (contractors && contractors.length >= 50) {
        return { error: 'Contractor limit reached (50). Upgrade to Pro Unlimited for unlimited contractors.' }
      }
    }

    const { data: contractor, error } = await (supabase
      .from('contractors') as any)
      .insert({
        organization_id: user.organization_id,
        ...data,
        compliance_status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating contractor:', error)
      return { error: 'Failed to create contractor' }
    }

    // Log audit trail
    await (supabase.from('audit_trail') as any).insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'create',
      entity_type: 'contractor',
      entity_id: contractor.id,
      details: { name: data.name },
    })

    revalidatePath('/contractors')
    return { success: true, id: contractor.id }
  } catch (error) {
    console.error('Error creating contractor:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function updateContractor(
  id: string,
  data: {
    name?: string
    email?: string
    phone?: string
    abn?: string
    company?: string
    insurance_expiry?: string
    license_number?: string
    license_expiry?: string
    notes?: string
  }
) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canManageContractors) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()

    const { error } = await (supabase
      .from('contractors') as any)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', user.organization_id)

    if (error) {
      console.error('Error updating contractor:', error)
      return { error: 'Failed to update contractor' }
    }

    // Log audit trail
    await (supabase.from('audit_trail') as any).insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'update',
      entity_type: 'contractor',
      entity_id: id,
      details: data,
    })

    revalidatePath('/contractors')
    revalidatePath(`/contractors/${id}`)
    return { success: true }
  } catch (error) {
    console.error('Error updating contractor:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function deleteContractor(id: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canManageContractors) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()

    const { error } = await (supabase
      .from('contractors') as any)
      .delete()
      .eq('id', id)
      .eq('organization_id', user.organization_id)

    if (error) {
      console.error('Error deleting contractor:', error)
      return { error: 'Failed to delete contractor' }
    }

    // Log audit trail
    await (supabase.from('audit_trail') as any).insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'delete',
      entity_type: 'contractor',
      entity_id: id,
    })

    revalidatePath('/contractors')
    return { success: true }
  } catch (error) {
    console.error('Error deleting contractor:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function assignContractorToJob(contractorId: string, jobId: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canAssignContractors) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()

    // Generate access token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Token valid for 7 days

    const { data: assignment, error } = await (supabase
      .from('contractor_job_assignments') as any)
      .insert({
        organization_id: user.organization_id,
        contractor_id: contractorId,
        job_id: jobId,
        access_token: token,
        token_expires_at: expiresAt.toISOString(),
        assigned_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error assigning contractor:', error)
      return { error: 'Failed to assign contractor' }
    }

    // Log audit trail
    await (supabase.from('audit_trail') as any).insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'create',
      entity_type: 'contractor_job_assignment',
      entity_id: assignment.id,
      details: { contractor_id: contractorId, job_id: jobId },
    })

    revalidatePath(`/jobs/${jobId}`)
    revalidatePath(`/contractors/${contractorId}`)
    return { success: true, token, id: assignment.id }
  } catch (error) {
    console.error('Error assigning contractor:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function unassignContractorFromJob(assignmentId: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canAssignContractors) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()

    const { error } = await (supabase
      .from('contractor_job_assignments') as any)
      .delete()
      .eq('id', assignmentId)
      .eq('organization_id', user.organization_id)

    if (error) {
      console.error('Error unassigning contractor:', error)
      return { error: 'Failed to unassign contractor' }
    }

    // Log audit trail
    await (supabase.from('audit_trail') as any).insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'delete',
      entity_type: 'contractor_job_assignment',
      entity_id: assignmentId,
    })

    revalidatePath('/contractors')
    return { success: true }
  } catch (error) {
    console.error('Error unassigning contractor:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function getComplianceStatus() {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canTrackCompliance) {
    return { compliant: [], expiringSoon: [], expired: [] }
  }

  const supabase = await createClient()
  const { data: contractors } = await (supabase
    .from('contractors') as any)
    .select('*')
    .eq('organization_id', user.organization_id)

  if (!contractors) {
    return { compliant: [], expiringSoon: [], expired: [] }
  }

  const now = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(now.getDate() + 30)

  const compliant: any[] = []
  const expiringSoon: any[] = []
  const expired: any[] = []

  contractors.forEach((contractor: any) => {
    const insuranceExpiry = contractor.insurance_expiry ? new Date(contractor.insurance_expiry) : null
    const licenseExpiry = contractor.license_expiry ? new Date(contractor.license_expiry) : null

    const isExpired = (insuranceExpiry && insuranceExpiry < now) || (licenseExpiry && licenseExpiry < now)
    const isExpiringSoon = 
      (insuranceExpiry && insuranceExpiry > now && insuranceExpiry < thirtyDaysFromNow) ||
      (licenseExpiry && licenseExpiry > now && licenseExpiry < thirtyDaysFromNow)

    if (isExpired) {
      expired.push(contractor)
    } else if (isExpiringSoon) {
      expiringSoon.push(contractor)
    } else if (insuranceExpiry && licenseExpiry) {
      compliant.push(contractor)
    }
  })

  return { compliant, expiringSoon, expired }
}

export async function updateComplianceStatus(contractorId: string) {
  const user = await getCurrentUser()
  if (!user?.organization_id || !user.permissions?.canTrackCompliance) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()

    const { data: contractor } = await (supabase
      .from('contractors') as any)
      .select('insurance_expiry, license_expiry')
      .eq('id', contractorId)
      .eq('organization_id', user.organization_id)
      .single()

    if (!contractor) {
      return { error: 'Contractor not found' }
    }

    const now = new Date()
    const insuranceExpiry = contractor.insurance_expiry ? new Date(contractor.insurance_expiry) : null
    const licenseExpiry = contractor.license_expiry ? new Date(contractor.license_expiry) : null

    let status = 'pending'
    if (insuranceExpiry && licenseExpiry) {
      if (insuranceExpiry < now || licenseExpiry < now) {
        status = 'expired'
      } else {
        status = 'compliant'
      }
    }

    await (supabase
      .from('contractors') as any)
      .update({ compliance_status: status, updated_at: new Date().toISOString() })
      .eq('id', contractorId)
      .eq('organization_id', user.organization_id)

    revalidatePath('/contractors')
    revalidatePath(`/contractors/${contractorId}`)
    return { success: true, status }
  } catch (error) {
    console.error('Error updating compliance status:', error)
    return { error: 'An unexpected error occurred' }
  }
}
