'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import AddressAutocomplete from '@/components/AddressAutocomplete';

type Step = 'business' | 'complete';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useSafeSupabaseClient();
  
  const [step, setStep] = useState<Step>('business');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Business details
  const [businessData, setBusinessData] = useState({
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
  
  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    // Load existing organization data and pre-populate user info
    if (supabase) {
      loadOrganizationAndUserData();
    }
  }, [supabase]);

  const loadOrganizationAndUserData = async () => {
    if (!supabase) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Load profile data to pre-populate owner info
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone, organization_id')
      .eq('id', user.id)
      .single();

    if (profile?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (org) {
        setBusinessData({
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
    }
  };

  const uploadLogo = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('organization-logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('organization-logos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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

      // Upload logo if provided
      let logoUrl = businessData.logo_url;
      if (logoFile) {
        setUploadingLogo(true);
        try {
          logoUrl = await uploadLogo(logoFile);
        } catch (uploadErr: any) {
          console.error('Logo upload error:', uploadErr);
          setError('Failed to upload logo. Please try again.');
          setLoading(false);
          setUploadingLogo(false);
          return;
        }
        setUploadingLogo(false);
      }

      // Update organization
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          ...businessData,
          logo_url: logoUrl
        })
        .eq('id', profile.organization_id);

      if (updateError) throw updateError;

      // Mark onboarding as complete
      await supabase
        .from('organizations')
        .update({ onboarding_completed: true })
        .eq('id', profile.organization_id);

      setStep('complete');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${step === 'business' ? 'text-primary' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step !== 'business' ? 'bg-primary text-white' : 'bg-white border-2 border-primary'
              }`}>
                {step !== 'business' ? '✓' : '1'}
              </div>
              <span className="ml-2 font-medium">Business Details</span>
            </div>
            
            <div className="w-16 h-1 bg-gray-300"></div>
            
            <div className={`flex items-center ${step === 'complete' ? 'text-primary' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step === 'complete' ? 'bg-primary text-white' : 'bg-white border-2 border-gray-300'
              }`}>
                {step === 'complete' ? '✓' : '2'}
              </div>
              <span className="ml-2 font-medium">Complete</span>
            </div>
          </div>
        </div>

        {/* Business Details Step */}
        {step === 'business' && (
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Business Details</h2>
            <p className="text-gray-600 mb-6">Let's set up your business information</p>

            <form onSubmit={handleBusinessSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={businessData.name}
                  onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Your Business Pty Ltd"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trading Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={businessData.trading_name}
                  onChange={(e) => setBusinessData({ ...businessData, trading_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Your Trading Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ABN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={businessData.abn}
                    onChange={(e) => setBusinessData({ ...businessData, abn: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="12 345 678 901"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={businessData.gst_registered ? 'true' : 'false'}
                    onChange={(e) => setBusinessData({ ...businessData, gst_registered: e.target.value === 'true' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="true">GST Registered</option>
                    <option value="false">Not GST Registered</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={businessData.phone}
                    onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="+61 2 1234 5678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={businessData.email}
                    onChange={(e) => setBusinessData({ ...businessData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="info@business.com.au"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Billing Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={businessData.billing_email}
                  onChange={(e) => setBusinessData({ ...businessData, billing_email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="billing@business.com.au"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  value={businessData.website_url}
                  onChange={(e) => setBusinessData({ ...businessData, website_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="https://www.yourbusiness.com.au (optional)"
                />
              </div>

              <AddressAutocomplete
                label="Business Physical/Registered Address"
                required
                value={businessData.address}
                onChange={(value) => setBusinessData({ ...businessData, address: value })}
                onAddressSelect={(components) => {
                  setBusinessData({
                    ...businessData,
                    address: components.address,
                    city: components.city,
                    state: components.state,
                    postcode: components.postcode,
                  });
                }}
                placeholder="Start typing your address..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={businessData.city}
                    onChange={(e) => setBusinessData({ ...businessData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={businessData.state}
                    onChange={(e) => setBusinessData({ ...businessData, state: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postcode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={businessData.postcode}
                    onChange={(e) => setBusinessData({ ...businessData, postcode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Branding & Prefixes</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                    <p className="text-xs text-gray-500 mt-1">Upload your logo (optional, max 5MB)</p>
                    {logoPreview && (
                      <div className="mt-2">
                        <img 
                          src={logoPreview} 
                          alt="Logo preview" 
                          className="h-20 w-auto border border-gray-300 rounded"
                        />
                      </div>
                    )}
                    {uploadingLogo && (
                      <p className="text-xs text-primary mt-1">Uploading logo...</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand Colour <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        required
                        value={businessData.brand_color}
                        onChange={(e) => setBusinessData({ ...businessData, brand_color: e.target.value })}
                        className="h-10 w-20 border border-gray-300 rounded-md cursor-pointer"
                      />
                      <input
                        type="text"
                        required
                        value={businessData.brand_color}
                        onChange={(e) => setBusinessData({ ...businessData, brand_color: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder="#2563eb"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Used for invoices and quotes</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Code Prefix <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={businessData.job_code_prefix}
                      onChange={(e) => setBusinessData({ ...businessData, job_code_prefix: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="JOB"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quote Prefix <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={businessData.quote_prefix}
                      onChange={(e) => setBusinessData({ ...businessData, quote_prefix: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="QT"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invoice Prefix <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={businessData.invoice_prefix}
                      onChange={(e) => setBusinessData({ ...businessData, invoice_prefix: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="INV"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={businessData.payment_details}
                  onChange={(e) => setBusinessData({ ...businessData, payment_details: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={3}
                  placeholder="BSB: 123-456&#10;Account: 12345678&#10;Account Name: Your Business Pty Ltd"
                />
                <p className="text-xs text-gray-500 mt-1">This will appear on invoices</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || uploadingLogo}
                className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : uploadingLogo ? 'Uploading logo...' : 'Complete Setup'}
              </button>
            </form>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-4">All Set!</h2>
            <p className="text-gray-600 mb-8">
              Your account is ready. You can now start managing your jobs and team.
            </p>

            <button
              onClick={handleComplete}
              className="bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
