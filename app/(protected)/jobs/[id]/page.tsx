'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { redirect, useParams } from 'next/navigation';
import Link from 'next/link';
import { getUserPermissions } from '@/lib/middleware/role-check';

type TabType = 'details' | 'quotes' | 'invoices' | 'timesheets' | 'documents' | 'inventory' | 'travel' | 'activity' | 'contractors';

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  
  const [job, setJob] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [loading, setLoading] = useState(true);
  const [hasOperationsPro, setHasOperationsPro] = useState(false);
  const [canManageContractors, setCanManageContractors] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    fetchJob();
    checkPermissions();
  }, [jobId]);
  
  const checkPermissions = async () => {
    const permissions = await getUserPermissions();
    setCanManageContractors(permissions?.canManageContractors || false);
    
    // Check subscription tier
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
      
    if (!profile?.organization_id) return;
    
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('organization_id', profile.organization_id)
      .single();
      
    setHasOperationsPro(subscription?.tier === 'operations_pro');
  };

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
    ...(canManageContractors ? [{ id: 'contractors' as TabType, label: 'Contractors', icon: '👷' }] : []),
    { id: 'activity' as TabType, label: 'Activity', icon: '📊' },
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

        {activeTab === 'contractors' && canManageContractors && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Contractor Assignments</h2>
              <Link
                href={`/jobs/${jobId}/assign-contractor`}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Assign Contractor
              </Link>
            </div>
            <p className="text-gray-600 mb-6">
              Assign external contractors to this job. They'll receive a secure email link to view job details and submit progress.
            </p>
            
            {/* Show existing contractor assignments */}
            <ContractorAssignmentsList jobId={jobId} />
          </div>
        )}

        {activeTab === 'activity' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Activity Feed</h2>
              <Link
                href={`/jobs/${jobId}/activity`}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                View Full Activity
              </Link>
            </div>
            <p className="text-gray-600">
              View chronological activity log for this job including emails sent, status changes, and contractor submissions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Component to show contractor assignments
function ContractorAssignmentsList({ jobId }: { jobId: string }) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchAssignments();
  }, [jobId]);

  const fetchAssignments = async () => {
    const { data } = await supabase
      .from('contractor_job_assignments')
      .select('*, contractors(*)')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    setAssignments(data || []);
    setLoading(false);
  };

  if (loading) {
    return <div className="text-gray-600">Loading assignments...</div>;
  }

  if (assignments.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <div className="text-4xl mb-2">👷</div>
        <p className="text-gray-600">No contractors assigned to this job yet.</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <div key={assignment.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-gray-900">
                {assignment.contractors.contractor_name}
              </h3>
              {assignment.contractors.company_name && (
                <p className="text-sm text-gray-600">{assignment.contractors.company_name}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Assigned {new Date(assignment.created_at).toLocaleDateString()}
              </p>
            </div>
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.status)}`}>
              {assignment.status.replace('_', ' ')}
            </span>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            <p>Email: {assignment.contractors.email}</p>
            <p>Token expires: {new Date(assignment.token_expires_at).toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
