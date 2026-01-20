'use client'

import { useState } from 'react'

interface JobDetailTabsProps {
  jobId: string
}

export default function JobDetailTabs({ jobId }: JobDetailTabsProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'quotes', name: 'Quotes' },
    { id: 'invoices', name: 'Invoices' },
    { id: 'timesheets', name: 'Timesheets' },
    { id: 'documents', name: 'Documents' },
    { id: 'activity', name: 'Activity' },
  ]

  return (
    <div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm text-gray-500">Job overview and details</p>
          </div>
        )}
        {activeTab === 'quotes' && (
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm text-gray-500">Quotes will appear here</p>
          </div>
        )}
        {activeTab === 'invoices' && (
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm text-gray-500">Invoices will appear here</p>
          </div>
        )}
        {activeTab === 'timesheets' && (
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm text-gray-500">Timesheets will appear here</p>
          </div>
        )}
        {activeTab === 'documents' && (
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm text-gray-500">Documents will appear here</p>
          </div>
        )}
        {activeTab === 'activity' && (
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm text-gray-500">Activity feed will appear here</p>
          </div>
        )}
      </div>
    </div>
  )
}
