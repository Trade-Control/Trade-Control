'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function GetStartedPage() {
  const [selectedTier, setSelectedTier] = useState<'operations' | 'operations_pro'>('operations');

  const features = {
    operations: [
      'Manage your direct employees',
      'Daily schedule management',
      'Job tracking and quotes',
      'Invoicing and payments',
      'Timesheet management',
      'Document storage',
      'Inventory tracking',
      'Travel logging',
    ],
    operations_pro: [
      'Everything in Operations, plus:',
      'External contractor management',
      'Compliance Shield - automatic flagging',
      'Token-based contractor access',
      'Insurance & license tracking',
      'Email job assignments',
      'Contractor submission review',
      'Activity feed and communication log',
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to Trade Control
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Powerful workforce management for sole traders, small teams, property managers, and maintenance firms
          </p>
        </div>

        {/* Tier Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-2 shadow-md inline-flex">
            <button
              onClick={() => setSelectedTier('operations')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                selectedTier === 'operations'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Operations
            </button>
            <button
              onClick={() => setSelectedTier('operations_pro')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                selectedTier === 'operations_pro'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Operations Pro
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-12">
          {/* Operations Tier */}
          <div
            className={`bg-white rounded-xl shadow-xl p-8 border-2 transition-all ${
              selectedTier === 'operations'
                ? 'border-primary scale-105'
                : 'border-transparent hover:border-gray-200'
            }`}
          >
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Operations</h2>
              <p className="text-gray-600 mb-4">For Sole Traders & Small Teams</p>
              <div className="text-5xl font-bold text-primary mb-2">$49</div>
              <p className="text-gray-500">per month AUD</p>
              <p className="text-sm text-gray-500 mt-2">Includes Owner/License Manager seat</p>
            </div>

            <div className="space-y-3 mb-8">
              {features.operations.map((feature, index) => (
                <div key={index} className="flex items-start">
                  <svg
                    className="w-6 h-6 text-green-500 mr-2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">Add-on Licenses:</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Management Logins: <strong>$35/mo</strong> each</li>
                <li>• Field Staff Logins: <strong>$15/mo</strong> each</li>
              </ul>
            </div>

            <Link
              href="/subscribe?tier=operations"
              className="block w-full text-center bg-primary hover:bg-primary-hover text-white py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              Choose Operations
            </Link>
          </div>

          {/* Operations Pro Tier */}
          <div
            className={`bg-white rounded-xl shadow-xl p-8 border-2 transition-all relative ${
              selectedTier === 'operations_pro'
                ? 'border-purple-500 scale-105'
                : 'border-transparent hover:border-gray-200'
            }`}
          >
            <div className="absolute top-0 right-0 bg-purple-500 text-white px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-semibold">
              POPULAR
            </div>

            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Operations Pro</h2>
              <p className="text-gray-600 mb-4">For Property Managers & Contractors</p>
              <div className="text-4xl font-bold text-purple-600 mb-2">Operations Base +</div>
              <p className="text-2xl font-bold text-gray-900">$99 or $199/mo</p>
              <p className="text-sm text-gray-500 mt-2">Scale (50 contractors) or Unlimited</p>
            </div>

            <div className="space-y-3 mb-8">
              {features.operations_pro.map((feature, index) => (
                <div key={index} className="flex items-start">
                  <svg
                    className="w-6 h-6 text-purple-500 mr-2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            <div className="bg-purple-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">Contractor Limits:</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Scale: Up to <strong>50 active contractors</strong></li>
                <li>• Unlimited: <strong>Unlimited contractors</strong></li>
              </ul>
            </div>

            <Link
              href="/subscribe?tier=operations_pro"
              className="block w-full text-center bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              Choose Operations Pro
            </Link>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Feature Comparison
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4">Feature</th>
                  <th className="text-center py-3 px-4">Operations</th>
                  <th className="text-center py-3 px-4 bg-purple-50">Operations Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 px-4">Job Management</td>
                  <td className="text-center py-3 px-4">✓</td>
                  <td className="text-center py-3 px-4 bg-purple-50">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Quotes & Invoices</td>
                  <td className="text-center py-3 px-4">✓</td>
                  <td className="text-center py-3 px-4 bg-purple-50">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Employee Management</td>
                  <td className="text-center py-3 px-4">✓</td>
                  <td className="text-center py-3 px-4 bg-purple-50">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Contractor Management</td>
                  <td className="text-center py-3 px-4">-</td>
                  <td className="text-center py-3 px-4 bg-purple-50">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Compliance Tracking</td>
                  <td className="text-center py-3 px-4">-</td>
                  <td className="text-center py-3 px-4 bg-purple-50">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Email Job Assignments</td>
                  <td className="text-center py-3 px-4">-</td>
                  <td className="text-center py-3 px-4 bg-purple-50">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Token-based Access</td>
                  <td className="text-center py-3 px-4">-</td>
                  <td className="text-center py-3 px-4 bg-purple-50">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Frequently Asked Questions
          </h3>
          
          <div className="space-y-4">
            <details className="bg-white rounded-lg shadow p-6">
              <summary className="font-semibold text-gray-900 cursor-pointer">
                Can I upgrade or downgrade later?
              </summary>
              <p className="mt-3 text-gray-600">
                Yes! You can upgrade from Operations to Operations Pro at any time. Pro-rata billing ensures you only pay for what you use.
              </p>
            </details>

            <details className="bg-white rounded-lg shadow p-6">
              <summary className="font-semibold text-gray-900 cursor-pointer">
                How does license billing work?
              </summary>
              <p className="mt-3 text-gray-600">
                When you add licenses mid-billing cycle, you'll only be charged for the remaining days in the current period. Future renewals will be at the full monthly rate.
              </p>
            </details>

            <details className="bg-white rounded-lg shadow p-6">
              <summary className="font-semibold text-gray-900 cursor-pointer">
                What's the difference between license types?
              </summary>
              <p className="mt-3 text-gray-600">
                Management Logins ($35/mo) can manage and assign jobs, create quotes/invoices. Field Staff Logins ($15/mo) can only view their assigned jobs and update completion data.
              </p>
            </details>

            <details className="bg-white rounded-lg shadow p-6">
              <summary className="font-semibold text-gray-900 cursor-pointer">
                Do I need Operations Pro for contractors?
              </summary>
              <p className="mt-3 text-gray-600">
                Yes, if you work with external contractors. Operations Pro includes compliance tracking, email job assignments with secure links, and contractor submission review features.
              </p>
            </details>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-600">
          <p>Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
