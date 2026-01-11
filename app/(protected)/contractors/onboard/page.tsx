'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { hasOperationsPro } from '@/lib/middleware/role-check';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface OnboardingRequest {
  id: string;
  contractor_email: string;
  contractor_name: string | null;
  status: string;
  created_at: string;
  token_expires_at: string;
  access_token: string;
}

const AVAILABLE_FIELDS = [
  { key: 'phone', label: 'Phone Number', description: 'Contact phone number' },
  { key: 'mobile', label: 'Mobile Number', description: 'Mobile phone number' },
  { key: 'abn', label: 'ABN', description: 'Australian Business Number' },
  { key: 'company_name', label: 'Company Name', description: 'Business or trading name' },
  { key: 'license_number', label: 'License Number', description: 'Trade license number' },
  { key: 'license_expiry', label: 'License Expiry Date', description: 'When their license expires' },
  { key: 'insurance_expiry', label: 'Insurance Expiry Date', description: 'When their insurance expires' },
];

const AVAILABLE_DOCUMENTS = [
  { key: 'insurance_certificate', label: 'Insurance Certificate', description: 'Public liability or professional indemnity' },
  { key: 'license_copy', label: 'Trade License Copy', description: 'Copy of their trade license' },
  { key: 'induction_certificate', label: 'Induction Certificate', description: 'Site induction or safety certification' },
  { key: 'abn_certificate', label: 'ABN Registration', description: 'ABN registration document' },
  { key: 'qualifications', label: 'Qualifications', description: 'Trade qualifications or certifications' },
  { key: 'other', label: 'Other Document', description: 'Any other required document' },
];

