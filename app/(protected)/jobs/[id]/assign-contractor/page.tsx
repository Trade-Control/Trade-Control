'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Contractor } from '@/lib/types/database.types';
import { sendEmail, generateJobAssignmentEmail } from '@/lib/services/resend-mock';
import { nanoid } from 'nanoid';

export default function AssignContractorPage() {
  const params = useParams();
  const jobId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [job, setJob] = useState<any>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selectedContractorId, setSelectedContractorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [complianceWarning, setComplianceWarning] = useState('');

  useEffect(() => {
    fetchData();
  }, [jobId]);

  useEffect(() => {
    if (selectedContractorId) {
      checkCompliance(selectedContractorId);
    } else {
      setComplianceWarning('');
    }
  }, [selectedContractorId]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch job details
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*, organizations(*)')
      .eq('id', jobId)
      .single();
    
    setJob(jobData);

    // Fetch contractors for this organization
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) return;

    const { data: contractorsData } = await supabase
      .from('contractors')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('contractor_name');

    setContractors(contractorsData || []);
    setLoading(false);
  };

  const checkCompliance = (contractorId: string) => {
    const contractor = contractors.find(c => c.id === contractorId);
    if (!contractor) return;

    const warnings: string[] = [];
    const today = new Date();

    if (contractor.status === 'blocked') {
      warnings.push('This contractor is BLOCKED and cannot be assigned.');
    }

    if (contractor.status === 'flagged') {
      warnings.push('This contractor is flagged for compliance issues.');
    }

    if (contractor.insurance_expiry) {
      const expiryDate = new Date(contractor.insurance_expiry);
      if (expiryDate < today) {
        warnings.push('Insurance has EXPIRED.');
      }
    }

    if (contractor.license_expiry) {
      const expiryDate = new Date(contractor.license_expiry);
      if (expiryDate < today) {
        warnings.push('License has EXPIRED.');
      }
    }

    setComplianceWarning(warnings.join(' '));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
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

      // Get contractor details
      const contractor = contractors.find(c => c.id === selectedContractorId);
      if (!contractor) throw new Error('Contractor not found');

      // Compliance Shield: Check if contractor is blocked or has expired credentials
      if (contractor.status === 'blocked') {
        throw new Error('This contractor is blocked and cannot be assigned to jobs. Please update their status first.');
      }

      const today = new Date();
      if (contractor.insurance_expiry && new Date(contractor.insurance_expiry) < today) {
        throw new Error('This contractor\'s insurance has expired. Please update their insurance before assigning jobs.');
      }

      if (contractor.license_expiry && new Date(contractor.license_expiry) < today) {
        throw new Error('This contractor\'s license has expired. Please update their license before assigning jobs.');
      }

      // Generate secure access token
      const accessToken = nanoid(32);
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30); // 30-day expiry

      // Create contractor job assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from('contractor_job_assignments')
        .insert({
          organization_id: profile.organization_id,
          job_id: jobId,
          contractor_id: selectedContractorId,
          assigned_by: user.id,
          access_token: accessToken,
          token_expires_at: tokenExpiresAt.toISOString(),
          status: 'pending',
        })
        .select()
        .single();

      if (assignmentError) throw assignmentError;

      // Generate and send email
      const emailTemplate = generateJobAssignmentEmail({
        contractorName: contractor.contractor_name,
        jobTitle: job.title,
        jobDescription: job.description || '',
        siteAddress: job.site_address || 'Address not specified',
        accessToken: accessToken,
        expiresAt: tokenExpiresAt.toISOString(),
        companyName: job.organizations?.name || 'Trade Control',
      });

      const emailResult = await sendEmail({
        to: contractor.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });

      // Log email to database
      await supabase.from('email_communications').insert({
        organization_id: profile.organization_id,
        job_id: jobId,
        contractor_id: selectedContractorId,
        email_type: 'job_assignment',
        recipient_email: contractor.email,
        subject: emailTemplate.subject,
        body: emailTemplate.html,
        resend_message_id: emailResult.id,
        status: 'sent',
      });

      // Create activity feed entry
      await supabase.from('activity_feed').insert({
        organization_id: profile.organization_id,
        job_id: jobId,
        activity_type: 'contractor_assigned',
        actor_type: 'user',
        actor_id: user.id,
        description: `Contractor ${contractor.contractor_name} assigned to job`,
        metadata: { 
          contractor_id: selectedContractorId, 
          assignment_id: assignment.id,
          contractor_name: contractor.contractor_name,
          access_token: accessToken,
        },
      });

      alert(`Contractor assigned successfully! An email has been sent to ${contractor.email} with access details.`);
      router.push(`/jobs/${jobId}`);
    } catch (err: any) {
      console.error('Assignment error:', err);
      setError(err.message || 'Failed to assign contractor');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Job Not Found</h1>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Assign Contractor</h1>
        <p className="text-gray-600 mt-2">Job: {job.title}</p>
      </div>

      {contractors.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Contractors Available</h2>
          <p className="text-gray-600 mb-4">
            You need to add contractors to your organization before you can assign them to jobs.
          </p>
          <button
            onClick={() => router.push('/contractors')}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Go to Contractors
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          {/* Job Details Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Job Details</h3>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Title:</span> {job.title}</p>
              <p><span className="font-medium">Job Number:</span> {job.job_number}</p>
              {job.site_address && (
                <p><span className="font-medium">Site:</span> {job.site_address}</p>
              )}
              {job.description && (
                <p><span className="font-medium">Description:</span> {job.description}</p>
              )}
            </div>
          </div>

          {/* Contractor Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Contractor *
            </label>
            <select
              value={selectedContractorId}
              onChange={(e) => setSelectedContractorId(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">-- Choose a contractor --</option>
              {contractors.map((contractor) => (
                <option key={contractor.id} value={contractor.id}>
                  {contractor.contractor_name}
                  {contractor.company_name ? ` (${contractor.company_name})` : ''}
                  {contractor.status === 'flagged' ? ' ⚠️' : ''}
                  {contractor.status === 'blocked' ? ' 🚫' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Compliance Warning */}
          {complianceWarning && (
            <div className={`rounded-lg p-4 ${
              complianceWarning.includes('BLOCKED') || complianceWarning.includes('EXPIRED')
                ? 'bg-red-50 border border-red-300'
                : 'bg-yellow-50 border border-yellow-300'
            }`}>
              <div className="flex items-start gap-2">
                <span className="text-2xl">
                  {complianceWarning.includes('BLOCKED') || complianceWarning.includes('EXPIRED') ? '🚫' : '⚠️'}
                </span>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Compliance Shield Alert</h4>
                  <p className="text-sm text-gray-700">{complianceWarning}</p>
                  {(complianceWarning.includes('BLOCKED') || complianceWarning.includes('EXPIRED')) && (
                    <p className="text-sm text-gray-700 mt-2">
                      This contractor cannot be assigned. Please update their compliance status first.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Selected Contractor Details */}
          {selectedContractorId && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              {(() => {
                const contractor = contractors.find(c => c.id === selectedContractorId);
                if (!contractor) return null;
                
                return (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Contractor Information</h3>
                    <div className="text-sm space-y-2">
                      <p><span className="font-medium">Name:</span> {contractor.contractor_name}</p>
                      {contractor.company_name && (
                        <p><span className="font-medium">Company:</span> {contractor.company_name}</p>
                      )}
                      <p><span className="font-medium">Email:</span> {contractor.email}</p>
                      {contractor.phone && (
                        <p><span className="font-medium">Phone:</span> {contractor.phone}</p>
                      )}
                      {contractor.insurance_expiry && (
                        <p>
                          <span className="font-medium">Insurance Expiry:</span>{' '}
                          {new Date(contractor.insurance_expiry).toLocaleDateString()}
                          {new Date(contractor.insurance_expiry) < new Date() && (
                            <span className="text-red-600 font-semibold ml-2">EXPIRED</span>
                          )}
                        </p>
                      )}
                      {contractor.license_expiry && (
                        <p>
                          <span className="font-medium">License Expiry:</span>{' '}
                          {new Date(contractor.license_expiry).toLocaleDateString()}
                          {new Date(contractor.license_expiry) < new Date() && (
                            <span className="text-red-600 font-semibold ml-2">EXPIRED</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">📧 What Happens Next?</h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>An email will be sent to the contractor with a secure access link</li>
              <li>The link will be valid for 30 days</li>
              <li>The contractor can view job details and submit progress without logging in</li>
              <li>You'll be notified when they submit updates</li>
            </ul>
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedContractorId || complianceWarning.includes('BLOCKED') || complianceWarning.includes('EXPIRED')}
              className="flex-1 bg-primary hover:bg-primary-hover text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Assigning...' : 'Assign Contractor & Send Email'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
