'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ContractorJobAssignment } from '@/lib/types/database.types';

export default function ContractorAccessPage() {
  const params = useParams();
  const token = params.token as string;
  const supabase = createClient();
  const router = useRouter();

  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    setLoading(true);

    // Public access - no auth required
    const { data, error: fetchError } = await supabase
      .from('contractor_job_assignments')
      .select(`
        *,
        jobs (*),
        contractors (*),
        organizations:organization_id (*)
      `)
      .eq('access_token', token)
      .single();

    if (fetchError || !data) {
      setError('Invalid or expired access link');
      setLoading(false);
      return;
    }

    // Check token expiry
    if (new Date(data.token_expires_at) < new Date()) {
      setError('This access link has expired');
      setLoading(false);
      return;
    }

    setAssignment(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Validating access...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const job = assignment.jobs;
  const contractor = assignment.contractors;
  const org = assignment.organizations;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
              <p className="text-gray-600 mt-1">Job #{job.job_number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">From</p>
              <p className="font-semibold text-gray-900">{org.name}</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Hi {contractor.contractor_name}!</strong> You've been assigned to this job.
              View the details below and submit your progress using the form.
            </p>
          </div>
        </div>

        {/* Job Details */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Job Details</h2>
          
          {job.description && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-gray-900">{job.description}</p>
            </div>
          )}

          {job.site_address && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">Site Address</h3>
              <p className="text-gray-900">
                {job.site_address}
                {job.site_city && `, ${job.site_city}`}
                {job.site_state && ` ${job.site_state}`}
                {job.site_postcode && ` ${job.site_postcode}`}
              </p>
            </div>
          )}

          {(job.start_date || job.end_date) && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {job.start_date && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Start Date</h3>
                  <p className="text-gray-900">{new Date(job.start_date).toLocaleDateString()}</p>
                </div>
              )}
              {job.end_date && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">End Date</h3>
                  <p className="text-gray-900">{new Date(job.end_date).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          )}

          {job.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-2">Notes</h3>
              <p className="text-gray-900 whitespace-pre-line">{job.notes}</p>
            </div>
          )}
        </div>

        {/* Submit Progress Button */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Submit?</h2>
          <p className="text-gray-600 mb-6">
            Upload photos, add notes, or submit your invoice for this job.
          </p>
          <button
            onClick={() => router.push(`/contractor-access/${token}/submit`)}
            className="bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
          >
            Submit Progress or Completion
          </button>
        </div>

        {/* Access Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>This access link expires on {new Date(assignment.token_expires_at).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
