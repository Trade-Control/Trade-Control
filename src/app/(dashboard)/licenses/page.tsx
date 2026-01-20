import { getLicenses } from '@/actions/licenses'
import Link from 'next/link'
import AssignLicenseButton from '@/components/licenses/AssignLicenseButton'
import UnassignLicenseButton from '@/components/licenses/UnassignLicenseButton'

export default async function LicensesPage() {
  const licenses = await getLicenses()

  const ownerLicenses = licenses.filter((l: any) => l.type === 'owner')
  const managementLicenses = licenses.filter((l: any) => l.type === 'management')
  const fieldStaffLicenses = licenses.filter((l: any) => l.type === 'field_staff')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">License Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage user licenses and assign them to team members
          </p>
        </div>
        <Link
          href="/licenses/purchase"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700"
        >
          Purchase License
        </Link>
      </div>

      {/* Owner Licenses */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Owner License</h2>
          <p className="mt-1 text-sm text-gray-500">Free and unlimited</p>
        </div>
        <ul className="divide-y divide-gray-200">
          {ownerLicenses.map((license: any) => (
            <li key={license.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Owner License</p>
                  {license.assigned_user && (
                    <p className="text-sm text-gray-500">
                      Assigned to: {license.assigned_user.first_name}{' '}
                      {license.assigned_user.last_name} ({license.assigned_user.email})
                    </p>
                  )}
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Management Licenses */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Management Licenses</h2>
            <p className="mt-1 text-sm text-gray-500">$35 AUD/month per seat</p>
          </div>
          <span className="text-sm text-gray-500">
            {managementLicenses.length} license(s)
          </span>
        </div>
        {managementLicenses.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            No management licenses. Purchase one to add management users.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {managementLicenses.map((license: any) => (
              <li key={license.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Management License</p>
                    {license.assigned_user ? (
                      <p className="text-sm text-gray-500">
                        Assigned to: {license.assigned_user.first_name}{' '}
                        {license.assigned_user.last_name} ({license.assigned_user.email})
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">Unassigned</p>
                    )}
                  </div>
                  <div className="ml-4 flex items-center space-x-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        license.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {license.status}
                    </span>
                    {license.assigned_user ? (
                      <UnassignLicenseButton licenseId={license.id} />
                    ) : (
                      <AssignLicenseButton licenseId={license.id} />
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Field Staff Licenses */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Field Staff Licenses</h2>
            <p className="mt-1 text-sm text-gray-500">$15 AUD/month per seat</p>
          </div>
          <span className="text-sm text-gray-500">
            {fieldStaffLicenses.length} license(s)
          </span>
        </div>
        {fieldStaffLicenses.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            No field staff licenses. Purchase one to add field staff users.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {fieldStaffLicenses.map((license: any) => (
              <li key={license.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Field Staff License</p>
                    {license.assigned_user ? (
                      <p className="text-sm text-gray-500">
                        Assigned to: {license.assigned_user.first_name}{' '}
                        {license.assigned_user.last_name} ({license.assigned_user.email})
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">Unassigned</p>
                    )}
                  </div>
                  <div className="ml-4 flex items-center space-x-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        license.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {license.status}
                    </span>
                    {license.assigned_user ? (
                      <UnassignLicenseButton licenseId={license.id} />
                    ) : (
                      <AssignLicenseButton licenseId={license.id} />
                    )}
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
