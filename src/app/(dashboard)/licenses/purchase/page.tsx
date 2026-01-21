'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ManagementLicenseIcon, FieldStaffLicenseIcon } from '@/components/icons/NavigationIcons'

export default function PurchaseLicensePage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const licenseTypes = [
    {
      id: 'management',
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
      Icon: ManagementLicenseIcon,
    },
    {
      id: 'field_staff',
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
      Icon: FieldStaffLicenseIcon,
    },
  ]

  const handlePurchase = async (licenseType: string) => {
    setLoading(licenseType)
    try {
      const response = await fetch('/api/stripe/create-license-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          license_type: licenseType,
          quantity: 1,
        }),
      })

      const data = await response.json()

      if (data.error) {
        alert(data.error)
        setLoading(null)
        return
      }

      // Success - license added directly to subscription
      if (data.success) {
        alert(data.message || 'License purchased successfully!')
        // Redirect to licenses page to see the new license
        router.push('/licenses')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to purchase license')
      setLoading(null)
    }
  }

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
        {licenseTypes.map((license) => {
          const Icon = license.Icon
          return (
            <div
              key={license.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-primary transition-colors"
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mr-4">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{license.name}</h2>
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
                  onClick={() => handlePurchase(license.id)}
                  disabled={loading !== null}
                  className="w-full px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading === license.id ? 'Loading...' : `Purchase ${license.name}`}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">How License Billing Works</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Licenses are added to your subscription immediately</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>During trial: Licenses added now will be charged when your trial ends</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>After trial: Pro-rata billing applies for the remainder of the billing period</span>
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
            <span>Cancel anytime - access continues until the end of the billing period</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
