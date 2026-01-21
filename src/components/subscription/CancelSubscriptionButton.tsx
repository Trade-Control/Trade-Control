'use client'

import { useState } from 'react'

export default function CancelSubscriptionButton() {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You can manage this in the billing portal.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      const data = await response.json()

      if (data.error) {
        alert(data.error)
        setLoading(false)
        return
      }

      // Redirect to Stripe portal where they can cancel
      window.location.href = data.url
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to open billing portal')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? 'Loading...' : 'Cancel Subscription'}
    </button>
  )
}
