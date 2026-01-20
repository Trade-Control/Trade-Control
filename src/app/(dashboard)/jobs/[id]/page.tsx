import { getJob } from '@/actions/jobs'
import Link from 'next/link'
import JobDetailTabs from '@/components/jobs/JobDetailTabs'

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const job = await getJob(params.id)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {job.job_number} - {job.title}
            </h1>
            <span
              className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${
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
          </div>
          {job.contact && (
            <p className="mt-1 text-sm text-gray-500">
              {job.contact.name}
              {job.contact.company && ` - ${job.contact.company}`}
            </p>
          )}
        </div>
        <Link
          href={`/jobs/${job.id}/edit`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Edit Job
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          {job.description && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900">{job.description}</dd>
            </div>
          )}

          {job.site_address && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Site Address</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {job.site_address}
                {job.site_city && `, ${job.site_city}`}
                {job.site_state && ` ${job.site_state}`}
                {job.site_postcode && ` ${job.site_postcode}`}
              </dd>
            </div>
          )}

          {job.contact && (
            <>
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact Email</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {job.contact.email || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {job.contact.phone || 'N/A'}
                </dd>
              </div>
            </>
          )}

          <div>
            <dt className="text-sm font-medium text-gray-500">Created By</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {job.created_by_user
                ? `${job.created_by_user.first_name} ${job.created_by_user.last_name}`
                : 'Unknown'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created Date</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(job.created_at).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>

      <JobDetailTabs jobId={job.id} />
    </div>
  )
}
