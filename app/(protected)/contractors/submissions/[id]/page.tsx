'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import Link from 'next/link';

export default function SubmissionDetailPage() {
  const params = useParams();
  const submissionId = params.id as string;
  const router = useRouter();
  const supabase = useSafeSupabaseClient();

  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (supabase) {
      fetchSubmission();
    }
  }, [submissionId, supabase]);

  const fetchSubmission = async () => {
    if (!supabase) return;
    setLoading(true);

    const { data } = await supabase
      .from('contractor_submissions')
      .select(`
        *,
        contractor_job_assignments!inner (
          *,
          jobs (
            *,
            organizations (*)
          ),
          contractors (*)
        )
      `)
      .eq('id', submissionId)
      .single();

    if (data) {
      setSubmission(data);
      setReviewNotes(data.review_notes || '');
    }
    setLoading(false);
  };

  const handleReview = async (newStatus: 'accepted' | 'needs_changes' | 'rejected') => {
    setProcessing(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('Organization not found');

      // Update submission status
      const { error: updateError } = await supabase
        .from('contractor_submissions')
        .update({
          status: newStatus,
          review_notes: reviewNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      if (updateError) throw updateError;

      // If accepted and type is invoice, optionally create invoice record
      if (newStatus === 'accepted' && submission.submission_type === 'invoice' && submission.invoice_amount) {
        const assignment = submission.contractor_job_assignments;
        const job = assignment.jobs;

        // Create invoice from contractor submission
        const invoiceNumber = `INV-${Date.now()}`;
        const subtotal = submission.invoice_amount / 1.1; // Remove GST
        const gstAmount = submission.invoice_amount - subtotal;

        await supabase.from('invoices').insert({
          organization_id: profile.organization_id,
          created_by: user.id,
          job_id: job.id,
          invoice_number: invoiceNumber,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: null,
          status: 'draft',
          subtotal: subtotal,
          gst_amount: gstAmount,
          total_amount: submission.invoice_amount,
          amount_paid: 0,
          notes: `Contractor submission from ${assignment.contractors.contractor_name}`,
        });
      }

      // Update assignment status if completion was accepted
      if (newStatus === 'accepted' && submission.submission_type === 'completion') {
        await supabase
          .from('contractor_job_assignments')
          .update({ status: 'completed' })
          .eq('id', submission.assignment_id);
      }

      // Create activity feed entry
      const assignment = submission.contractor_job_assignments;
      await supabase.from('activity_feed').insert({
        organization_id: profile.organization_id,
        job_id: assignment.job_id,
        activity_type: 'contractor_submission',
        actor_type: 'user',
        actor_id: user.id,
        description: `Contractor submission ${newStatus} - ${submission.submission_type}`,
        metadata: {
          submission_id: submissionId,
          contractor_id: assignment.contractor_id,
          contractor_name: assignment.contractors.contractor_name,
          new_status: newStatus,
          submission_type: submission.submission_type,
        },
      });

      alert(`Submission ${newStatus.replace('_', ' ')} successfully!`);
      router.push('/contractors/submissions');
    } catch (err: any) {
      console.error('Review error:', err);
      setError(err.message || 'Failed to review submission');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading submission...</div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Submission Not Found</h1>
        <Link
          href="/contractors/submissions"
          className="text-primary hover:text-primary-hover"
        >
          ← Back to Submissions
        </Link>
      </div>
    );
  }

  const assignment = submission.contractor_job_assignments;
  const job = assignment.jobs;
  const contractor = assignment.contractors;

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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/contractors/submissions"
          className="text-primary hover:text-primary-hover mb-4 inline-block"
        >
          ← Back to Submissions
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Review Contractor Submission</h1>
        <p className="text-gray-600 mt-2">
          {submission.submission_type.charAt(0).toUpperCase() + submission.submission_type.slice(1)} Submission
        </p>
      </div>

      <div className="space-y-6">
        {/* Status Badge */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{getTypeIcon(submission.submission_type)}</span>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {submission.submission_type.charAt(0).toUpperCase() + submission.submission_type.slice(1)} Submission
                </h2>
                <p className="text-sm text-gray-600">
                  Submitted {new Date(submission.submitted_at).toLocaleString()}
                </p>
              </div>
            </div>
            <span className={`px-4 py-2 text-sm font-medium rounded-full ${getStatusColor(submission.status)}`}>
              {submission.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Job Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Job Number</p>
              <p className="font-medium">{job.job_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Job Title</p>
              <p className="font-medium">{job.title}</p>
            </div>
            {job.site_address && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Site Address</p>
                <p className="font-medium">{job.site_address}</p>
              </div>
            )}
            <div className="md:col-span-2">
              <Link
                href={`/jobs/${job.id}`}
                className="text-primary hover:text-primary-hover text-sm font-medium"
              >
                View Full Job Details →
              </Link>
            </div>
          </div>
        </div>

        {/* Contractor Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contractor Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Contractor Name</p>
              <p className="font-medium">{contractor.contractor_name}</p>
            </div>
            {contractor.company_name && (
              <div>
                <p className="text-sm text-gray-600">Company</p>
                <p className="font-medium">{contractor.company_name}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{contractor.email}</p>
            </div>
            {contractor.phone && (
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{contractor.phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Submission Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Submission Details</h3>
          
          {submission.notes && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Notes from Contractor:</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-900 whitespace-pre-wrap">{submission.notes}</p>
              </div>
            </div>
          )}

          {submission.invoice_amount && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Invoice Amount:</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-2xl font-bold text-green-700">
                  ${submission.invoice_amount.toFixed(2)} AUD
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Includes GST (10%)
                </p>
              </div>
            </div>
          )}

          {submission.photos && submission.photos.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Photos:</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  {submission.photos.length} photo(s) attached
                </p>
                {/* In a real implementation, display the photos here */}
              </div>
            </div>
          )}

          {submission.invoice_file_url && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Invoice File:</p>
              <a
                href={submission.invoice_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover font-medium"
              >
                Download Invoice →
              </a>
            </div>
          )}
        </div>

        {/* Review History */}
        {submission.reviewed_at && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review History</h3>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="text-gray-600">Reviewed:</span>{' '}
                <span className="font-medium">{new Date(submission.reviewed_at).toLocaleString()}</span>
              </p>
              {submission.review_notes && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Review Notes:</p>
                  <p className="text-sm text-gray-900 bg-white rounded p-2">
                    {submission.review_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Review Form */}
        {submission.status === 'pending_review' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review This Submission</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Notes (optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                placeholder="Add notes about this submission..."
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleReview('accepted')}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                ✅ Accept
              </button>
              <button
                onClick={() => handleReview('needs_changes')}
                disabled={processing}
                className="bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                📝 Request Changes
              </button>
              <button
                onClick={() => handleReview('rejected')}
                disabled={processing}
                className="bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                ❌ Reject
              </button>
            </div>

            {submission.submission_type === 'invoice' && submission.invoice_amount && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Note:</strong> Accepting this invoice submission will automatically create a draft invoice record in your system.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
