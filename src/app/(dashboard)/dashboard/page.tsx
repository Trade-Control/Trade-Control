import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import Link from 'next/link'

async function getDashboardStats(organizationId: string) {
  const supabase = await createClient()

  // Get total jobs
  const { count: totalJobs } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  // Get jobs by status
  const { data: jobs } = await supabase
    .from('jobs')
    .select('status')
    .eq('organization_id', organizationId)

  const inProgressJobs = jobs?.filter((j) => j.status === 'in_progress').length || 0
  const completedJobs = jobs?.filter((j) => j.status === 'completed').length || 0

  // Get total contacts
  const { count: totalContacts } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  // Get pending quotes
  const { count: pendingQuotes } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'sent')

  // Get recent jobs
  const { data: recentJobs } = await supabase
    .from('jobs')
    .select(`
      id,
      job_number,
      title,
      status,
      created_at,
      contact:contacts(name)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    totalJobs: totalJobs || 0,
    inProgressJobs,
    completedJobs,
    totalContacts: totalContacts || 0,
    pendingQuotes: pendingQuotes || 0,
    recentJobs: recentJobs || [],
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  
  if (!user || !user.organizationId) {
    return null
  }

  const stats = await getDashboardStats(user.organizationId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.firstName}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's what's happening with your business today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">Total Jobs</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {stats.totalJobs}
                </dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {stats.inProgressJobs}
                </dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">Contacts</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {stats.totalContacts}
                </dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">Pending Quotes</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {stats.pendingQuotes}
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {user.role !== 'field_staff' && (
            <>
              <Link
                href="/jobs/new"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700"
              >
                New Job
              </Link>
              <Link
                href="/contacts/new"
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Add Contact
              </Link>
              <Link
                href="/inventory"
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Manage Inventory
              </Link>
            </>
          )}
          <Link
            href="/travel-tracking/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Log Travel
          </Link>
        </div>
      </div>

      {/* Recent Jobs */}
      {user.role !== 'field_staff' && stats.recentJobs.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Jobs</h2>
          </div>
          <ul className="divide-y divide-gray-200">
            {stats.recentJobs.map((job: any) => (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="block hover:bg-gray-50 px-6 py-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {job.job_number} - {job.title}
                      </p>
                      {job.contact && (
                        <p className="text-sm text-gray-500">
                          {job.contact.name}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          job.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : job.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : job.status === 'quoted'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-6 py-4 bg-gray-50 text-center">
            <Link
              href="/jobs"
              className="text-sm font-medium text-primary hover:text-blue-700"
            >
              View all jobs →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
