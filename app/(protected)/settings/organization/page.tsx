'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getUserPermissions } from '@/lib/middleware/role-check';

export default function OrganizationSettingsPage() {
  const [formData, setFormData] = useState({
    name: '',
    abn: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    phone: '',
    email: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkPermissionsAndLoadData();
  }, []);

  const checkPermissionsAndLoadData = async () => {
    setLoading(true);
    
    try {
      // Check permissions
      const permissions = await getUserPermissions();
      const isOwner = permissions?.canManageSubscription || false;
      setCanManage(isOwner);

      if (!isOwner) {
        setLoading(false);
        return;
      }

      // Load organization data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        setError('Organization not found');
        setLoading(false);
        return;
      }

      setOrganizationId(profile.organization_id);

      // Fetch organization details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) {
        setError('Failed to load organization details');
      } else if (org) {
        setFormData({
          name: org.name || '',
          abn: org.abn || '',
          address: org.address || '',
          city: org.city || '',
          state: org.state || '',
          postcode: org.postcode || '',
          phone: org.phone || '',
          email: org.email || '',
        });
      }
    } catch (err: any) {
      console.error('Error loading organization:', err);
      setError(err.message || 'Failed to load organization details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setSuccess(''); // Clear success message when user edits
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          abn: formData.abn || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          postcode: formData.postcode || null,
          phone: formData.phone || null,
          email: formData.email || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);

      if (updateError) {
        throw updateError;
      }

      setSuccess('Organization details updated successfully!');
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.message || 'Failed to update organization details');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <p className="text-gray-600">Only owners can manage organization settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Organization Settings</h1>
        <p className="text-gray-600 mt-2">Manage your business information and details</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Information Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
              Business Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Your business name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="abn" className="block text-sm font-medium text-gray-700 mb-2">
                    ABN
                  </label>
                  <input
                    id="abn"
                    name="abn"
                    type="text"
                    value={formData.abn}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="12 345 678 901"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="+61 400 000 000"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="business@example.com"
                />
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
              Business Address
            </h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    City/Suburb
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Sydney"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    id="state"
                    name="state"
                    type="text"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="NSW"
                  />
                </div>

                <div>
                  <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-2">
                    Postcode
                  </label>
                  <input
                    id="postcode"
                    name="postcode"
                    type="text"
                    value={formData.postcode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="2000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
              {success}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
