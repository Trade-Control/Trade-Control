'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function VerifyEmailPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')

  useEffect(() => {
    // Get pending signup details
    const pendingSignup = sessionStorage.getItem('pendingSignup')
    if (pendingSignup) {
      const data = JSON.parse(pendingSignup)
      setEmail(data.email)
    } else {
      // No pending signup, redirect to signup
      router.push('/signup')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary text-white mb-4">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Check your email
          </h2>
          
          <div className="mt-4 space-y-3">
            <p className="text-base text-gray-600">
              We&apos;ve sent a verification link to:
            </p>
            <p className="text-lg font-medium text-primary">
              {email}
            </p>
            <p className="text-sm text-gray-500">
              Click the link in the email to verify your account and continue with your subscription setup.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong className="text-gray-900">Next steps:</strong>
            </p>
            <ol className="mt-2 text-sm text-left text-gray-600 space-y-2 list-decimal list-inside">
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the verification link</li>
              <li>You&apos;ll be redirected to complete your subscription</li>
              <li>Start your 14-day free trial</li>
            </ol>
          </div>

          <p className="text-xs text-gray-500">
            Didn&apos;t receive the email? Check your spam folder or contact support.
          </p>
        </div>
      </div>
    </div>
  )
}
