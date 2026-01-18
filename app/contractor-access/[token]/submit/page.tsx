'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';

export default function ContractorSubmitPage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const supabase = useSafeSupabaseClient();

  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    submissionType: 'progress' as 'progress' | 'completion' | 'invoice',
    notes: '',
    invoiceAmount: '',
  });

  useEffect(() => {
    if (supabase) {
      validateToken();
    }
  }, [token, supabase]);

  const validateToken = async () => {
    if (!supabase) return;
    const { data, error: fetchError } = await supabase
      .from('contractor_job_assignments')
      .select('*, jobs (*), contractors (*)')
      .eq('access_token', token)
      .single();

    if (fetchError || !data) {
      setError('Invalid or expired access link');
      setLoading(false);
      return;
    }

    if (new Date(data.token_expires_at) < new Date()) {
      setError('This access link has expired');
      setLoading(false);
      return;
    }

    setAssignment(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const submissionData = {
        assignment_id: assignment.id,
        submission_type: formData.submissionType,
        notes: formData.notes || null,
        photos: [], // Would handle file uploads here
        invoice_amount: formData.invoiceAmount ? parseFloat(formData.invoiceAmount) : null,
        invoice_file_url: null,
        status: 'pending_review',
      };

      const { error: insertError } = await supabase
        .from('contractor_submissions')
        .insert(submissionData);

      if (insertError) throw insertError;

      // Update assignment status if completion
      if (formData.submissionType === 'completion') {
        await supabase
          .from('contractor_job_assignments')
          .update({ status: 'completed' })
          .eq('id', assignment.id);
      } else if (formData.submissionType === 'progress') {
        await supabase
          .from('contractor_job_assignments')
          .update({ status: 'in_progress' })
          .eq('id', assignment.id);
      }

      alert('Submission sent successfully! The team will review it shortly.');
      router.push(`/contractor-access/${token}`);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center max-w-md">
          <div className="flex justify-center mb-4">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit Your Work</h1>
          <p className="text-gray-600 mb-8">For: {assignment.jobs.title}</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Submission Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Submission Type *
              </label>
              <div className="space-y-3">
                <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:border-primary">
                  <input
                    type="radio"
                    name="submissionType"
                    value="progress"
                    checked={formData.submissionType === 'progress'}
                    onChange={(e) => setFormData({ ...formData, submissionType: e.target.value as any })}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">Progress Update</div>
                    <div className="text-sm text-gray-600">Share your current progress on the job</div>
                  </div>
                </label>

                <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:border-primary">
                  <input
                    type="radio"
                    name="submissionType"
                    value="completion"
                    checked={formData.submissionType === 'completion'}
                    onChange={(e) => setFormData({ ...formData, submissionType: e.target.value as any })}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">Job Completion</div>
                    <div className="text-sm text-gray-600">Mark the job as completed with final photos and notes</div>
                  </div>
                </label>

                <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:border-primary">
                  <input
                    type="radio"
                    name="submissionType"
                    value="invoice"
                    checked={formData.submissionType === 'invoice'}
                    onChange={(e) => setFormData({ ...formData, submissionType: e.target.value as any })}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">Invoice Submission</div>
                    <div className="text-sm text-gray-600">Submit your invoice for payment</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes *
              </label>
              <textarea
                required
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Describe what you've done, any issues encountered, or additional information..."
              />
            </div>

            {/* Invoice Amount (if invoice submission) */}
            {formData.submissionType === 'invoice' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Amount (AUD) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required={formData.submissionType === 'invoice'}
                    value={formData.invoiceAmount}
                    onChange={(e) => setFormData({ ...formData, invoiceAmount: e.target.value })}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            {/* Photo Upload Placeholder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-600 mb-2">Photo upload coming soon</p>
                <p className="text-sm text-gray-500">You can add photos after submitting</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-primary hover:bg-primary-hover text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>

        {/* Access Info */}
        <div className="text-center text-sm text-gray-500">
          <p>Secure access provided by Trade Control</p>
          <p className="mt-1">This link expires on {new Date(assignment.token_expires_at).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
