import { getCurrentUser } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PurchaseLicensePage() {
  const user = await getCurrentUser()

  if (!user || user.role !== 'owner') {
    redirect('/dashboard')
  }

  const licenseTypes = [
    {
      name: 'Management License',
      price: '$35 AUD',
      period: 'per month',
      description: 'Full job, quote, and invoice management capabilities',
      features: [
        'Create and edit jobs',
        'Manage quotes and invoices',
        'Access all jobs (not just assigned)',
        'Manage contacts and inventory',
        'Assign contractors (if Operations Pro)',
        'Export reports',
      ],
      icon: '👔',
    },
    {
      name: 'Field Staff License',
      price: '$15 AUD',
      period: 'per month',
      description: 'View-only access to assigned jobs with status updates',
      features: [
        'View assigned jobs only',
        'Update job status and notes',
        'Clock in/out for timesheets',
        'Upload documents to jobs',
        'Log travel for jobs',
        'View assigned job schedule',
      ],
      icon: '🔨',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/licenses"
          className="text-sm text-primary hover:text-blue-700 mb-4 inline-flex items-center"
        >
          ← Back to Licenses
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Purchase License</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add licenses to expand your team
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {licenseTypes.map((license) => (
          <div
            key={license.name}
            className="bg-white shadow rounded-lg overflow-hidden border-2 border-gray-200 hover:border-primary transition-colors"
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <span className="text-4xl mr-4">{license.icon}</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{license.name}</h2>
                  <p className="text-sm text-gray-500">{license.description}</p>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold text-primary">{license.price}</span>
                <span className="text-gray-500"> {license.period}</span>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Features:</h3>
                <ul className="space-y-2">
                  {license.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                disabled
                className="w-full px-4 py-3 bg-gray-300 text-gray-600 rounded-md font-medium cursor-not-allowed"
              >
                Stripe Integration Coming Soon
              </button>
              <p className="mt-2 text-xs text-gray-500 text-center">
                License purchases will be available once Stripe integration is complete
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">How License Billing Works</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Licenses are billed monthly and added to your subscription</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>You can assign and unassign licenses to users at any time</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Unassigned licenses remain available for reassignment</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Pro-rata billing applies for mid-cycle additions or removals</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Cancel anytime - access continues until the end of the billing period</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
