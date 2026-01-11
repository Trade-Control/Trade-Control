'use client';

import { useState, useEffect } from 'react';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { hasOperationsPro } from '@/lib/middleware/role-check';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ContractorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contractorId = params.id as string;
  const supabase = useSafeSupabaseClient();
  
  const [contractor, setContractor] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasProAccess, setHasProAccess] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    contractor_name: '',
    company_name: '',
    email: '',
    phone: '',
    mobile: '',
    abn: '',
    insurance_expiry: '',
    license_number: '',
    license_expiry: '',
    compliance_notes: '',
    status: 'active',
  });

  useEffect(() => {
    if (supabase) {
      initializePage();
    }
  }, [contractorId, supabase]);

  const initializePage = async () => {
    if (!supabase) return;
    setLoading(true);
    const hasPro = await hasOperationsPro();
    setHasProAccess(hasPro);
    
    if (hasPro) {
      await Promise.all([fetchContractor(), fetchAssignments()]);
    }
    setLoading(false);
  };

  const fetchContractor = async () => {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .eq('id', contractorId)
      .single();

    if (error) {
      console.error('Error fetching contractor:', error);
      router.push('/contractors');
      return;
    }

    setContractor(data);
    setFormData({
      contractor_name: data.contractor_name || '',
      company_name: data.company_name || '',
      email: data.email || '',
      phone: data.phone || '',
      mobile: data.mobile || '',
      abn: data.abn || '',
      insurance_expiry: data.insurance_expiry || '',
      license_number: data.license_number || '',
      license_expiry: data.license_expiry || '',
      compliance_notes: data.compliance_notes || '',
      status: data.status || 'active',
    });
  };

  const fetchAssignments = async () => {
    const { data } = await supabase
      .from('contractor_job_assignments')
      .select('*, jobs(id, title, job_number, status)')
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    setAssignments(data || []);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('contractors')
      .update({
        ...formData,
        insurance_expiry: formData.insurance_expiry || null,
        license_expiry: formData.license_expiry || null,
      })
      .eq('id', contractorId);

    if (error) {
      alert('Error updating contractor: ' + error.message);
    } else {
      setShowEditModal(false);
      fetchContractor();
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contractor? This action cannot be undone.')) return;

    const { error } = await supabase
      .from('contractors')
      .delete()
      .eq('id', contractorId);

    if (error) {
      alert('Error deleting contractor: ' + error.message);
    } else {
      router.push('/contractors');
    }
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const expiry = new Date(date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      flagged: 'bg-amber-100 text-amber-800',
      blocked: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
        <p className="text-gray-600 mb-6 text-sm">Contractor management requires Operations Pro subscription.</p>
        <Link href="/subscription/manage" className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-md text-sm font-medium transition-colors">
          Upgrade to Operations Pro
        </Link>
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-semibold text-gray-900 mb-3">Contractor Not Found</h1>
        <Link href="/contractors" className="text-primary hover:text-primary-hover font-medium">
          ← Back to Contractors
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
            <h1 className="text-2xl font-semibold text-gray-900">{contractor.contractor_name}</h1>
            {contractor.company_name && <p className="text-sm text-gray-500 mt-1">{contractor.company_name}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${getStatusColor(contractor.status)}`}>
              {contractor.status}
            </span>
            <button
              onClick={() => setShowEditModal(true)}
              className="text-sm bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-md p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</p>
                <a href={`mailto:${contractor.email}`} className="text-sm text-primary hover:underline">{contractor.email}</a>
              </div>
              {contractor.phone && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Phone</p>
                  <p className="text-sm text-gray-900">{contractor.phone}</p>
                </div>
              )}
              {contractor.mobile && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Mobile</p>
                  <p className="text-sm text-gray-900">{contractor.mobile}</p>
                </div>
              )}
              {contractor.abn && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">ABN</p>
                  <p className="text-sm text-gray-900">{contractor.abn}</p>
                </div>
              )}
            </div>
          </div>

          {/* Compliance Information */}
          <div className="bg-white border border-gray-200 rounded-md p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Compliance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Insurance Expiry</p>
                {contractor.insurance_expiry ? (
                  <p className={`text-sm font-medium ${
                    isExpired(contractor.insurance_expiry) ? 'text-red-600' :
                    isExpiringSoon(contractor.insurance_expiry) ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {new Date(contractor.insurance_expiry).toLocaleDateString()}
                    {isExpired(contractor.insurance_expiry) && ' (Expired)'}
                    {isExpiringSoon(contractor.insurance_expiry) && ' (Expiring Soon)'}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">Not set</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">License Expiry</p>
                {contractor.license_expiry ? (
                  <p className={`text-sm font-medium ${
                    isExpired(contractor.license_expiry) ? 'text-red-600' :
                    isExpiringSoon(contractor.license_expiry) ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {new Date(contractor.license_expiry).toLocaleDateString()}
                    {isExpired(contractor.license_expiry) && ' (Expired)'}
                    {isExpiringSoon(contractor.license_expiry) && ' (Expiring Soon)'}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">Not set</p>
                )}
              </div>
              {contractor.license_number && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">License Number</p>
                  <p className="text-sm text-gray-900">{contractor.license_number}</p>
                </div>
              )}
              {contractor.compliance_notes && (
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-gray-900">{contractor.compliance_notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Job Assignments */}
          <div className="bg-white border border-gray-200 rounded-md p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Job Assignments</h2>
            {assignments.length > 0 ? (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="border border-gray-200 rounded-md p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <Link href={`/jobs/${assignment.job_id}`} className="text-sm font-medium text-primary hover:underline">
                          {assignment.jobs?.title || 'Unknown Job'}
                        </Link>
                        <p className="text-xs text-gray-500">#{assignment.jobs?.job_number}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {assignment.status?.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Assigned: {new Date(assignment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No job assignments yet.</p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-md p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Assignments</p>
            <p className="text-2xl font-semibold text-gray-900">{assignments.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-md p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Completed Jobs</p>
            <p className="text-2xl font-semibold text-green-600">
              {assignments.filter(a => a.status === 'completed').length}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-md p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Member Since</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(contractor.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-md shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Edit Contractor</h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.contractor_name}
                      onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ABN</label>
                    <input
                      type="text"
                      value={formData.abn}
                      onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="flagged">Flagged</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                    <input
                      type="text"
                      value={formData.license_number}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Expiry</label>
                    <input
                      type="date"
                      value={formData.insurance_expiry}
                      onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License Expiry</label>
                    <input
                      type="date"
                      value={formData.license_expiry}
                      onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compliance Notes</label>
                  <textarea
                    value={formData.compliance_notes}
                    onChange={(e) => setFormData({ ...formData, compliance_notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-medium"
                  >
                    Save Changes
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
