'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { validateToken, submitContractorTimesheet, submitContractorNotes } from '@/actions/contractor-access'

export default function ContractorAccessPage() {
  const params = useParams()
  const token = params.token as string
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('details')
  
  // Timesheet form
  const [timesheetData, setTimesheetData] = useState({
    clock_on: '',
    clock_off: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState('')

  // Notes form
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const validate = async () => {
      const result = await validateToken(token)
      if (!result.valid) {
        setError(result.error || 'Invalid token')
        setLoading(false)
        return
      }

      setData(result)
      setNotes(result.assignment?.notes || '')
      setLoading(false)
    }

    validate()
  }, [token])

  const handleTimesheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitSuccess('')
    setSubmitting(true)

    const result = await submitContractorTimesheet(token, timesheetData)

    if (result.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    setSubmitSuccess('Timesheet submitted successfully!')
    setTimesheetData({ clock_on: '', clock_off: '', notes: '' })
    setSubmitting(false)
  }

  const handleNotesSubmit = async () => {
    setError('')
    setSubmitSuccess('')
    setSubmitting(true)

    const result = await submitContractorNotes(token, notes)

    if (result.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    setSubmitSuccess('Notes saved successfully!')
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Validating access...</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-8 text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">{data.organization?.name}</h1>
          <p className="mt-1">Contractor Portal</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Welcome Message */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Welcome, {data.contractor?.name}
          </h2>
          <p className="text-gray-600">
            You have been assigned to: <strong>{data.job?.title}</strong>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Job #{data.job?.job_number}
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'details'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Job Details
              </button>
              <button
                onClick={() => setActiveTab('timesheet')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'timesheet'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Submit Timesheet
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'notes'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Notes
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Job Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Job Title</label>
                  <p className="text-gray-900">{data.job?.title}</p>
                </div>

                {data.job?.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{data.job?.description}</p>
                  </div>
                )}

                {data.job?.site_address && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Site Address</label>
                    <p className="text-gray-900">
                      {data.job?.site_address}<br />
                      {data.job?.site_city && `${data.job?.site_city}, `}
                      {data.job?.site_state && `${data.job?.site_state} `}
                      {data.job?.site_postcode}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-gray-900 capitalize">{data.job?.status}</p>
                </div>
              </div>
            )}

            {/* Timesheet Tab */}
            {activeTab === 'timesheet' && (
              <form onSubmit={handleTimesheetSubmit} className="space-y-6">
                {submitSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                    {submitSuccess}
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clock On Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={timesheetData.clock_on}
                    onChange={(e) => setTimesheetData({ ...timesheetData, clock_on: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clock Off Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={timesheetData.clock_off}
                    onChange={(e) => setTimesheetData({ ...timesheetData, clock_off: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    rows={4}
                    value={timesheetData.notes}
                    onChange={(e) => setTimesheetData({ ...timesheetData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="Describe work completed..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Timesheet'}
                </button>
              </form>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <div className="space-y-6">
                {submitSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                    {submitSuccess}
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Notes
                  </label>
                  <textarea
                    rows={8}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="Add notes, updates, or questions here..."
                  />
                </div>

                <button
                  onClick={handleNotesSubmit}
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>This access link will expire on {new Date(data.assignment?.token_expires_at).toLocaleDateString('en-AU')}</p>
        </div>
      </div>
    </div>
  )
}
