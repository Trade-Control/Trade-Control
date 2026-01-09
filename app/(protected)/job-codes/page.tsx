'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { JobCode } from '@/lib/types/database.types';

export default function JobCodesPage() {
  const [jobCodes, setJobCodes] = useState<JobCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingJobCode, setEditingJobCode] = useState<JobCode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const supabase = createClient();

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    unit_price: '',
    unit: 'each',
    category: '',
    is_active: true,
  });

  useEffect(() => {
    fetchJobCodes();
  }, []);

  const fetchJobCodes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('job_codes')
      .select('*')
      .order('code', { ascending: true });

    if (error) {
      console.error('Error fetching job codes:', error);
    } else {
      setJobCodes(data || []);
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

    const jobCodeData = {
      ...formData,
      unit_price: parseFloat(formData.unit_price),
      category: formData.category || null,
    };

    if (editingJobCode) {
      const { error } = await supabase
        .from('job_codes')
        .update(jobCodeData)
        .eq('id', editingJobCode.id);

      if (error) {
        alert('Error updating job code: ' + error.message);
      } else {
        setShowModal(false);
        resetForm();
        fetchJobCodes();
      }
    } else {
      const { error } = await supabase
        .from('job_codes')
        .insert({
          ...jobCodeData,
          organization_id: profile.organization_id,
          created_by: user.id,
        });

      if (error) {
        alert('Error creating job code: ' + error.message);
      } else {
        setShowModal(false);
        resetForm();
        fetchJobCodes();
      }
    }
  };

  const handleEdit = (jobCode: JobCode) => {
    setEditingJobCode(jobCode);
    setFormData({
      code: jobCode.code,
      description: jobCode.description,
      unit_price: jobCode.unit_price.toString(),
      unit: jobCode.unit,
      category: jobCode.category || '',
      is_active: jobCode.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job code?')) return;

    const { error } = await supabase
      .from('job_codes')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting job code: ' + error.message);
    } else {
      fetchJobCodes();
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('job_codes')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      alert('Error updating job code: ' + error.message);
    } else {
      fetchJobCodes();
    }
  };

  const resetForm = () => {
    setEditingJobCode(null);
    setFormData({
      code: '',
      description: '',
      unit_price: '',
      unit: 'each',
      category: '',
      is_active: true,
    });
  };

  const categories = Array.from(new Set(jobCodes.map(jc => jc.category).filter(Boolean)));

  const filteredJobCodes = jobCodes.filter(jobCode => {
    const matchesSearch = searchTerm === '' || 
      jobCode.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jobCode.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || jobCode.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

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
          <h1 className="text-3xl font-bold text-gray-900">Job Codes</h1>
          <p className="text-gray-600 mt-2">Manage standardized job items and pricing</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          + Add Job Code
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search job codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          {categories.length > 0 && (
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category as string}>{category}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Job Codes Table */}
      {filteredJobCodes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No job codes found</h2>
          <p className="text-gray-600 mb-6">
            {searchTerm || filterCategory !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Create standardized job codes for quick quote generation'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredJobCodes.map((jobCode) => (
                  <tr key={jobCode.id} className={!jobCode.is_active ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{jobCode.code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{jobCode.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${jobCode.unit_price.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{jobCode.unit}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {jobCode.category ? (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                          {jobCode.category}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleActive(jobCode.id, jobCode.is_active)}
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          jobCode.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {jobCode.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(jobCode)}
                        className="text-primary hover:text-primary-hover mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(jobCode.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingJobCode ? 'Edit Job Code' : 'Add New Job Code'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent uppercase"
                      placeholder="e.g., PLUMB-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit Price * ($)
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Detailed description of the job item"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit *
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="each">Each</option>
                      <option value="hour">Hour</option>
                      <option value="day">Day</option>
                      <option value="metre">Metre</option>
                      <option value="sqm">Square Metre</option>
                      <option value="item">Item</option>
                      <option value="service">Service</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., Plumbing, Electrical"
                      list="categories"
                    />
                    {categories.length > 0 && (
                      <datalist id="categories">
                        {categories.map(category => (
                          <option key={category} value={category as string} />
                        ))}
                      </datalist>
                    )}
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Active (available for quotes)
                  </label>
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
                    {editingJobCode ? 'Update Job Code' : 'Add Job Code'}
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
