import { Database } from '@/types/database'

type UserRole = 'owner' | 'management' | 'field_staff'
type SubscriptionTier = 'operations' | 'operations_pro_scale' | 'operations_pro_unlimited'

export interface UserPermissions {
  role: UserRole
  organizationId: string
  subscriptionTier: SubscriptionTier
  assignedJobIds: string[]
}

export const permissions = {
  // Job permissions
  canViewAllJobs: (user: UserPermissions) => 
    user.role === 'owner' || user.role === 'management',
  
  canCreateJob: (user: UserPermissions) => 
    user.role === 'owner' || user.role === 'management',
  
  canEditJob: (user: UserPermissions, jobId?: string) => {
    if (user.role === 'owner' || user.role === 'management') return true
    if (user.role === 'field_staff' && jobId) {
      return user.assignedJobIds.includes(jobId)
    }
    return false
  },
  
  canDeleteJob: (user: UserPermissions) => 
    user.role === 'owner' || user.role === 'management',
  
  // Quote & Invoice permissions
  canViewQuotes: (user: UserPermissions) => 
    user.role === 'owner' || user.role === 'management',
  
  canCreateQuote: (user: UserPermissions) => 
    user.role === 'owner' || user.role === 'management',
  
  canViewInvoices: (user: UserPermissions) => 
    user.role === 'owner' || user.role === 'management',
  
  canCreateInvoice: (user: UserPermissions) => 
    user.role === 'owner' || user.role === 'management',
  
  // Contact permissions
  canManageContacts: (user: UserPermissions) => 
    user.role === 'owner' || user.role === 'management',
  
  // Inventory permissions
  canManageInventory: (user: UserPermissions) => 
    user.role === 'owner' || user.role === 'management',
  
  // Contractor permissions (Operations Pro only)
  canAccessContractors: (user: UserPermissions) => 
    (user.role === 'owner' || user.role === 'management') &&
    (user.subscriptionTier === 'operations_pro_scale' || user.subscriptionTier === 'operations_pro_unlimited'),
  
  canManageContractors: (user: UserPermissions) => 
    (user.role === 'owner' || user.role === 'management') &&
    (user.subscriptionTier === 'operations_pro_scale' || user.subscriptionTier === 'operations_pro_unlimited'),
  
  // License & Subscription permissions
  canManageLicenses: (user: UserPermissions) => 
    user.role === 'owner',
  
  canManageSubscription: (user: UserPermissions) => 
    user.role === 'owner',
  
  // Audit trail permissions
  canViewAuditTrail: (user: UserPermissions) => 
    user.role === 'owner',
  
  // Organization settings permissions
  canManageOrganization: (user: UserPermissions) => 
    user.role === 'owner',
  
  // Timesheet permissions
  canViewAllTimesheets: (user: UserPermissions) => 
    user.role === 'owner' || user.role === 'management',
  
  canCreateTimesheet: (user: UserPermissions, jobId?: string) => {
    if (user.role === 'owner' || user.role === 'management') return true
    if (user.role === 'field_staff' && jobId) {
      return user.assignedJobIds.includes(jobId)
    }
    return false
  },
  
  // Document permissions
  canUploadDocuments: (user: UserPermissions, jobId?: string) => {
    if (user.role === 'owner' || user.role === 'management') return true
    if (user.role === 'field_staff' && jobId) {
      return user.assignedJobIds.includes(jobId)
    }
    return false
  },
  
  canDeleteDocuments: (user: UserPermissions) => 
    user.role === 'owner' || user.role === 'management',
  
  // Reports permissions
  canExportReports: (user: UserPermissions) => 
    user.role === 'owner' || user.role === 'management',
}

// Helper to check contractor limits
export function canAddContractor(user: UserPermissions, currentCount: number): boolean {
  if (!permissions.canManageContractors(user)) return false
  
  if (user.subscriptionTier === 'operations_pro_scale') {
    return currentCount < 50
  }
  
  if (user.subscriptionTier === 'operations_pro_unlimited') {
    return true
  }
  
  return false
}
