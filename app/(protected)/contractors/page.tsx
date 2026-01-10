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
    checkAccess();
    fetchContractors();
  }, []);

  const checkAccess = async () => {
    const hasPro = await hasOperationsPro();
    setHasProAccess(hasPro);
  };

  const fetchContractors = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .order('contractor_name', { ascending: true });

    if (error) {
      console.error('Error fetching contractors:', error);
    } else {
      setContractors(data || []);
    }

    setLoading(false);
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

  if (!hasProAccess) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Operations Pro Required</h1>
        <p className="text-gray-600 mb-6">
          Contractor management is available with Operations Pro subscription.
        </p>
        <Link
          href="/subscription/manage"
          className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Upgrade to Operations Pro
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contractors</h1>
          <p className="text-gray-600 mt-2">Manage external contractors and compliance</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          + Add Contractor
        </button>
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
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">👷</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Contractors Found</h2>
          <p className="text-gray-600 mb-6">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your search or filter'
              : 'Add contractors to manage external workers'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredContractors.map((contractor) => {
            const complianceStatus = getComplianceStatus(contractor);
            
            return (
              <div
                key={contractor.id}
                className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow ${
                  complianceStatus === 'expired' ? 'border-l-4 border-red-500' :
                  complianceStatus === 'expiring' ? 'border-l-4 border-orange-500' :
                  complianceStatus === 'blocked' ? 'border-l-4 border-gray-500' :
                  'border-l-4 border-green-500'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{contractor.contractor_name}</h3>
                    {contractor.company_name && (
                      <p className="text-sm text-gray-600">{contractor.company_name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(contractor)}
                      className="text-primary hover:text-primary-hover text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(contractor.id)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">📧</span>
                    <a href={`mailto:${contractor.email}`} className="text-primary hover:underline">
                      {contractor.email}
                    </a>
                  </div>
                  {contractor.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">📞</span>
                      <span className="text-gray-900">{contractor.phone}</span>
                    </div>
                  )}
                </div>

                {/* Compliance Info */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                  {contractor.insurance_expiry && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Insurance:</span>
                      <span className={`font-medium ${
                        isExpired(contractor.insurance_expiry) ? 'text-red-600' :
                        isExpiringSoon(contractor.insurance_expiry) ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {isExpired(contractor.insurance_expiry) ? '❌ Expired' :
                         isExpiringSoon(contractor.insurance_expiry) ? '⚠️ Expiring Soon' :
                         '✓ Valid'} - {new Date(contractor.insurance_expiry).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {contractor.license_expiry && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">License:</span>
                      <span className={`font-medium ${
                        isExpired(contractor.license_expiry) ? 'text-red-600' :
                        isExpiringSoon(contractor.license_expiry) ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {isExpired(contractor.license_expiry) ? '❌ Expired' :
                         isExpiringSoon(contractor.license_expiry) ? '⚠️ Expiring Soon' :
                         '✓ Valid'} - {new Date(contractor.license_expiry).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4">
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
