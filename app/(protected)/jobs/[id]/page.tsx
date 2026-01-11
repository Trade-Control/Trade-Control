'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { redirect, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserPermissions } from '@/lib/middleware/role-check';
import QuoteForm from '@/components/jobs/QuoteForm';
import DocumentUpload from '@/components/jobs/DocumentUpload';
import TimesheetClock from '@/components/jobs/TimesheetClock';
import AddressAutocomplete from '@/components/AddressAutocomplete';

type TabType = 'details' | 'quotes' | 'invoices' | 'timesheets' | 'documents' | 'inventory' | 'travel' | 'activity' | 'contractors';

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  
  const [job, setJob] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [loading, setLoading] = useState(true);
  const [hasOperationsPro, setHasOperationsPro] = useState(false);
  const [canManageContractors, setCanManageContractors] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  const supabase = useSafeSupabaseClient();

  useEffect(() => {
    if (supabase) {
      fetchJob();
    }
    checkPermissions();
  }, [jobId]);
  
  const checkPermissions = async () => {
    const permissions = await getUserPermissions();
    setCanManageContractors(permissions?.canManageContractors || false);
    
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
    if (!supabase) return;
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      quoted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      in_progress: 'bg-amber-100 text-amber-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-700',
      normal: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  const tabs = [
    { id: 'details' as TabType, label: 'Details', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { id: 'quotes' as TabType, label: 'Quotes', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { id: 'invoices' as TabType, label: 'Invoices', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    { id: 'timesheets' as TabType, label: 'Timesheets', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'documents' as TabType, label: 'Documents', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg> },
    { id: 'inventory' as TabType, label: 'Inventory', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
    { id: 'travel' as TabType, label: 'Travel', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg> },
    ...(canManageContractors ? [{ id: 'contractors' as TabType, label: 'Contractors', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> }] : []),
    { id: 'activity' as TabType, label: 'Activity', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
  ];

  return (
    <div>
      <div className="mb-6">
        <Link href="/jobs" className="text-primary hover:text-primary-hover text-sm mb-3 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Jobs
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{job.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-500">Job #{job.job_number}</p>
              {job.priority && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityColor(job.priority)}`}>
                  {job.priority}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
              {job.status.replace('_', ' ')}
            </span>
            {job.status !== 'completed' && job.status !== 'cancelled' && (
              <button
                onClick={() => setShowCompletionModal(true)}
                className="px-4 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                Complete Job
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Job Completion Modal */}
      {showCompletionModal && (
        <JobCompletionModal
          job={job}
          onClose={() => setShowCompletionModal(false)}
          onComplete={() => {
            setShowCompletionModal(false);
            fetchJob();
          }}
        />
      )}

      {/* Tabs Navigation */}
      <div className="bg-white rounded-t-md border border-gray-200 border-b-0">
        <div className="flex flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-b-md border border-gray-200 border-t-0 p-5">
        {activeTab === 'details' && <DetailsTab job={job} />}
        {activeTab === 'quotes' && <QuotesTab jobId={jobId} job={job} />}
        {activeTab === 'invoices' && <InvoicesTab jobId={jobId} job={job} />}
        {activeTab === 'timesheets' && <TimesheetsTab jobId={jobId} job={job} />}
        {activeTab === 'documents' && <DocumentsTab jobId={jobId} />}
        {activeTab === 'inventory' && <InventoryTab jobId={jobId} />}
        {activeTab === 'travel' && <TravelTab jobId={jobId} job={job} />}
        {activeTab === 'contractors' && canManageContractors && <ContractorsTab jobId={jobId} />}
        {activeTab === 'activity' && <ActivityTab jobId={jobId} />}
      </div>
    </div>
  );
}

// Details Tab Component
function DetailsTab({ job }: { job: any }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {job.priority && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Priority</p>
            <p className="text-sm font-medium text-gray-900 capitalize">{job.priority}</p>
          </div>
        )}
        {job.service_area && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Service Area</p>
            <p className="text-sm font-medium text-gray-900">{job.service_area}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Client</p>
          <p className="text-sm font-medium text-gray-900">
            {(job.contacts as any)?.company_name || (job.contacts as any)?.contact_name || 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Contact</p>
          <p className="text-sm font-medium text-gray-900">{(job.contacts as any)?.phone || 'N/A'}</p>
          <p className="text-xs text-gray-500">{(job.contacts as any)?.email || ''}</p>
        </div>
        {job.site_address && (
          <div className="md:col-span-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Site Address</p>
            <p className="text-sm font-medium text-gray-900">
              {job.site_address}
              {job.site_city && `, ${job.site_city}`}
              {job.site_state && ` ${job.site_state}`}
              {job.site_postcode && ` ${job.site_postcode}`}
            </p>
          </div>
        )}
        {job.description && (
          <div className="md:col-span-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-gray-900">{job.description}</p>
          </div>
        )}
        {(job.start_date || job.end_date) && (
          <>
            {job.start_date && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Start Date</p>
                <p className="text-sm font-medium text-gray-900">{new Date(job.start_date).toLocaleDateString()}</p>
              </div>
            )}
            {job.end_date && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">End Date</p>
                <p className="text-sm font-medium text-gray-900">{new Date(job.end_date).toLocaleDateString()}</p>
              </div>
            )}
          </>
        )}
        {job.completed_at && (
          <div className="md:col-span-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Completed</p>
            <p className="text-sm font-medium text-green-600">{new Date(job.completed_at).toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Quotes Tab Component
function QuotesTab({ jobId, job }: { jobId: string; job: any }) {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('quotes')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    setQuotes(data || []);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-amber-100 text-amber-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div className="text-center py-6 text-gray-500 text-sm">Loading quotes...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Quotes</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Quote'}
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <QuoteForm jobId={jobId} onSuccess={() => { setShowForm(false); fetchQuotes(); }} />
        </div>
      )}

      {quotes.length > 0 ? (
        <div className="space-y-3">
          {quotes.map((quote) => (
            <div key={quote.id} className="border border-gray-200 rounded-md p-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Quote #{quote.quote_number}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(quote.quote_date).toLocaleDateString()}
                    {quote.valid_until && ` • Valid until ${new Date(quote.valid_until).toLocaleDateString()}`}
                  </p>
                </div>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(quote.status)}`}>
                  {quote.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-lg font-semibold text-primary">${quote.total_amount.toFixed(2)}</p>
                <Link
                  href={`/jobs/${jobId}/quotes/${quote.id}/view`}
                  className="text-sm text-primary hover:text-primary-hover font-medium"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : !showForm && (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">No quotes yet</p>
          <button onClick={() => setShowForm(true)} className="text-sm text-primary hover:text-primary-hover font-medium mt-2">
            Create your first quote
          </button>
        </div>
      )}
    </div>
  );
}

// Invoices Tab Component
function InvoicesTab({ jobId, job }: { jobId: string; job: any }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });
      setInvoices(data || []);
      setLoading(false);
    };
    fetchInvoices();
  }, [jobId]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div className="text-center py-6 text-gray-500 text-sm">Loading invoices...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
        <Link
          href={`/jobs/${jobId}/invoices`}
          className="text-sm bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          Manage Invoices
        </Link>
      </div>

      {invoices.length > 0 ? (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="border border-gray-200 rounded-md p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Invoice #{invoice.invoice_number}</h3>
                  <p className="text-xs text-gray-500">{new Date(invoice.invoice_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                  <p className="text-lg font-semibold text-gray-900 mt-1">${invoice.total_amount?.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-sm">No invoices yet</p>
          <Link href={`/jobs/${jobId}/invoices`} className="text-sm text-primary hover:text-primary-hover font-medium mt-2 inline-block">
            Create an invoice
          </Link>
        </div>
      )}
    </div>
  );
}

// Timesheets Tab Component
function TimesheetsTab({ jobId, job }: { jobId: string; job: any }) {
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [activeTimesheet, setActiveTimesheet] = useState<any>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchTimesheets = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('timesheets')
      .select('*')
      .eq('job_id', jobId)
      .order('entry_date', { ascending: false });
    
    if (data) {
      setTimesheets(data);
      const active = data.find(t => t.clock_on && !t.clock_off);
      setActiveTimesheet(active);
    }
    setLoading(false);
  }, [jobId]);

  useEffect(() => { fetchTimesheets(); }, [fetchTimesheets]);

  const handleEdit = (timesheet: any) => {
    setEditingTimesheet(timesheet);
  };

  const handleSaveEdit = async () => {
    if (!editingTimesheet) return;

    try {
      const { error } = await supabase
        .from('timesheets')
        .update({
          description: editingTimesheet.description,
          hours: editingTimesheet.hours,
        })
        .eq('id', editingTimesheet.id);

      if (error) throw error;

      setEditingTimesheet(null);
      fetchTimesheets();
    } catch (error: any) {
      alert('Failed to update timesheet: ' + error.message);
    }
  };

  const handleDelete = async (timesheetId: string) => {
    if (!confirm('Are you sure you want to delete this timesheet entry? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('timesheets')
        .delete()
        .eq('id', timesheetId);

      if (error) throw error;

      fetchTimesheets();
    } catch (error: any) {
      alert('Failed to delete timesheet: ' + error.message);
    }
  };

  const totalHours = timesheets.reduce((t, ts) => t + (parseFloat(ts.hours) || 0), 0);

  if (loading) return <div className="text-center py-6 text-gray-500 text-sm">Loading timesheets...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Timesheets</h2>
        <button
          onClick={() => setShowManualEntry(!showManualEntry)}
          className="text-sm bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          {showManualEntry ? 'Cancel' : '+ Manual Entry'}
        </button>
      </div>

      <div className="mb-5">
        <TimesheetClock 
          jobId={jobId}
          activeTimesheet={activeTimesheet}
          onUpdate={fetchTimesheets}
          showManualEntry={showManualEntry}
          onCancelManual={() => setShowManualEntry(false)}
        />
      </div>

      <div className="bg-primary text-white rounded-md p-4 mb-5">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-blue-100 uppercase tracking-wide">Total Hours</p>
            <p className="text-2xl font-semibold">{totalHours.toFixed(2)}h</p>
          </div>
          <svg className="w-8 h-8 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      {timesheets.length > 0 ? (
        <div className="border border-gray-200 rounded-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Clock On</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Clock Off</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {timesheets.slice(0, 10).map((ts) => (
                <tr key={ts.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-900">{new Date(ts.entry_date).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-gray-600">{ts.clock_on ? new Date(ts.clock_on).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '-'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{ts.clock_off ? new Date(ts.clock_off).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : ts.clock_on ? <span className="text-green-600 font-medium">Active</span> : '-'}</td>
                  <td className="px-4 py-2.5">
                    {editingTimesheet?.id === ts.id ? (
                      <input
                        type="number"
                        step="0.25"
                        value={editingTimesheet.hours}
                        onChange={(e) => setEditingTimesheet({ ...editingTimesheet, hours: e.target.value })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <span className="font-medium text-gray-900">{ts.hours ? `${parseFloat(ts.hours).toFixed(2)}h` : '-'}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {editingTimesheet?.id === ts.id ? (
                      <input
                        type="text"
                        value={editingTimesheet.description || ''}
                        onChange={(e) => setEditingTimesheet({ ...editingTimesheet, description: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Description"
                      />
                    ) : (
                      <span className="text-gray-600">{ts.description || '-'}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5"><span className={`px-2 py-0.5 text-xs font-medium rounded ${ts.is_manual ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{ts.is_manual ? 'Manual' : 'Clocked'}</span></td>
                  <td className="px-4 py-2.5">
                    {editingTimesheet?.id === ts.id ? (
                      <div className="flex gap-1">
                        <button onClick={handleSaveEdit} className="text-xs text-green-600 hover:text-green-700 font-medium">Save</button>
                        <button onClick={() => setEditingTimesheet(null)} className="text-xs text-gray-600 hover:text-gray-700 font-medium">Cancel</button>
                      </div>
                    ) : !ts.clock_on || ts.clock_off ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(ts)} className="text-xs text-primary hover:text-primary-hover font-medium">Edit</button>
                        <button onClick={() => handleDelete(ts.id)} className="text-xs text-red-600 hover:text-red-700 font-medium">Delete</button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {timesheets.length > 10 && (
            <div className="px-4 py-2 bg-gray-50 text-center">
              <Link href={`/jobs/${jobId}/timesheets`} className="text-sm text-primary hover:text-primary-hover font-medium">
                View all {timesheets.length} entries →
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">No time entries yet</p>
        </div>
      )}
    </div>
  );
}

// Documents Tab Component
function DocumentsTab({ jobId }: { jobId: string }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleDownload = async (doc: any) => {
    const { data, error } = await supabase.storage.from('job-documents').download(doc.file_path);
    if (error) { alert('Download failed'); return; }
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file_name;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleDelete = async (doc: any) => {
    if (!confirm(`Delete ${doc.file_name}?`)) return;
    await supabase.storage.from('job-documents').remove([doc.file_path]);
    await supabase.from('documents').delete().eq('id', doc.id);
    fetchDocuments();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) return <div className="text-center py-6 text-gray-500 text-sm">Loading documents...</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents</h2>
      
      <div className="mb-5">
        <DocumentUpload jobId={jobId} onSuccess={fetchDocuments} />
      </div>

      {documents.length > 0 ? (
        <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.file_name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(doc.file_size || 0)} • {new Date(doc.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleDownload(doc)} className="text-xs bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded font-medium">Download</button>
                <button onClick={() => handleDelete(doc)} className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded font-medium">Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-sm">No documents uploaded</p>
        </div>
      )}
    </div>
  );
}

// Inventory Tab Component
function InventoryTab({ jobId }: { jobId: string }) {
  const [allocations, setAllocations] = useState<any[]>([]);
  const [availableInventory, setAvailableInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [allocRes, invRes] = await Promise.all([
      supabase.from('job_inventory_allocations').select('*, inventory(*)').eq('job_id', jobId).order('allocated_at', { ascending: false }),
      supabase.from('inventory').select('*').gt('quantity', 0).order('item_name')
    ]);
    setAllocations(allocRes.data || []);
    setAvailableInventory(invRes.data || []);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (!profile?.organization_id) return;
    
    const item = availableInventory.find(i => i.id === selectedInventory);
    if (!item) return;
    const qty = parseFloat(quantity);
    if (qty > item.quantity) { alert('Cannot allocate more than available'); return; }

    await supabase.from('job_inventory_allocations').insert({ organization_id: profile.organization_id, created_by: user.id, job_id: jobId, inventory_id: selectedInventory, quantity_allocated: qty, notes: notes || null });
    await supabase.from('inventory').update({ quantity: item.quantity - qty }).eq('id', selectedInventory);
    
    setShowModal(false);
    setSelectedInventory('');
    setQuantity('');
    setNotes('');
    fetchData();
  };

  const handleReturn = async (alloc: any) => {
    if (!confirm('Return to stock?')) return;
    await supabase.from('inventory').update({ quantity: alloc.inventory.quantity + alloc.quantity_allocated }).eq('id', alloc.inventory_id);
    await supabase.from('job_inventory_allocations').delete().eq('id', alloc.id);
    fetchData();
  };

  const totalValue = allocations.reduce((s, a) => s + (a.quantity_allocated * (a.inventory?.unit_cost || 0)), 0);

  if (loading) return <div className="text-center py-6 text-gray-500 text-sm">Loading inventory...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Inventory Allocation</h2>
        <button onClick={() => setShowModal(true)} className="text-sm bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md font-medium">+ Allocate</button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-gray-50 rounded-md p-4"><p className="text-xs text-gray-500 uppercase">Items</p><p className="text-xl font-semibold text-gray-900">{allocations.length}</p></div>
        <div className="bg-gray-50 rounded-md p-4"><p className="text-xs text-gray-500 uppercase">Value</p><p className="text-xl font-semibold text-green-600">${totalValue.toFixed(2)}</p></div>
      </div>

      {allocations.length > 0 ? (
        <div className="border border-gray-200 rounded-md divide-y">
          {allocations.map((a) => (
            <div key={a.id} className="p-3 flex justify-between items-center">
              <div><p className="text-sm font-medium text-gray-900">{a.inventory?.item_name}</p><p className="text-xs text-gray-500">{a.quantity_allocated} {a.inventory?.unit} • ${(a.quantity_allocated * (a.inventory?.unit_cost || 0)).toFixed(2)}</p></div>
              <button onClick={() => handleReturn(a)} className="text-xs text-primary hover:text-primary-hover font-medium">Return</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500"><svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg><p className="text-sm">No inventory allocated</p></div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-md shadow-xl max-w-md w-full p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Allocate Inventory</h3>
            <form onSubmit={handleAllocate} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Item</label><select required value={selectedInventory} onChange={(e) => { setSelectedInventory(e.target.value); setQuantity(''); }} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary"><option value="">Select...</option>{availableInventory.map((i) => <option key={i.id} value={i.id}>{i.item_name} ({i.quantity} available)</option>)}</select></div>
              {selectedInventory && <div><label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label><input type="number" step="0.01" min="0.01" max={availableInventory.find(i => i.id === selectedInventory)?.quantity || 0} required value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary" /></div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary" /></div>
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button><button type="submit" className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-medium">Allocate</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Travel Tab Component
function TravelTab({ jobId, job }: { jobId: string; job: any }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ origin_address: '', destination_address: '', distance_km: '', duration_minutes: '', notes: '' });
  const supabase = createClient();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('travel_logs').select('*').eq('job_id', jobId).order('travel_date', { ascending: false });
    setLogs(data || []);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { 
    fetchLogs();
    if (job?.site_address) {
      const addr = `${job.site_address}${job.site_city ? ', ' + job.site_city : ''}${job.site_state ? ' ' + job.site_state : ''}`;
      setFormData(f => ({ ...f, destination_address: addr }));
    }
  }, [fetchLogs, job]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (!profile?.organization_id) return;

    await supabase.from('travel_logs').insert({
      organization_id: profile.organization_id,
      created_by: user.id,
      job_id: jobId,
      origin_address: formData.origin_address,
      destination_address: formData.destination_address,
      distance_km: formData.distance_km ? parseFloat(formData.distance_km) : null,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
      is_manual: true,
      notes: formData.notes || null,
    });
    setShowModal(false);
    setFormData({ origin_address: '', destination_address: job?.site_address || '', distance_km: '', duration_minutes: '', notes: '' });
    fetchLogs();
  };

  const totalDist = logs.reduce((s, l) => s + (l.distance_km || 0), 0);
  const totalDur = logs.reduce((s, l) => s + (l.duration_minutes || 0), 0);

  if (loading) return <div className="text-center py-6 text-gray-500 text-sm">Loading travel logs...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Travel</h2>
        <button onClick={() => setShowModal(true)} className="text-sm bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md font-medium">+ Log Travel</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-gray-50 rounded-md p-4"><p className="text-xs text-gray-500 uppercase">Trips</p><p className="text-xl font-semibold text-gray-900">{logs.length}</p></div>
        <div className="bg-gray-50 rounded-md p-4"><p className="text-xs text-gray-500 uppercase">Distance</p><p className="text-xl font-semibold text-blue-600">{totalDist.toFixed(1)} km</p></div>
        <div className="bg-gray-50 rounded-md p-4"><p className="text-xs text-gray-500 uppercase">Time</p><p className="text-xl font-semibold text-green-600">{Math.floor(totalDur/60)}h {totalDur%60}m</p></div>
      </div>

      {logs.length > 0 ? (
        <div className="space-y-3">
          {logs.map((l) => (
            <div key={l.id} className="border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-500 mb-1">{new Date(l.travel_date).toLocaleDateString()}</p>
              <p className="text-sm text-gray-900"><span className="text-gray-500">From:</span> {l.origin_address}</p>
              <p className="text-sm text-gray-900"><span className="text-gray-500">To:</span> {l.destination_address}</p>
              <div className="flex gap-4 mt-2 text-xs">
                {l.distance_km && <span className="text-blue-600 font-medium">{l.distance_km.toFixed(1)} km</span>}
                {l.duration_minutes && <span className="text-green-600 font-medium">{l.duration_minutes} min</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500"><svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg><p className="text-sm">No travel logged</p></div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-md shadow-xl max-w-lg w-full p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Log Travel</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <AddressAutocomplete label="From" value={formData.origin_address} onChange={(v) => setFormData({...formData, origin_address: v})} placeholder="Starting address" required />
              <AddressAutocomplete label="To" value={formData.destination_address} onChange={(v) => setFormData({...formData, destination_address: v})} placeholder="Destination" required />
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Distance (km)</label><input type="number" step="0.1" min="0" value={formData.distance_km} onChange={(e) => setFormData({...formData, distance_km: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label><input type="number" min="0" value={formData.duration_minutes} onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button><button type="submit" className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-medium">Save</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Contractors Tab Component
function ContractorsTab({ jobId }: { jobId: string }) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchAssignments = async () => {
      const { data } = await supabase
        .from('contractor_job_assignments')
        .select('*, contractors(*)')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });
      setAssignments(data || []);
      setLoading(false);
    };
    fetchAssignments();
  }, [jobId]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = { pending: 'bg-amber-100 text-amber-800', in_progress: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800', cancelled: 'bg-gray-100 text-gray-800' };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div className="text-center py-6 text-gray-500 text-sm">Loading contractors...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Contractors</h2>
        <Link href={`/jobs/${jobId}/assign-contractor`} className="text-sm bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md font-medium">Assign Contractor</Link>
      </div>

      {assignments.length > 0 ? (
        <div className="space-y-3">
          {assignments.map((a) => (
            <div key={a.id} className="border border-gray-200 rounded-md p-4">
              <div className="flex justify-between items-start">
                <div><h3 className="text-sm font-semibold text-gray-900">{a.contractors.contractor_name}</h3>{a.contractors.company_name && <p className="text-xs text-gray-500">{a.contractors.company_name}</p>}<p className="text-xs text-gray-500 mt-1">Assigned {new Date(a.created_at).toLocaleDateString()}</p></div>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(a.status)}`}>{a.status.replace('_', ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500"><svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg><p className="text-sm">No contractors assigned</p></div>
      )}
    </div>
  );
}

// Activity Tab Component  
function ActivityTab({ jobId }: { jobId: string }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchActivities = async () => {
      const { data } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(20);
      setActivities(data || []);
      setLoading(false);
    };
    fetchActivities();
  }, [jobId]);

  if (loading) return <div className="text-center py-6 text-gray-500 text-sm">Loading activity...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Activity</h2>
        <Link href={`/jobs/${jobId}/activity`} className="text-sm text-primary hover:text-primary-hover font-medium">View Full Activity →</Link>
      </div>

      {activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map((a) => (
            <div key={a.id} className="flex gap-3 p-3 bg-gray-50 rounded-md">
              <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div><p className="text-sm text-gray-900">{a.description}</p><p className="text-xs text-gray-500 mt-0.5">{new Date(a.created_at).toLocaleString()}</p></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500"><svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg><p className="text-sm">No activity yet</p></div>
      )}
    </div>
  );
}

// Job Completion Modal Component
function JobCompletionModal({ job, onClose, onComplete }: { job: any; onClose: () => void; onComplete: () => void }) {
  const [completionType, setCompletionType] = useState<'simple' | 'invoice_pending' | 'new_job'>('simple');
  const [newJobTitle, setNewJobTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();
  const router = useRouter();

  const handleComplete = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updates: any = {
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user.id,
      };

      if (completionType === 'simple') {
        updates.completion_status = 'completed';
      } else if (completionType === 'invoice_pending') {
        updates.completion_status = 'completed_invoice_pending';
      } else if (completionType === 'new_job') {
        updates.completion_status = 'completed_new_job_created';
      }

      // Update the job
      const { error: updateError } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', job.id);

      if (updateError) throw updateError;

      // If creating a new related job
      if (completionType === 'new_job' && newJobTitle) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profile?.organization_id) {
          // Generate next job number
          const { data: lastJob } = await supabase
            .from('jobs')
            .select('job_number')
            .eq('organization_id', profile.organization_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          let nextJobNumber = 'JOB-001';
          if (lastJob?.job_number) {
            const match = lastJob.job_number.match(/(\d+)$/);
            if (match) {
              const num = parseInt(match[1]) + 1;
              nextJobNumber = `JOB-${String(num).padStart(3, '0')}`;
            }
          }

          const newJobData = {
            organization_id: profile.organization_id,
            created_by: user.id,
            job_number: nextJobNumber,
            title: newJobTitle,
            client_id: job.client_id,
            site_address: job.site_address,
            site_city: job.site_city,
            site_state: job.site_state,
            site_postcode: job.site_postcode,
            service_area: job.service_area,
            priority: job.priority,
            parent_job_id: job.id,
            completion_status: 'active',
          };

          const { data: newJob, error: newJobError } = await supabase
            .from('jobs')
            .insert([newJobData])
            .select()
            .single();

          if (newJobError) throw newJobError;

          // Navigate to the new job
          router.push(`/jobs/${newJob.id}`);
          return;
        }
      }

      onComplete();
    } catch (error: any) {
      setError(error.message || 'Failed to complete job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Complete Job</h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-3">How would you like to complete this job?</p>
            
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary transition-colors">
                <input
                  type="radio"
                  name="completion"
                  value="simple"
                  checked={completionType === 'simple'}
                  onChange={(e) => setCompletionType(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900">Complete Job</p>
                  <p className="text-xs text-gray-500">Mark this job as completed</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary transition-colors">
                <input
                  type="radio"
                  name="completion"
                  value="invoice_pending"
                  checked={completionType === 'invoice_pending'}
                  onChange={(e) => setCompletionType(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900">Complete with Invoice Outstanding</p>
                  <p className="text-xs text-gray-500">Job is done but awaiting final payment</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary transition-colors">
                <input
                  type="radio"
                  name="completion"
                  value="new_job"
                  checked={completionType === 'new_job'}
                  onChange={(e) => setCompletionType(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900">Complete and Create Related Job</p>
                  <p className="text-xs text-gray-500">Job is done and requires a follow-up job</p>
                </div>
              </label>
            </div>
          </div>

          {completionType === 'new_job' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                placeholder="Follow-up service or related work"
              />
              <p className="text-xs text-gray-500 mt-1">
                The new job will inherit client and site details from this job.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleComplete}
            disabled={loading || (completionType === 'new_job' && !newJobTitle)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Completing...' : completionType === 'new_job' ? 'Complete & Create Job' : 'Complete Job'}
          </button>
        </div>
      </div>
    </div>
  );
}
