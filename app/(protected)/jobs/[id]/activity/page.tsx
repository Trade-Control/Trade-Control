'use client';

import { useState, useEffect } from 'react';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function JobActivityPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [job, setJob] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'create' | 'update' | 'delete'>('all');
  const supabase = useSafeSupabaseClient();

  useEffect(() => {
    if (supabase) {
      fetchData();
    }
  }, [jobId, filter, supabase]);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);

    // Fetch job details
    const { data: jobData } = await supabase
      .from('jobs')
      .select('id, job_number, title')
      .eq('id', jobId)
      .single();

    setJob(jobData);

    // Fetch audit logs for this job
    let query = supabase
      .from('audit_logs')
      .select('*, profiles(first_name, last_name)')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('action', filter);
    }

    const { data: logsData } = await query;

    setAuditLogs(logsData || []);
    setLoading(false);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return (
          <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        );
      case 'update':
        return (
          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        );
      case 'delete':
        return (
          <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        );
      case 'view':
        return (
          <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'text-green-700 bg-green-50';
      case 'update':
        return 'text-blue-700 bg-blue-50';
      case 'delete':
        return 'text-red-700 bg-red-50';
      default:
        return 'text-gray-700 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link href={`/jobs/${jobId}`} className="text-primary hover:text-primary-hover text-sm mb-3 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Job
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Job Activity Log</h1>
        {job && (
          <p className="text-gray-600 mt-2">
            Complete audit trail for {job.title} (#{job.job_number})
          </p>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow mb-6 p-2 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filter === 'all' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          All Activity
        </button>
        <button
          onClick={() => setFilter('create')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filter === 'create' ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Created
        </button>
        <button
          onClick={() => setFilter('update')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filter === 'update' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Updates
        </button>
        <button
          onClick={() => setFilter('delete')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filter === 'delete' ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Deletions
        </button>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-lg shadow">
        {auditLogs.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-5 hover:bg-gray-50 transition-colors">
                <div className="flex gap-4">
                  {getActionIcon(log.action)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded ${getActionColor(log.action)}`}>
                        {log.action.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {log.resource_type.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {log.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>
                          {log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : 'System'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-2">Details:</p>
                        <div className="space-y-1">
                          {Object.entries(log.metadata).map(([key, value]) => (
                            <div key={key} className="flex gap-2 text-xs">
                              <span className="text-gray-500 capitalize">{key.replace('_', ' ')}:</span>
                              <span className="text-gray-900 font-medium">{JSON.stringify(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No activity logs found</p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="mt-2 text-sm text-primary hover:text-primary-hover font-medium"
              >
                View all activity
              </button>
            )}
          </div>
        )}
      </div>

      {auditLogs.length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Showing {auditLogs.length} activity {auditLogs.length === 1 ? 'log' : 'logs'}
        </div>
      )}
    </div>
  );
}
