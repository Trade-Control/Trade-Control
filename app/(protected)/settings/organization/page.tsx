'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getUserPermissions } from '@/lib/middleware/role-check';
import AddressAutocomplete from '@/components/AddressAutocomplete';

export default function OrganizationSettingsPage() {
  const [formData, setFormData] = useState({
    name: '',
    trading_name: '',
    abn: '',
    gst_registered: true,
    address: '',
    city: '',
    state: '',
    postcode: '',
    phone: '',
    email: '',
    billing_email: '',
    website_url: '',
    logo_url: '',
    brand_color: '#2563eb',
    job_code_prefix: 'JOB',
    quote_prefix: 'QT',
    invoice_prefix: 'INV',
    payment_details: '',
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
          trading_name: org.trading_name || '',
          abn: org.abn || '',
          gst_registered: org.gst_registered ?? true,
          address: org.address || '',
          city: org.city || '',
          state: org.state || '',
          postcode: org.postcode || '',
          phone: org.phone || '',
          email: org.email || '',
          billing_email: org.billing_email || '',
          website_url: org.website_url || '',
          logo_url: org.logo_url || '',
          brand_color: org.brand_color || '#2563eb',
          job_code_prefix: org.job_code_prefix || 'JOB',
          quote_prefix: org.quote_prefix || 'QT',
          invoice_prefix: org.invoice_prefix || 'INV',
          payment_details: org.payment_details || '',
        });
      }
    } catch (err: any) {
      console.error('Error loading organization:', err);
      setError(err.message || 'Failed to load organization details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
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
          trading_name: formData.trading_name,
          abn: formData.abn,
          gst_registered: formData.gst_registered,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postcode: formData.postcode,
          phone: formData.phone,
          email: formData.email,
          billing_email: formData.billing_email,
          website_url: formData.website_url,
          logo_url: formData.logo_url,
          brand_color: formData.brand_color,
          job_code_prefix: formData.job_code_prefix,
          quote_prefix: formData.quote_prefix,
          invoice_prefix: formData.invoice_prefix,
          payment_details: formData.payment_details,
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

              <div>
                <label htmlFor="trading_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Trading Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="trading_name"
                  name="trading_name"
                  type="text"
                  value={formData.trading_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Trading name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="abn" className="block text-sm font-medium text-gray-700 mb-2">
                    ABN <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="abn"
                    name="abn"
                    type="text"
                    value={formData.abn}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="12 345 678 901"
                  />
                </div>

                <div>
                  <label htmlFor="gst_registered" className="block text-sm font-medium text-gray-700 mb-2">
                    GST Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="gst_registered"
                    name="gst_registered"
                    value={formData.gst_registered ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, gst_registered: e.target.value === 'true' })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="true">GST Registered</option>
                    <option value="false">Not GST Registered</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Business Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="+61 400 000 000"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Business Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="business@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="billing_email" className="block text-sm font-medium text-gray-700 mb-2">
                  Billing Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="billing_email"
                  name="billing_email"
                  type="email"
                  value={formData.billing_email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="billing@example.com"
                />
              </div>

              <div>
                <label htmlFor="website_url" className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL <span className="text-red-500">*</span>
                </label>
                <input
                  id="website_url"
                  name="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="https://www.yourbusiness.com.au"
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
              <AddressAutocomplete
                label="Business Physical/Registered Address"
                required
                value={formData.address}
                onChange={(value) => setFormData({ ...formData, address: value })}
                onAddressSelect={(components) => {
                  setFormData({
                    ...formData,
                    address: components.address,
                    city: components.city,
                    state: components.state,
                    postcode: components.postcode,
                  });
                }}
                placeholder="Start typing your address..."
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    City/Suburb <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Sydney"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Select</option>
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="QLD">QLD</option>
                    <option value="WA">WA</option>
                    <option value="SA">SA</option>
                    <option value="TAS">TAS</option>
                    <option value="ACT">ACT</option>
                    <option value="NT">NT</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-2">
                    Postcode <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="postcode"
                    name="postcode"
                    type="text"
                    value={formData.postcode}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="2000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Branding & Document Settings */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
              Branding & Document Settings
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-2">
                    Logo URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="logo_url"
                    name="logo_url"
                    type="url"
                    value={formData.logo_url}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used on invoices and quotes</p>
                </div>

                <div>
                  <label htmlFor="brand_color" className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Colour <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.brand_color}
                      onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                      className="h-12 w-20 border border-gray-300 rounded-md cursor-pointer"
                    />
                    <input
                      id="brand_color"
                      name="brand_color"
                      type="text"
                      value={formData.brand_color}
                      onChange={handleChange}
                      required
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="#2563eb"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Used on invoices and quotes</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="job_code_prefix" className="block text-sm font-medium text-gray-700 mb-2">
                    Job Code Prefix <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="job_code_prefix"
                    name="job_code_prefix"
                    type="text"
                    value={formData.job_code_prefix}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="JOB"
                  />
                </div>

                <div>
                  <label htmlFor="quote_prefix" className="block text-sm font-medium text-gray-700 mb-2">
                    Quote Prefix <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="quote_prefix"
                    name="quote_prefix"
                    type="text"
                    value={formData.quote_prefix}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="QT"
                  />
                </div>

                <div>
                  <label htmlFor="invoice_prefix" className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Prefix <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="invoice_prefix"
                    name="invoice_prefix"
                    type="text"
                    value={formData.invoice_prefix}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="INV"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="payment_details" className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="payment_details"
                  name="payment_details"
                  value={formData.payment_details}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="BSB: 123-456&#10;Account: 12345678&#10;Account Name: Your Business Pty Ltd"
                />
                <p className="text-xs text-gray-500 mt-1">This will appear on invoices</p>
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
