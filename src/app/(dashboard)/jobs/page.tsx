import { getJobs } from '@/actions/jobs'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export default async function JobsPage() {
  const jobs = await getJobs()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <Link
          href="/jobs/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700"
        >
          Create Job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new job.</p>
          <div className="mt-6">
            <Link
              href="/jobs/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700"
            >
              Create Job
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {jobs.map((job: any) => (
              <li key={job.id}>
                <Link href={`/jobs/${job.id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate">
                          {job.job_number} - {job.title}
                        </p>
                        {job.contact && (
                          <p className="mt-1 text-sm text-gray-500">
                            {job.contact.name}
                            {job.contact.company && ` - ${job.contact.company}`}
                          </p>
                        )}
                        {job.site_address && (
                          <p className="mt-1 text-sm text-gray-500">{job.site_address}</p>
                        )}
                      </div>
                      <div className="ml-4 flex-shrink-0 flex items-center space-x-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            job.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : job.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : job.status === 'quoted'
                              ? 'bg-yellow-100 text-yellow-800'
                              : job.status === 'approved'
                              ? 'bg-purple-100 text-purple-800'
                              : job.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {job.status.replace('_', ' ')}
                        </span>
                        <p className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
