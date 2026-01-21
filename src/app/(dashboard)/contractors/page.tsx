import Link from 'next/link'
import { getContractors } from '@/actions/contractors'
import { getCurrentUser } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'

export default async function ContractorsPage() {
  const user = await getCurrentUser()
  
  // Check if user has contractor management permissions
  const canManageContractors = user?.permissions?.canManageContractors
  const contractors = canManageContractors ? await getContractors() : []

  const statusColors: any = {
    compliant: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    expired: 'bg-red-100 text-red-800',
  }

  const getExpiryWarning = (contractor: any) => {
    const now = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(now.getDate() + 30)

    const insuranceExpiry = contractor.insurance_expiry ? new Date(contractor.insurance_expiry) : null
    const licenseExpiry = contractor.license_expiry ? new Date(contractor.license_expiry) : null

    if ((insuranceExpiry && insuranceExpiry < now) || (licenseExpiry && licenseExpiry < now)) {
      return { text: 'EXPIRED', color: 'text-red-600' }
    }

    if ((insuranceExpiry && insuranceExpiry < thirtyDaysFromNow) || (licenseExpiry && licenseExpiry < thirtyDaysFromNow)) {
      return { text: 'Expiring Soon', color: 'text-yellow-600' }
    }

    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Contractors</h1>
          <p className="text-gray-600 mt-1">Manage contractors and track compliance</p>
        </div>
        {canManageContractors && (
          <div className="flex space-x-3">
            <Link
              href="/contractors/compliance"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Compliance Dashboard
            </Link>
            <Link
              href="/contractors/new"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700"
            >
              Add Contractor
            </Link>
          </div>
        )}
      </div>

      {/* Upgrade prompt for non-Pro users */}
      {!canManageContractors && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-primary rounded-lg p-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-4">
              <span className="text-6xl">🔧</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Contractor Management Requires Operations Pro
            </h2>
            <p className="text-gray-600 mb-6">
              Upgrade to Operations Pro Scale or Operations Pro Unlimited to unlock contractor management features including:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-6 max-w-2xl mx-auto">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-700">Add and manage contractors</span>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-700">Track compliance documents</span>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-700">Insurance & license expiry tracking</span>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-700">Token-based contractor access</span>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-700">Automated compliance reminders</span>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-700">Contractor submission reviews</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/subscription/manage"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Upgrade to Operations Pro
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}

      {canManageContractors && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Compliance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contractors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No contractors found. Add your first contractor to get started.
                </td>
              </tr>
            ) : (
              contractors.map((contractor: any) => {
                const warning = getExpiryWarning(contractor)
                return (
                  <tr key={contractor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/contractors/${contractor.id}`}
                        className="text-primary hover:text-blue-700 font-medium"
                      >
                        {contractor.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {contractor.company || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{contractor.email}</div>
                      {contractor.phone && (
                        <div className="text-sm text-gray-500">{contractor.phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {warning ? (
                        <span className={`text-sm font-medium ${warning.color}`}>
                          {warning.text}
                        </span>
                      ) : (
                        <span className="text-sm text-green-600">✓ Current</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          statusColors[contractor.compliance_status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {contractor.compliance_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/contractors/${contractor.id}`}
                        className="text-primary hover:text-blue-700"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        </div>
      )}

      {canManageContractors && user.subscription?.tier === 'operations_pro_scale' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Pro Scale Plan:</strong> You can add up to 50 contractors. Upgrade to Pro Unlimited for unlimited contractors.
          </p>
        </div>
      )}
    </div>
  )
}
