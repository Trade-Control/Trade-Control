'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import Image from 'next/image';

interface OnboardingRequest {
  id: string;
  contractor_email: string;
  contractor_name: string | null;
  required_fields: Record<string, boolean>;
  required_documents: string[];
  custom_message: string | null;
  status: string;
  token_expires_at: string;
  organization_id: string;
}

const FIELD_LABELS: Record<string, string> = {
  phone: 'Phone Number',
  mobile: 'Mobile Number',
  abn: 'ABN',
  company_name: 'Company Name',
  license_number: 'License Number',
  license_expiry: 'License Expiry Date',
  insurance_expiry: 'Insurance Expiry Date',
};

const DOCUMENT_LABELS: Record<string, string> = {
  insurance_certificate: 'Insurance Certificate',
  license_copy: 'Trade License Copy',
  induction_certificate: 'Induction Certificate',
  abn_certificate: 'ABN Registration',
  qualifications: 'Qualifications',
  other: 'Other Document',
};

export default function ContractorOnboardingSubmitPage() {
  const params = useParams();
  const token = params.token as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [request, setRequest] = useState<OnboardingRequest | null>(null);
  const [error, setError] = useState('');
  const [organizationName, setOrganizationName] = useState('');

  const [formData, setFormData] = useState<Record<string, string>>({
    contractor_name: '',
  });
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, File | null>>({});

  useEffect(() => {
    fetchRequest();
  }, [token]);

  const fetchRequest = async () => {
    setLoading(true);

    // Fetch the onboarding request by token
    const { data, error } = await supabase
      .from('contractor_onboarding_requests')
      .select('*')
      .eq('access_token', token)
      .single();

    if (error || !data) {
      setError('This onboarding link is invalid or has expired.');
      setLoading(false);
      return;
    }

    // Check expiry
    if (new Date(data.token_expires_at) < new Date()) {
      setError('This onboarding link has expired. Please contact the organization for a new link.');
      setLoading(false);
      return;
    }

    // Check status
    if (data.status === 'completed') {
      setSubmitted(true);
    } else if (data.status === 'cancelled' || data.status === 'expired') {
      setError('This onboarding request is no longer active.');
      setLoading(false);
      return;
    }

    setRequest(data);

    // Pre-fill contractor name if provided
    if (data.contractor_name) {
      setFormData(prev => ({ ...prev, contractor_name: data.contractor_name }));
    }

    // Fetch organization name
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', data.organization_id)
      .single();

    if (org) {
      setOrganizationName(org.name);
    }

    setLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (docType: string, file: File | null) => {
    setUploadedDocs(prev => ({ ...prev, [docType]: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    // Validate required fields
    const requiredFields = Object.entries(request.required_fields)
      .filter(([_, required]) => required)
      .map(([key]) => key);

    for (const field of requiredFields) {
      if (!formData[field]) {
        alert(`Please fill in the ${FIELD_LABELS[field] || field} field`);
        return;
      }
    }

    // Validate required documents
    for (const docType of request.required_documents) {
      if (!uploadedDocs[docType]) {
        alert(`Please upload the ${DOCUMENT_LABELS[docType] || docType}`);
        return;
      }
    }

    setSubmitting(true);

    try {
      // Upload documents first
      const documentUploads: any[] = [];
      for (const [docType, file] of Object.entries(uploadedDocs)) {
        if (file) {
          const timestamp = Date.now();
          const filePath = `onboarding/${request.id}/${timestamp}-${file.name}`;

          const { error: uploadError } = await supabase.storage
            .from('contractor-onboarding')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            // Continue anyway - document upload is best effort
          } else {
            documentUploads.push({
              onboarding_request_id: request.id,
              document_type: docType,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              file_type: file.type,
            });
          }
        }
      }

      // Insert document records
      if (documentUploads.length > 0) {
        await supabase
          .from('contractor_onboarding_documents')
          .insert(documentUploads);
      }

      // Update the onboarding request with submitted data
      const { error: updateError } = await supabase
        .from('contractor_onboarding_requests')
        .update({
          submitted_data: formData,
          submitted_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      setSubmitted(true);
    } catch (error: any) {
      alert('Error submitting: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Link Invalid</h1>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 text-sm">
            Your information has been submitted successfully. {organizationName ? `${organizationName} will` : 'The organization will'} review your details and be in touch.
          </p>
        </div>
      </div>
    );
  }

  const requiredFieldKeys = Object.entries(request?.required_fields || {})
    .filter(([_, required]) => required)
    .map(([key]) => key);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <Image 
              src="/logo.png" 
              alt="Trade Control" 
              width={160} 
              height={53} 
              priority
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Contractor Details Request</h1>
            {organizationName && (
              <p className="text-gray-600 text-sm mt-1">
                {organizationName} is requesting the following information from you
              </p>
            )}
          </div>

          {request?.custom_message && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <p className="text-sm text-blue-800">{request.custom_message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contractor Name (always shown) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name *
              </label>
              <input
                type="text"
                required
                value={formData.contractor_name || ''}
                onChange={(e) => handleInputChange('contractor_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Required Fields */}
            {requiredFieldKeys.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-4">Required Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requiredFieldKeys.map((fieldKey) => (
                    <div key={fieldKey}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {FIELD_LABELS[fieldKey] || fieldKey} *
                      </label>
                      {fieldKey.includes('expiry') ? (
                        <input
                          type="date"
                          required
                          value={formData[fieldKey] || ''}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      ) : (
                        <input
                          type={fieldKey === 'phone' || fieldKey === 'mobile' ? 'tel' : 'text'}
                          required
                          value={formData[fieldKey] || ''}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Required Documents */}
            {request?.required_documents && request.required_documents.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-4">Required Documents</h2>
                <div className="space-y-4">
                  {request.required_documents.map((docType) => (
                    <div key={docType} className="border border-gray-200 rounded-md p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {DOCUMENT_LABELS[docType] || docType} *
                      </label>
                      <input
                        type="file"
                        required
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(docType, e.target.files?.[0] || null)}
                        className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-hover"
                      />
                      {uploadedDocs[docType] && (
                        <p className="text-xs text-green-600 mt-2">
                          Selected: {uploadedDocs[docType]?.name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Information'}
              </button>
              <p className="text-xs text-gray-500 text-center mt-3">
                Your information will be securely stored and shared only with {organizationName || 'the requesting organization'}.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
