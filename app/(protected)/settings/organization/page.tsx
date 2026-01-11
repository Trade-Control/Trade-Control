'use client';

import { useState, useEffect, useRef } from 'react';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { useRouter } from 'next/navigation';
import { getUserPermissions } from '@/lib/middleware/role-check';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import Image from 'next/image';

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
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = useSafeSupabaseClient();

  useEffect(() => {
    if (supabase) {
      checkPermissionsAndLoadData();
    }
  }, [supabase]);

  const checkPermissionsAndLoadData = async () => {
    if (!supabase) return;
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
        // Set logo preview if logo_url exists
        if (org?.logo_url) {
          setLogoPreview(org.logo_url);
        }
      }
    } catch (err: any) {
      console.error('Error loading organization:', err);
      setError(err.message || 'Failed to load organization details');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, GIF, WebP, or SVG)');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo file must be less than 2MB');
      return;
    }

    setUploadingLogo(true);
    setError('');

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${organizationId}-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('organization-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('organization-assets')
        .getPublicUrl(filePath);

      // Update form data
      setFormData({ ...formData, logo_url: publicUrl });
      setLogoPreview(publicUrl);
      setSuccess('Logo uploaded successfully!');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Logo upload error:', err);
      setError(err.message || 'Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData({ ...formData, logo_url: '' });
    setLogoPreview(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
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
                  Website URL
                </label>
                <input
                  id="website_url"
                  name="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="https://www.yourbusiness.com.au (optional)"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Logo
                  </label>
                  <div className="space-y-3">
                    {/* Logo Preview */}
                    {logoPreview && (
                      <div className="relative inline-block">
                        <div className="w-32 h-32 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                          <Image
                            src={logoPreview}
                            alt="Business Logo"
                            width={128}
                            height={128}
                            className="object-contain w-full h-full"
                            unoptimized
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                          title="Remove logo"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                    
                    {/* Upload Button */}
                    <div>
                      <input
                        ref={logoInputRef}
                        id="logo_upload"
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="logo_upload"
                        className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${
                          uploadingLogo ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {uploadingLogo ? (
                          <>
                            <svg className="animate-spin w-5 h-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span className="text-sm text-gray-600">Uploading...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm text-gray-600">
                              {logoPreview ? 'Change Logo' : 'Upload Logo'}
                            </span>
                          </>
                        )}
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">JPEG, PNG, GIF, WebP, or SVG. Max 2MB. Used on invoices and quotes.</p>
                  </div>
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
