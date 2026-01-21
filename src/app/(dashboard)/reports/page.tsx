import { getCurrentUser } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { getJobs } from '@/actions/jobs'
import { getInvoices } from '@/actions/invoices'

export default async function ReportsPage() {
  const user = await getCurrentUser()

  if (!user?.permissions?.canViewReports) {
    redirect('/dashboard')
  }

  const jobs = await getJobs()
  const invoices = await getInvoices()

  // Calculate statistics
  const totalJobs = jobs.length
  const activeJobs = jobs.filter((job: any) => job.status === 'in_progress' || job.status === 'scheduled').length
  const completedJobs = jobs.filter((job: any) => job.status === 'completed').length
  
  const totalInvoiced = invoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0)
  const paidInvoices = invoices.filter((inv: any) => inv.payment_status === 'paid')
  const totalPaid = paidInvoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0)
  const totalOutstanding = totalInvoiced - totalPaid

  // Recent jobs
  const recentJobs = jobs.slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your business performance
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Jobs */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">💼</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Jobs</dt>
                  <dd className="text-2xl font-bold text-gray-900">{totalJobs}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Active Jobs */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🔄</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Jobs</dt>
                  <dd className="text-2xl font-bold text-gray-900">{activeJobs}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Completed Jobs */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed Jobs</dt>
                  <dd className="text-2xl font-bold text-gray-900">{completedJobs}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Invoiced</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    ${totalInvoiced.toFixed(2)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Revenue Summary</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Total Invoiced</dt>
              <dd className="text-sm font-medium text-gray-900">${totalInvoiced.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Total Paid</dt>
              <dd className="text-sm font-medium text-green-600">${totalPaid.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between pt-3 border-t border-gray-200">
              <dt className="text-sm font-medium text-gray-900">Outstanding</dt>
              <dd className="text-sm font-medium text-orange-600">${totalOutstanding.toFixed(2)}</dd>
            </div>
          </dl>
        </div>

        {/* Job Status Breakdown */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Job Status Breakdown</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Total Jobs</dt>
              <dd className="text-sm font-medium text-gray-900">{totalJobs}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Active</dt>
              <dd className="text-sm font-medium text-blue-600">{activeJobs}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Completed</dt>
              <dd className="text-sm font-medium text-green-600">{completedJobs}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Completion Rate</dt>
              <dd className="text-sm font-medium text-gray-900">
                {totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(1) : 0}%
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Jobs</h2>
        </div>
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No jobs found
                  </td>
                </tr>
              ) : (
                recentJobs.map((job: any) => (
                  <tr key={job.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {job.job_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {job.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.contact?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
