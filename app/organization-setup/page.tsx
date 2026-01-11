'use client';

import { useState, useEffect } from 'react';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { useRouter } from 'next/navigation';

export default function OrganizationSetupPage() {
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
  const [loading, setLoading] = useState(false);
  const [checkingOrg, setCheckingOrg] = useState(true);
  const router = useRouter();
  const supabase = useSafeSupabaseClient();

  useEffect(() => {
    if (!supabase) return;
    
    const checkExistingOrg = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }

        // Check if user already has an organisation
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profile?.organization_id) {
          // User already has an organisation, redirect to dashboard
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error checking organisation:', error);
      } finally {
        setCheckingOrg(false);
      }
    };

    checkExistingOrg();
  }, [router, supabase]);

  // Show error if Supabase client couldn't be created
  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-red-600">Configuration error. Please check your environment variables.</p>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!supabase) {
      setError('Configuration error. Please refresh the page.');
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      console.log('User authenticated:', user.id);

      // First, verify the profile exists
      const { data: profile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id, organization_id')
        .eq('id', user.id)
        .single();

      console.log('Profile check result:', profile, profileCheckError);

      if (profileCheckError) {
        // Profile doesn't exist, create it first
        console.log('Creating profile...');
        const { error: profileCreateError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
          }]);
        
        if (profileCreateError) {
          console.error('Profile creation error:', profileCreateError);
          throw new Error(`Failed to create profile: ${profileCreateError.message}`);
        }
      }

      // Create organisation with created_by field
      console.log('Creating organisation...');
      const { data: organisation, error: orgError } = await supabase
        .from('organizations')
        .insert([{
          ...formData,
          created_by: user.id,
        }])
        .select()
        .single();

      console.log('Organisation creation result:', organisation, orgError);

      if (orgError) {
        console.error('Organisation error:', orgError);
        throw new Error(`Failed to create organisation: ${orgError.message}`);
      }

      // Update user profile with organisation_id
      console.log('Updating profile with organisation_id...');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: organisation.id })
        .eq('id', user.id);

      console.log('Profile update result:', profileError);

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw new Error(`Failed to link organisation to profile: ${profileError.message}`);
      }

      console.log('Organisation setup complete!');
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Organisation setup error:', error);
      setError(error.message || 'Failed to set up organisation');
    } finally {
      setLoading(false);
    }
  };

  if (checkingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Organisation Setup</h1>
          <p className="text-gray-600">Please provide your business details to continue</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-gray-900"
                  placeholder="Your business name"
                />
              </div>

              <div>
                <label htmlFor="abn" className="block text-sm font-semibold text-gray-700 mb-2">
                  ABN
                </label>
                <input
                  id="abn"
                  name="abn"
                  type="text"
                  value={formData.abn}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-gray-900"
                  placeholder="12 345 678 901"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-gray-900"
                  placeholder="04XX XXX XXX"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-gray-900"
                  placeholder="business@example.com"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
                  Street Address
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-gray-900"
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-2">
                  City/Suburb
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-gray-900"
                  placeholder="Sydney"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-semibold text-gray-700 mb-2">
                  State
                </label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-gray-900"
                  placeholder="NSW"
                />
              </div>

              <div>
                <label htmlFor="postcode" className="block text-sm font-semibold text-gray-700 mb-2">
                  Postcode
                </label>
                <input
                  id="postcode"
                  name="postcode"
                  type="text"
                  value={formData.postcode}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-gray-900"
                  placeholder="2000"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? 'Setting up...' : 'Complete Setup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
