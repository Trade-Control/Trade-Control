export type UserRole = 'owner' | 'management' | 'field_staff'
export type SubscriptionTier = 'operations' | 'operations_pro_scale' | 'operations_pro_unlimited'

export interface UserPermissions {
  // Jobs
  canViewAllJobs: boolean
  canViewAssignedJobs: boolean
  canCreateJobs: boolean
  canEditJobs: boolean
  canDeleteJobs: boolean
  canUpdateJobStatus: boolean
  
  // Quotes & Invoices
  canViewQuotes: boolean
  canCreateQuotes: boolean
  canViewInvoices: boolean
  canCreateInvoices: boolean
  canTrackPayments: boolean
  
  // Timesheets & Documents
  canClockInOut: boolean
  canManualTimesheet: boolean
  canUploadDocuments: boolean
  canViewDocuments: boolean
  
  // Inventory & Travel
  canManageInventory: boolean
  canAllocateInventory: boolean
  canLogTravel: boolean
  
  // Contacts & Job Codes
  canManageContacts: boolean
  canManageJobCodes: boolean
  
  // Contractor Management (Pro)
  canManageContractors: boolean
  canTrackCompliance: boolean
  canAssignContractors: boolean
  canAccessContractorPortal: boolean
  canReviewSubmissions: boolean
  
  // Activity & Communication
  canViewActivityFeed: boolean
  canViewEmailLog: boolean
  
  // Reporting
  canViewReports: boolean
  canExportReports: boolean
  
  // Administration
  canManageLicenses: boolean
  canManageSubscription: boolean
  canViewAuditTrail: boolean
  canManageOrgSettings: boolean
  canAssignFieldStaff: boolean
  
  // Scheduling
  canViewSchedule: boolean
}

export function getUserPermissions(
  role: UserRole,
  tier: SubscriptionTier
): UserPermissions {
  const isOwner = role === 'owner'
  const isManagement = role === 'management'
  const isFieldStaff = role === 'field_staff'
  
  const isPro = tier === 'operations_pro_scale' || tier === 'operations_pro_unlimited'
  
  return {
    // Jobs
    canViewAllJobs: isOwner || isManagement,
    canViewAssignedJobs: true,
    canCreateJobs: isOwner || isManagement,
    canEditJobs: isOwner || isManagement,
    canDeleteJobs: isOwner || isManagement,
    canUpdateJobStatus: true,
    
    // Quotes & Invoices
    canViewQuotes: isOwner || isManagement,
    canCreateQuotes: isOwner || isManagement,
    canViewInvoices: isOwner || isManagement,
    canCreateInvoices: isOwner || isManagement,
    canTrackPayments: isOwner || isManagement,
    
    // Timesheets & Documents
    canClockInOut: true,
    canManualTimesheet: true,
    canUploadDocuments: true,
    canViewDocuments: true,
    
    // Inventory & Travel
    canManageInventory: isOwner || isManagement,
    canAllocateInventory: isOwner || isManagement,
    canLogTravel: true,
    
    // Contacts & Job Codes
    canManageContacts: isOwner || isManagement,
    canManageJobCodes: isOwner || isManagement,
    
    // Contractor Management (Pro only)
    canManageContractors: isPro && (isOwner || isManagement),
    canTrackCompliance: isPro && (isOwner || isManagement),
    canAssignContractors: isPro && (isOwner || isManagement),
    canAccessContractorPortal: false, // Separate portal access
    canReviewSubmissions: isPro && (isOwner || isManagement),
    
    // Activity & Communication (Pro only)
    canViewActivityFeed: isPro,
    canViewEmailLog: isPro,
    
    // Reporting
    canViewReports: true,
    canExportReports: isOwner || isManagement,
    
    // Administration
    canManageLicenses: isOwner,
    canManageSubscription: isOwner,
    canViewAuditTrail: isOwner,
    canManageOrgSettings: isOwner,
    canAssignFieldStaff: isOwner || isManagement,
    
    // Scheduling
    canViewSchedule: true,
  }
}
