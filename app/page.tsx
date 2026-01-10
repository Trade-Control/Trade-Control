'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Trade Control
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Professional workforce and contractor management for Australian trade businesses
          </p>
          <p className="text-lg text-gray-600 mb-12">
            Manage your team, track jobs, handle contractors, and stay compliant - all in one place
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/get-started"
              className="bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg transition-colors border-2 border-gray-200"
            >
              Log In
            </Link>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Team Management</h3>
            <p className="text-gray-600">
              Manage direct employees with role-based access. Track timesheets, assign jobs, and monitor progress.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-4xl mb-4">👷</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Contractor Control</h3>
            <p className="text-gray-600">
              Operations Pro: Manage external contractors, track compliance, and send secure job assignments.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-4xl mb-4">🛡️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Compliance Shield</h3>
            <p className="text-gray-600">
              Automatically flag expired insurance and licenses. Never work with non-compliant contractors.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-4xl mb-4">💼</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Job Management</h3>
            <p className="text-gray-600">
              Create quotes, generate invoices, track progress, and manage all your jobs in one place.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-4xl mb-4">📧</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Email Integration</h3>
            <p className="text-gray-600">
              Send quotes, invoices, and job assignments via email. All communications logged automatically.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Activity Tracking</h3>
            <p className="text-gray-600">
              Complete audit trail of all actions. View email communications, submissions, and status changes.
            </p>
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="mt-20 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl text-gray-600 mb-12">
            Choose the plan that fits your business
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-xl p-8 border-2 border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Operations</h3>
              <div className="text-4xl font-bold text-primary mb-4">$49<span className="text-xl text-gray-600">/mo</span></div>
              <p className="text-gray-600 mb-6">For sole traders & small teams</p>
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Job & schedule management</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Quotes & invoices</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Add team licenses</span>
                </li>
              </ul>
              <Link
                href="/get-started"
                className="block w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Start Free Trial
              </Link>
            </div>

            <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-xl p-8 text-white border-2 border-purple-500 relative">
              <div className="absolute top-0 right-0 bg-yellow-400 text-purple-900 px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-bold">
                POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2">Operations Pro</h3>
              <div className="text-4xl font-bold mb-4">$148+<span className="text-xl opacity-90">/mo</span></div>
              <p className="opacity-90 mb-6">For property managers & contractors</p>
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-300 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Everything in Operations</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-300 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Contractor management</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-300 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Compliance Shield</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-300 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Email job assignments</span>
                </li>
              </ul>
              <Link
                href="/get-started"
                className="block w-full bg-white text-purple-700 hover:bg-gray-100 py-3 rounded-lg font-semibold transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center bg-white rounded-2xl shadow-xl p-12 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to streamline your business?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join Australian trade businesses managing their operations with Trade Control
          </p>
          <Link
            href="/get-started"
            className="inline-block bg-primary hover:bg-primary-hover text-white px-12 py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg"
          >
            Start Your 14-Day Free Trial
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • Full access to all features
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            &copy; {new Date().getFullYear()} Trade Control. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
