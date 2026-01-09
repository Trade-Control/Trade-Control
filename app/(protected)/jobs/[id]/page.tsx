'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { redirect, useParams } from 'next/navigation';
import Link from 'next/link';

type TabType = 'details' | 'quotes' | 'invoices' | 'timesheets' | 'documents' | 'inventory' | 'travel';

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  
  const [job, setJob] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        contacts (
          contact_name,
          company_name,
          email,
          phone
        )
      `)
      .eq('id', jobId)
      .single();

    if (error || !data) {
      redirect('/jobs');
    } else {
      setJob(data);
    }
    setLoading(false);
  };

  if (loading || !job) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      quoted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const tabs = [
    { id: 'details' as TabType, label: 'Details', icon: '📋' },
    { id: 'quotes' as TabType, label: 'Quotes', icon: '📄' },
    { id: 'invoices' as TabType, label: 'Invoices', icon: '🧾' },
    { id: 'timesheets' as TabType, label: 'Timesheets', icon: '⏱️' },
    { id: 'documents' as TabType, label: 'Documents', icon: '📁' },
    { id: 'inventory' as TabType, label: 'Inventory', icon: '📦' },
    { id: 'travel' as TabType, label: 'Travel', icon: '🚗' },
  ];

  return (
    <div>
      <div className="mb-8">
        <Link href="/jobs" className="text-primary hover:text-primary-hover mb-4 inline-block">
          ← Back to Jobs
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
            <p className="text-gray-600 mt-2">Job #{job.job_number}</p>
          </div>
          <span className={`px-4 py-2 text-sm font-medium rounded-full ${getStatusColor(job.status)}`}>
            {job.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-t-lg shadow mb-0">
        <div className="flex flex-wrap border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-b-lg shadow p-6">
        {activeTab === 'details' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Job Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Client</p>
                <p className="font-medium">
                  {(job.contacts as any)?.company_name || (job.contacts as any)?.contact_name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Contact</p>
                <p className="font-medium">{(job.contacts as any)?.phone || 'N/A'}</p>
                <p className="text-sm text-gray-600">{(job.contacts as any)?.email || ''}</p>
              </div>
              {job.site_address && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 mb-1">Site Address</p>
                  <p className="font-medium">
                    {job.site_address}
                    {job.site_city && `, ${job.site_city}`}
                    {job.site_state && ` ${job.site_state}`}
                    {job.site_postcode && ` ${job.site_postcode}`}
                  </p>
                </div>
              )}
              {job.description && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 mb-1">Description</p>
                  <p className="font-medium">{job.description}</p>
                </div>
              )}
              {(job.start_date || job.end_date) && (
                <>
                  {job.start_date && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Start Date</p>
                      <p className="font-medium">{new Date(job.start_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {job.end_date && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">End Date</p>
                      <p className="font-medium">{new Date(job.end_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'quotes' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Quotes</h2>
              <Link
                href={`/jobs/${jobId}/quotes`}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Manage Quotes
              </Link>
            </div>
            <p className="text-gray-600">
              Create and manage quotes for this job. Click "Manage Quotes" to view all quotes or create a new one.
            </p>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Invoices</h2>
              <Link
                href={`/jobs/${jobId}/invoices`}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Manage Invoices
              </Link>
            </div>
            <p className="text-gray-600">
              Generate and send invoices for this job. Invoices can be created from accepted quotes.
            </p>
          </div>
        )}

        {activeTab === 'timesheets' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Timesheets</h2>
              <Link
                href={`/jobs/${jobId}/timesheets`}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Manage Timesheets
              </Link>
            </div>
            <p className="text-gray-600">
              Track time spent on this job. Clock in/out or manually enter time entries.
            </p>
          </div>
        )}

        {activeTab === 'documents' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Documents</h2>
              <Link
                href={`/jobs/${jobId}/documents`}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Manage Documents
              </Link>
            </div>
            <p className="text-gray-600">
              Upload and manage files related to this job. Store photos, PDFs, and other documents.
            </p>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Inventory Allocation</h2>
              <Link
                href={`/jobs/${jobId}/inventory-allocation`}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Manage Inventory
              </Link>
            </div>
            <p className="text-gray-600">
              Allocate inventory items to this job. Track materials used and their costs.
            </p>
          </div>
        )}

        {activeTab === 'travel' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Travel Tracking</h2>
              <Link
                href={`/jobs/${jobId}/travel`}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Manage Travel
              </Link>
            </div>
            <p className="text-gray-600">
              Track travel to and from this job site. Record distance, time, and calculate routes using Google Maps.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
