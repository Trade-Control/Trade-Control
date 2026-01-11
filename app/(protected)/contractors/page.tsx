'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Contractor } from '@/lib/types/database.types';
import { hasOperationsPro } from '@/lib/middleware/role-check';
import Link from 'next/link';

export default function ContractorsPage() {
  const supabase = createClient();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasProAccess, setHasProAccess] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'flagged' | 'blocked'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);

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
  });

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    setLoading(true);
    // Check access first, then fetch data
    const hasPro = await hasOperationsPro();
    setHasProAccess(hasPro);
    setAccessChecked(true);
    
    if (hasPro) {
      await fetchContractors();
    }
    setLoading(false);
  };

  const fetchContractors = async () => {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .order('contractor_name', { ascending: true });

    if (error) {
      console.error('Error fetching contractors:', error);
    } else {
      setContractors(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) return;

    if (editingContractor) {
      const { error } = await supabase
        .from('contractors')
        .update({
          ...formData,
          insurance_expiry: formData.insurance_expiry || null,
          license_expiry: formData.license_expiry || null,
        })
        .eq('id', editingContractor.id);

      if (error) {
        alert('Error updating contractor: ' + error.message);
      } else {
        setShowModal(false);
        resetForm();
        fetchContractors();
      }
    } else {
      const { error } = await supabase
        .from('contractors')
        .insert({
          ...formData,
          organization_id: profile.organization_id,
          created_by: user.id,
          insurance_expiry: formData.insurance_expiry || null,
          license_expiry: formData.license_expiry || null,
        });

      if (error) {
        alert('Error creating contractor: ' + error.message);
      } else {
        setShowModal(false);
        resetForm();
        fetchContractors();
      }
    }
  };

  const handleEdit = (contractor: Contractor) => {
    setEditingContractor(contractor);
    setFormData({
      contractor_name: contractor.contractor_name,
      company_name: contractor.company_name || '',
      email: contractor.email,
      phone: contractor.phone || '',
      mobile: contractor.mobile || '',
      abn: contractor.abn || '',
      insurance_expiry: contractor.insurance_expiry || '',
      license_number: contractor.license_number || '',
      license_expiry: contractor.license_expiry || '',
      compliance_notes: contractor.compliance_notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this contractor? This cannot be undone.')) {
      const { error } = await supabase
        .from('contractors')
        .delete()
        .eq('id', id);

      if (error) {
        alert('Error deleting contractor: ' + error.message);
      } else {
        fetchContractors();
      }
    }
  };

  const resetForm = () => {
    setEditingContractor(null);
    setFormData({
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
    });
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

  const getComplianceStatus = (contractor: Contractor) => {
    if (contractor.status === 'blocked') return 'blocked';
    if (isExpired(contractor.insurance_expiry) || isExpired(contractor.license_expiry)) return 'expired';
    if (isExpiringSoon(contractor.insurance_expiry) || isExpiringSoon(contractor.license_expiry)) return 'expiring';
    return 'compliant';
  };

  const filteredContractors = contractors.filter(contractor => {
    const matchesStatus = filterStatus === 'all' || contractor.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      contractor.contractor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contractor.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contractor.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Show loading state while checking access - prevents flash of upgrade page
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
        <p className="text-gray-600 mb-6 text-sm max-w-md mx-auto">
          Contractor management is available with Operations Pro subscription.
        </p>
        <Link
          href="/subscription/manage"
          className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-md text-sm font-medium transition-colors"
        >
          Upgrade to Operations Pro
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Contractors</h1>
          <p className="text-gray-500 text-sm mt-1">Manage external contractors and compliance</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/contractors/onboard"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Request Details
          </Link>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            + Add Contractor
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search contractors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('flagged')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'flagged'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Flagged
            </button>
            <button
              onClick={() => setFilterStatus('blocked')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'blocked'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Blocked
            </button>
          </div>
        </div>
      </div>

      {/* Contractors Grid */}
      {filteredContractors.length === 0 ? (
        <div className="bg-white rounded-md border border-gray-200 p-10 text-center">
          <div className="h-14 w-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Contractors Found</h2>
          <p className="text-gray-500 text-sm">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your search or filter'
              : 'Add contractors to manage external workers'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredContractors.map((contractor) => {
            const complianceStatus = getComplianceStatus(contractor);
            
            return (
              <div
                key={contractor.id}
                className={`bg-white rounded-md border border-gray-200 p-5 hover:shadow-sm transition-shadow ${
                  complianceStatus === 'expired' ? 'border-l-4 border-l-red-500' :
                  complianceStatus === 'expiring' ? 'border-l-4 border-l-amber-500' :
                  complianceStatus === 'blocked' ? 'border-l-4 border-l-gray-400' :
                  'border-l-4 border-l-green-500'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900">{contractor.contractor_name}</h3>
                    {contractor.company_name && (
                      <p className="text-xs text-gray-500">{contractor.company_name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(contractor)}
                      className="text-primary hover:text-primary-hover text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(contractor.id)}
                      className="text-red-600 hover:text-red-700 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href={`mailto:${contractor.email}`} className="text-primary hover:underline text-sm">
                      {contractor.email}
                    </a>
                  </div>
                  {contractor.phone && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="text-gray-900 text-sm">{contractor.phone}</span>
                    </div>
                  )}
                </div>

                {/* Compliance Info */}
                <div className="bg-gray-50 rounded-md p-3 space-y-1.5 text-xs">
                  {contractor.insurance_expiry && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Insurance:</span>
                      <span className={`font-medium ${
                        isExpired(contractor.insurance_expiry) ? 'text-red-600' :
                        isExpiringSoon(contractor.insurance_expiry) ? 'text-amber-600' :
                        'text-green-600'
                      }`}>
                        {isExpired(contractor.insurance_expiry) ? 'Expired' :
                         isExpiringSoon(contractor.insurance_expiry) ? 'Expiring Soon' :
                         'Valid'} • {new Date(contractor.insurance_expiry).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {contractor.license_expiry && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">License:</span>
                      <span className={`font-medium ${
                        isExpired(contractor.license_expiry) ? 'text-red-600' :
                        isExpiringSoon(contractor.license_expiry) ? 'text-amber-600' :
                        'text-green-600'
                      }`}>
                        {isExpired(contractor.license_expiry) ? 'Expired' :
                         isExpiringSoon(contractor.license_expiry) ? 'Expiring Soon' :
                         'Valid'} • {new Date(contractor.license_expiry).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <Link
                    href={`/contractors/${contractor.id}`}
                    className="text-primary hover:text-primary-hover text-sm font-medium"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingContractor ? 'Edit Contractor' : 'Add New Contractor'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contractor Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contractor_name}
                      onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile
                    </label>
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ABN
                    </label>
                    <input
                      type="text"
                      value={formData.abn}
                      onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Compliance Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Insurance Expiry Date
                      </label>
                      <input
                        type="date"
                        value={formData.insurance_expiry}
                        onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        License Expiry Date
                      </label>
                      <input
                        type="date"
                        value={formData.license_expiry}
                        onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Number
                    </label>
                    <input
                      type="text"
                      value={formData.license_number}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Compliance Notes
                    </label>
                    <textarea
                      value={formData.compliance_notes}
                      onChange={(e) => setFormData({ ...formData, compliance_notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Any additional compliance information..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
                  >
                    {editingContractor ? 'Update Contractor' : 'Add Contractor'}
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
