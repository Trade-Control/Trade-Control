'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { License } from '@/lib/types/database.types';

export default function AssignLicensePage() {
  const params = useParams();
  const licenseId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [license, setLicense] = useState<License | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    fetchLicense();
  }, [licenseId]);

  const fetchLicense = async () => {
    const { data } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', licenseId)
      .single();

    if (data) {
      setLicense(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (!license) throw new Error('License not found');

      // Call the API route to handle license assignment
      const response = await fetch('/api/licenses/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseId: license.id,
          email,
          firstName,
          lastName,
          phone: phone || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to assign license');
      }

      if (result.isNewUser) {
        alert(
          `License assigned successfully!\n\nAn invitation has been set up for ${email}.\n\nThe user should use "Forgot Password" on the login page to set their password and gain access.`
        );
      } else {
        alert(`License assigned successfully! The user can now access the system with their assigned role.`);
      }
      
      router.push('/licenses');
    } catch (err: any) {
      console.error('Assignment error:', err);
      setError(err.message || 'Failed to assign license');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!license) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">License Not Found</h1>
      </div>
    );
  }

  const getLicenseTypeName = (type: string) => {
    const names: Record<string, string> = {
      owner: 'Owner / License Manager',
      management: 'Management Login',
      field_staff: 'Field Staff Login',
    };
    return names[type] || type;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Assign License</h1>
        <p className="text-gray-600 mt-2">
          Assign a {getLicenseTypeName(license.license_type)} license to a team member
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
        {/* License Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">License Details</h3>
          <div className="text-sm space-y-1">
            <p><span className="font-medium">Type:</span> {getLicenseTypeName(license.license_type)}</p>
            <p><span className="font-medium">Monthly Cost:</span> ${license.monthly_cost.toFixed(2)}</p>
            <p><span className="font-medium">Status:</span> {license.status}</p>
          </div>
        </div>

        {/* User Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <p className="text-sm text-gray-600 mt-1">
                If the user doesn't have an account, we'll create one. They'll need to use "Forgot Password" to set their password.
              </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="John"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="Doe"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number (optional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+61 400 000 000"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Role Description */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">What this user will be able to do:</h4>
          {license.license_type === 'owner' && (
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Full access to all features</li>
              <li>Manage licenses and subscriptions</li>
              <li>View and manage all jobs</li>
              <li>Manage business details</li>
            </ul>
          )}
          {license.license_type === 'management' && (
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Create and manage jobs</li>
              <li>Create quotes and invoices</li>
              <li>Assign contractors (if Operations Pro)</li>
              <li>View all organization data</li>
              <li>Cannot manage licenses or subscriptions</li>
            </ul>
          )}
          {license.license_type === 'field_staff' && (
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>View only assigned jobs</li>
              <li>Update job status and notes</li>
              <li>Upload photos to jobs</li>
              <li>Cannot access quotes or invoices</li>
              <li>Cannot view other jobs</li>
            </ul>
          )}
        </div>

        {/* Important Note */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>✅ No Onboarding Required:</strong> When you assign this license, the user will be set up under your business and won't need to go through the onboarding process. They can start using the system immediately with their assigned role.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-primary hover:bg-primary-hover text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? 'Assigning...' : 'Assign License'}
          </button>
        </div>
      </form>
    </div>
  );
}
