import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

async function getAuditTrail(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('audit_trail')
    .select(`
      *,
      user:profiles(first_name, last_name, email)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export default async function AuditTrailPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== 'owner') {
    redirect('/dashboard')
  }

  const auditLogs = await getAuditTrail(user.organization_id!)

  const actionLabels: Record<string, string> = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    assign_license: 'Assigned License',
    unassign_license: 'Unassigned License',
    assign_field_staff: 'Assigned Field Staff',
    unassign_field_staff: 'Unassigned Field Staff',
  }

  const resourceTypeLabels: Record<string, string> = {
    job: 'Job',
    contact: 'Contact',
    quote: 'Quote',
    invoice: 'Invoice',
    license: 'License',
    contractor: 'Contractor',
    inventory_item: 'Inventory Item',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
        <p className="mt-1 text-sm text-gray-500">
          View all system actions and changes in your organization
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {auditLogs.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500">
            No audit logs yet
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {auditLogs.map((log: any) => (
              <li key={log.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {actionLabels[log.action] || log.action}{' '}
                      {resourceTypeLabels[log.resource_type] || log.resource_type}
                    </p>
                    {log.user && (
                      <p className="mt-1 text-sm text-gray-500">
                        by {log.user.first_name} {log.user.last_name} ({log.user.email})
                      </p>
                    )}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 text-xs text-gray-400 font-mono bg-gray-50 p-2 rounded overflow-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </div>
                    )}
                    {log.ip_address && (
                      <p className="mt-1 text-xs text-gray-400">IP: {log.ip_address}</p>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0 text-right">
                    <p className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