export default function ContractorOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [hasProAccess, setHasProAccess] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<OnboardingRequest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  
  const [formData, setFormData] = useState({
    contractor_email: '',
    contractor_name: '',
    custom_message: '',
    required_fields: {} as Record<string, boolean>,
    required_documents: [] as string[],
  });

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    setLoading(true);
    const hasPro = await hasOperationsPro();
    setHasProAccess(hasPro);
    
    if (hasPro) {
      await fetchPendingRequests();
    }
    setLoading(false);
  };

  const fetchPendingRequests = async () => {
    const { data } = await supabase
      .from('contractor_onboarding_requests')
      .select('*')
      .in('status', ['pending', 'partial'])
      .order('created_at', { ascending: false });
    
    setPendingRequests(data || []);
  };

  const handleFieldToggle = (fieldKey: string) => {
    setFormData(prev => ({
      ...prev,
      required_fields: {
        ...prev.required_fields,
        [fieldKey]: !prev.required_fields[fieldKey]
      }
    }));
  };

  const handleDocumentToggle = (docKey: string) => {
    setFormData(prev => ({
      ...prev,
      required_documents: prev.required_documents.includes(docKey)
        ? prev.required_documents.filter(d => d !== docKey)
        : [...prev.required_documents, docKey]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contractor_email) {
      alert('Please enter the contractor email');
      return;
    }

    const hasAnyRequired = Object.values(formData.required_fields).some(v => v) || formData.required_documents.length > 0;
    if (!hasAnyRequired) {
      alert('Please select at least one required field or document');
      return;
    }

    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      // Create the onboarding request
      const { data: request, error } = await supabase
        .from('contractor_onboarding_requests')
        .insert({
          organization_id: profile.organization_id,
          created_by: user.id,
          contractor_email: formData.contractor_email,
          contractor_name: formData.contractor_name || null,
          required_fields: formData.required_fields,
          required_documents: formData.required_documents,
          custom_message: formData.custom_message || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Generate the secure link
      const onboardingUrl = `${window.location.origin}/contractor-onboard/${request.access_token}`;

      // Log email communication
      await supabase.from('email_communications').insert({
        organization_id: profile.organization_id,
        email_type: 'contractor_onboarding',
        recipient_email: formData.contractor_email,
        subject: 'Please provide your contractor details',
        body: `Onboarding request sent. Access link: ${onboardingUrl}`,
        status: 'sent',
      });

      alert(`Onboarding request created!\n\nSecure link for ${formData.contractor_email}:\n${onboardingUrl}\n\nCopy this link and send it to the contractor.`);
      
      setShowModal(false);
      setFormData({
        contractor_email: '',
        contractor_name: '',
        custom_message: '',
        required_fields: {},
        required_documents: [],
      });
      fetchPendingRequests();
    } catch (error: any) {
      alert('Error creating request: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Cancel this onboarding request?')) return;

    await supabase
      .from('contractor_onboarding_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId);

    fetchPendingRequests();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/contractor-onboard/${token}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasProAccess) {
    return (
      <div className="text-center py-12">
        <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-3">Operations Pro Required</h1>
        <p className="text-gray-600 mb-6 text-sm">Contractor onboarding requires Operations Pro subscription.</p>
        <Link href="/subscription/manage" className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-md text-sm font-medium transition-colors">
          Upgrade to Operations Pro
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/contractors" className="text-primary hover:text-primary-hover text-sm mb-3 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Contractors
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Contractor Onboarding</h1>
            <p className="text-gray-500 text-sm mt-1">Request details and documents from contractors via secure link</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Onboarding Request
          </button>
        </div>
      </div>

      {/* Pending Requests */}
      <div className="bg-white border border-gray-200 rounded-md">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Pending Requests</h2>
        </div>
        
        {pendingRequests.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {pendingRequests.map((request) => (
              <div key={request.id} className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {request.contractor_name || request.contractor_email}
                    </p>
                    {request.contractor_name && (
                      <p className="text-xs text-gray-500">{request.contractor_email}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Sent {new Date(request.created_at).toLocaleDateString()} • 
                      Expires {new Date(request.token_expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      request.status === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {request.status}
                    </span>
                    <button
                      onClick={() => copyLink(request.access_token)}
                      className="text-xs text-primary hover:text-primary-hover font-medium"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => handleCancelRequest(request.id)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">No pending onboarding requests</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-sm text-primary hover:text-primary-hover font-medium mt-2"
            >
              Create your first request
            </button>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-md p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">How Contractor Onboarding Works</h3>
        <ol className="text-sm text-gray-600 space-y-2">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">1</span>
            <span>Select which details and documents you need from the contractor</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">2</span>
            <span>A secure link is generated - share it with the contractor via email or message</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">3</span>
            <span>The contractor fills in their details and uploads documents using the link</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">4</span>
            <span>You receive the submission and can review/approve their information</span>
          </li>
        </ol>
      </div>

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-md shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">New Onboarding Request</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Contractor Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Contractor Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        required
                        value={formData.contractor_email}
                        onChange={(e) => setFormData({ ...formData, contractor_email: e.target.value })}
                        placeholder="contractor@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
                      <input
                        type="text"
                        value={formData.contractor_name}
                        onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })}
                        placeholder="John Smith"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Required Fields */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Required Information</h3>
                  <p className="text-xs text-gray-500 mb-3">Select which details the contractor must provide</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {AVAILABLE_FIELDS.map((field) => (
                      <label
                        key={field.key}
                        className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                          formData.required_fields[field.key]
                            ? 'border-primary bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.required_fields[field.key] || false}
                          onChange={() => handleFieldToggle(field.key)}
                          className="mt-0.5 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{field.label}</p>
                          <p className="text-xs text-gray-500">{field.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Required Documents */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Required Documents</h3>
                  <p className="text-xs text-gray-500 mb-3">Select which documents the contractor must upload</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {AVAILABLE_DOCUMENTS.map((doc) => (
                      <label
                        key={doc.key}
                        className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                          formData.required_documents.includes(doc.key)
                            ? 'border-primary bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.required_documents.includes(doc.key)}
                          onChange={() => handleDocumentToggle(doc.key)}
                          className="mt-0.5 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.label}</p>
                          <p className="text-xs text-gray-500">{doc.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Custom Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Message (optional)</label>
                  <textarea
                    value={formData.custom_message}
                    onChange={(e) => setFormData({ ...formData, custom_message: e.target.value })}
                    rows={3}
                    placeholder="Add any additional instructions for the contractor..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    {sending ? 'Creating...' : 'Create Request & Generate Link'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
