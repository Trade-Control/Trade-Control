'use client'

import { unassignLicense } from '@/actions/licenses'
import { useState } from 'react'

interface UnassignLicenseButtonProps {
  licenseId: string
}

export default function UnassignLicenseButton({ licenseId }: UnassignLicenseButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleUnassign = async () => {
    if (!confirm('Are you sure you want to unassign this license? The user will lose access.')) {
      return
    }

    setLoading(true)
    try {
      await unassignLicense(licenseId)
    } catch (err: any) {
      alert(err.message || 'Failed to unassign license')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleUnassign}
      disabled={loading}
      className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
    >
      {loading ? 'Unassigning...' : 'Unassign'}
    </button>
  )
}
