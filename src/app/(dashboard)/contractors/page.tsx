import Link from 'next/link'
import { getContractors } from '@/actions/contractors'
import { getCurrentUser } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'

export default async function ContractorsPage() {
  const user = await getCurrentUser()
  
  if (!user?.permissions?.canManageContractors) {
    redirect('/dashboard')
  }

  const contractors = await getContractors()

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
      </div>

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

      {user.subscription?.tier === 'operations_pro_scale' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Pro Scale Plan:</strong> You can add up to 50 contractors. Upgrade to Pro Unlimited for unlimited contractors.
          </p>
        </div>
      )}
    </div>
  )
}
