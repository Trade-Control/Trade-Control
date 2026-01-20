'use client'

import { useState, useEffect } from 'react'
import { clockIn, clockOut, getActiveTimesheet } from '@/actions/timesheets'
import { useRouter } from 'next/navigation'

export default function ClockInOutButton({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [activeTimesheet, setActiveTimesheet] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadActiveTimesheet()
  }, [])

  const loadActiveTimesheet = async () => {
    setLoading(true)
    const timesheet = await getActiveTimesheet()
    setActiveTimesheet(timesheet)
    setLoading(false)
  }

  const handleClockIn = async () => {
    setError('')
    setActionLoading(true)
    const result = await clockIn(jobId)
    
    if (result.error) {
      setError(result.error)
      setActionLoading(false)
      return
    }

    await loadActiveTimesheet()
    setActionLoading(false)
    router.refresh()
  }

  const handleClockOut = async () => {
    if (!activeTimesheet) return
    
    setError('')
    setActionLoading(true)
    const result = await clockOut(activeTimesheet.id)
    
    if (result.error) {
      setError(result.error)
      setActionLoading(false)
      return
    }

    setActiveTimesheet(null)
    setActionLoading(false)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-500">
        Loading...
      </div>
    )
  }

  const isClockedIntoThisJob = activeTimesheet?.job_id === jobId
  const isClockedIntoOtherJob = activeTimesheet && activeTimesheet.job_id !== jobId

  return (
    <div className="space-y-2">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {isClockedIntoThisJob ? (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm text-green-600">
            <span className="inline-block w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
            <span>Clocked in since {new Date(activeTimesheet.clock_on).toLocaleTimeString('en-AU')}</span>
          </div>
          <button
            onClick={handleClockOut}
            disabled={actionLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
          >
            {actionLoading ? 'Clocking Out...' : 'Clock Out'}
          </button>
        </div>
      ) : isClockedIntoOtherJob ? (
        <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
          You are clocked into {activeTimesheet.job?.job_number}. Clock out before clocking into this job.
        </div>
      ) : (
        <button
          onClick={handleClockIn}
          disabled={actionLoading}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
        >
          {actionLoading ? 'Clocking In...' : 'Clock In'}
        </button>
      )}
    </div>
  )
}
