import Link from 'next/link'
import { getComplianceStatus } from '@/actions/contractors'
import { getCurrentUser } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'

export default async function ComplianceDashboardPage() {
  const user = await getCurrentUser()
  
  if (!user?.permissions?.canTrackCompliance) {
    redirect('/dashboard')
  }

  const { compliant, expiringSoon, expired } = await getComplianceStatus()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor contractor compliance status</p>
        </div>
        <Link
          href="/contractors"
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back to Contractors
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900">Compliant</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{compliant.length}</p>
          <p className="text-sm text-green-700 mt-1">All documents current</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900">Expiring Soon</h3>
          <p className="text-3xl font-bold text-yellow-600 mt-2">{expiringSoon.length}</p>
          <p className="text-sm text-yellow-700 mt-1">Within 30 days</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900">Expired</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">{expired.length}</p>
          <p className="text-sm text-red-700 mt-1">Immediate attention required</p>
        </div>
      </div>

      {/* Expired Contractors */}
      {expired.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-red-50 px-6 py-4 border-b border-red-200">
            <h2 className="text-lg font-semibold text-red-900">⚠️ Expired Documents</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contractor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Insurance Expiry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  License Expiry
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expired.map((contractor: any) => (
                <tr key={contractor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/contractors/${contractor.id}`}
                      className="text-primary hover:text-blue-700 font-medium"
                    >
                      {contractor.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contractor.insurance_expiry ? (
                      <span className={new Date(contractor.insurance_expiry) < new Date() ? 'text-red-600 font-medium' : ''}>
                        {formatDate(contractor.insurance_expiry)}
                      </span>
                    ) : (
                      <span className="text-gray-400">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contractor.license_expiry ? (
                      <span className={new Date(contractor.license_expiry) < new Date() ? 'text-red-600 font-medium' : ''}>
                        {formatDate(contractor.license_expiry)}
                      </span>
                    ) : (
                      <span className="text-gray-400">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link
                      href={`/contractors/${contractor.id}`}
                      className="text-primary hover:text-blue-700"
                    >
                      Update
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expiring Soon */}
      {expiringSoon.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-yellow-50 px-6 py-4 border-b border-yellow-200">
            <h2 className="text-lg font-semibold text-yellow-900">⏰ Expiring Within 30 Days</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contractor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Insurance Expiry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  License Expiry
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expiringSoon.map((contractor: any) => (
                <tr key={contractor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/contractors/${contractor.id}`}
                      className="text-primary hover:text-blue-700 font-medium"
                    >
                      {contractor.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contractor.insurance_expiry ? formatDate(contractor.insurance_expiry) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contractor.license_expiry ? formatDate(contractor.license_expiry) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link
                      href={`/contractors/${contractor.id}`}
                      className="text-primary hover:text-blue-700"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Compliant Contractors */}
      {compliant.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-green-50 px-6 py-4 border-b border-green-200">
            <h2 className="text-lg font-semibold text-green-900">✓ Compliant Contractors</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contractor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Insurance Expiry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  License Expiry
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {compliant.map((contractor: any) => (
                <tr key={contractor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/contractors/${contractor.id}`}
                      className="text-primary hover:text-blue-700 font-medium"
                    >
                      {contractor.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contractor.insurance_expiry ? formatDate(contractor.insurance_expiry) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contractor.license_expiry ? formatDate(contractor.license_expiry) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link
                      href={`/contractors/${contractor.id}`}
                      className="text-primary hover:text-blue-700"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
