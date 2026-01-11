'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { ContractorSubmission } from '@/lib/types/database.types';
import Link from 'next/link';

export default function ContractorSubmissionsPage() {
  const supabase = useSafeSupabaseClient();
  const router = useRouter();

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending_review' | 'accepted' | 'needs_changes'>('all');

  useEffect(() => {
    if (supabase) {
      fetchSubmissions();
    }
  }, [supabase]);

  const fetchSubmissions = async () => {
    if (!supabase) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) return;

    // Fetch submissions with related data
    const { data } = await supabase
      .from('contractor_submissions')
      .select(`
        *,
        contractor_job_assignments!inner (
          *,
          jobs (
            id,
            job_number,
            title,
            site_address
          ),
          contractors (
            id,
            contractor_name,
            company_name,
            email
          )
        )
      `)
      .eq('contractor_job_assignments.organization_id', profile.organization_id)
      .order('submitted_at', { ascending: false });

    setSubmissions(data || []);
    setLoading(false);
  };

  const filteredSubmissions = submissions.filter((sub) => {
    if (filter === 'all') return true;
    return sub.status === filter;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending_review: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      needs_changes: 'bg-orange-100 text-orange-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      progress: '📝',
      completion: '✅',
      invoice: '🧾',
    };
    return icons[type] || '📄';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading submissions...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Contractor Submissions</h1>
        <p className="text-gray-600 mt-2">Review and manage work submissions from contractors</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({submissions.length})
          </button>
          <button
            onClick={() => setFilter('pending_review')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending_review'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending Review ({submissions.filter(s => s.status === 'pending_review').length})
          </button>
          <button
            onClick={() => setFilter('accepted')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'accepted'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Accepted ({submissions.filter(s => s.status === 'accepted').length})
          </button>
          <button
            onClick={() => setFilter('needs_changes')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'needs_changes'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Needs Changes ({submissions.filter(s => s.status === 'needs_changes').length})
          </button>
        </div>
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Submissions</h2>
          <p className="text-gray-600">
            {filter === 'all'
              ? 'No contractor submissions yet.'
              : `No submissions with status "${filter.replace('_', ' ')}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSubmissions.map((submission) => {
            const assignment = submission.contractor_job_assignments;
            const job = assignment.jobs;
            const contractor = assignment.contractors;

            return (
              <div
                key={submission.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{getTypeIcon(submission.submission_type)}</span>
                      <h3 className="font-semibold text-gray-900">
                        {submission.submission_type.charAt(0).toUpperCase() + submission.submission_type.slice(1)} Submission
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Job #{job.job_number} - {job.title}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(submission.status)}`}>
                    {submission.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Contractor:</p>
                    <p className="text-sm text-gray-900">{contractor.contractor_name}</p>
                    {contractor.company_name && (
                      <p className="text-xs text-gray-600">{contractor.company_name}</p>
                    )}
                  </div>

                  {submission.notes && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Notes:</p>
                      <p className="text-sm text-gray-900">{submission.notes}</p>
                    </div>
                  )}

                  {submission.invoice_amount && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Invoice Amount:</p>
                      <p className="text-sm text-gray-900 font-semibold">
                        ${submission.invoice_amount.toFixed(2)} AUD
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-gray-700">Submitted:</p>
                    <p className="text-sm text-gray-900">
                      {new Date(submission.submitted_at).toLocaleString()}
                    </p>
                  </div>

                  {submission.reviewed_at && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Reviewed:</p>
                      <p className="text-sm text-gray-900">
                        {new Date(submission.reviewed_at).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {submission.review_notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <p className="text-sm font-medium text-gray-700">Review Notes:</p>
                      <p className="text-sm text-gray-900">{submission.review_notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/contractors/submissions/${submission.id}`}
                    className="flex-1 bg-primary hover:bg-primary-hover text-white text-center px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Review Details
                  </Link>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-center px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    View Job
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
