'use client';

import { useState, useEffect } from 'react';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { License, Profile } from '@/lib/types/database.types';
import { getUserPermissions } from '@/lib/middleware/role-check';
import { formatPrice, getLicenseTypeName, getLicensePrice } from '@/lib/services/stripe';
import Link from 'next/link';

export default function LicensesPage() {
  const supabase = useSafeSupabaseClient();
  const [licenses, setLicenses] = useState<(License & { profiles?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    checkPermissions();
    if (supabase) {
      fetchLicenses();
    }
  }, [supabase]);

  const checkPermissions = async () => {
    const permissions = await getUserPermissions();
    setCanManage(permissions?.canManageLicenses || false);
  };

  const fetchLicenses = async () => {
    if (!supabase) return;
    setLoading(true);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        setLoading(false);
        return;
      }
      
      if (!user) {
        console.log('No user found');
        setLoading(false);
        return;
      }

      console.log('🔵 Fetching profile for user:', user.id);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Profile error:', profileError);
        setLoading(false);
        return;
      }

      if (!profile?.organization_id) {
        console.log('⚠️ No organization_id found for user');
        setLoading(false);
        return;
      }

      console.log('🔵 Fetching licenses for org:', profile.organization_id);
      console.log('🔵 User role:', profile.role);
      
      // First try without the join to see if basic query works
      const { data: licensesData, error: licensesError } = await supabase
        .from('licenses')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (licensesError) {
        console.error('❌ Error fetching licenses (basic query):', {
          message: licensesError.message,
          details: licensesError.details,
          hint: licensesError.hint,
          code: licensesError.code,
        });
        setLoading(false);
        return;
      }

      console.log('✅ Basic licenses query successful:', licensesData?.length || 0);

      // Now try to fetch profile data for each license separately
      const licensesWithProfiles = await Promise.all(
        (licensesData || []).map(async (license: License) => {
          if (license.profile_id) {
            const { data: profileData, error: profileErr } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, phone')
              .eq('id', license.profile_id)
              .single();
            
            if (profileErr) {
              console.warn('⚠️ Could not fetch profile for license:', license.id, profileErr);
            }
            
            return {
              ...license,
              profiles: profileData || null,
            };
          }
          return { ...license, profiles: null };
        })
      );

      console.log('✅ Licenses with profiles:', licensesWithProfiles.length);
      setLicenses(licensesWithProfiles);
    } catch (err: any) {
      console.error('❌ Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLicense = async (license: License) => {
    if (license.profile_id) {
      alert('Please unassign the license before removing it.');
      return;
    }

    if (license.scheduled_for_removal) {
      alert('This license is already scheduled for removal.');
      return;
    }

    const removalDate = license.removal_date 
      ? new Date(license.removal_date).toLocaleDateString()
      : 'the end of the current billing period';

    const confirmMessage = `Remove this license?\n\n` +
      `The license will remain active until ${removalDate}.\n` +
      `Stripe will automatically calculate a pro-rata credit/refund.\n` +
      `After ${removalDate}, the license will be deactivated.\n\n` +
      `This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch('/api/licenses/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseId: license.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove license');
      }

      const result = await response.json();
      alert(`License scheduled for removal. It will remain active until ${new Date(result.removalDate).toLocaleDateString()}.`);
      fetchLicenses();
    } catch (err: any) {
      alert('Error removing license: ' + (err.message || 'Unknown error'));
    }
  };

  const handleUnassignLicense = async (license: License) => {
    if (confirm('Unassign this license? The user will lose access.')) {
      const { error: licenseError } = await supabase
        .from('licenses')
        .update({ 
          profile_id: null, 
          assigned_at: null 
        })
        .eq('id', license.id);

      if (licenseError) {
        alert('Error unassigning license: ' + licenseError.message);
        return;
      }

      // Update user's role
      if (license.profile_id) {
        await supabase
          .from('profiles')
          .update({ 
            role: null, 
            license_id: null 
          })
          .eq('id', license.profile_id);
      }

      fetchLicenses();
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
        <p className="text-gray-600">Only owners can manage licenses.</p>
      </div>
    );
  }

  const managementLicenses = licenses.filter(l => l.license_type === 'management');
  const fieldStaffLicenses = licenses.filter(l => l.license_type === 'field_staff');
  const ownerLicenses = licenses.filter(l => l.license_type === 'owner');

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">License Management</h1>
          <p className="text-gray-600 mt-2">Manage your team's access licenses</p>
        </div>
        <Link
          href="/licenses/add"
          className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          + Add License
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Owner Licenses</div>
          <div className="text-3xl font-bold text-gray-900">{ownerLicenses.length}</div>
          <div className="text-sm text-gray-500 mt-1">Included in base plan</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Management Licenses</div>
          <div className="text-3xl font-bold text-primary">{managementLicenses.length}</div>
          <div className="text-sm text-gray-500 mt-1">
            {formatPrice(PRICING.MANAGEMENT_LICENSE)}/mo each
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Field Staff Licenses</div>
          <div className="text-3xl font-bold text-green-600">{fieldStaffLicenses.length}</div>
          <div className="text-sm text-gray-500 mt-1">
            {formatPrice(PRICING.FIELD_STAFF_LICENSE)}/mo each
          </div>
        </div>
      </div>

      {/* Owner Licenses */}
      {ownerLicenses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Owner / License Manager</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ownerLicenses.map((license) => (
              <LicenseCard
                key={license.id}
                license={license}
                onUnassign={handleUnassignLicense}
                onRemove={handleRemoveLicense}
                canManage={false} // Owner licenses cannot be removed
              />
            ))}
          </div>
        </div>
      )}

      {/* Management Licenses */}
      {managementLicenses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Management Logins</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {managementLicenses.map((license) => (
              <LicenseCard
                key={license.id}
                license={license}
                onUnassign={handleUnassignLicense}
                onRemove={handleRemoveLicense}
                canManage={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Field Staff Licenses */}
      {fieldStaffLicenses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Field Staff Logins</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {fieldStaffLicenses.map((license) => (
              <LicenseCard
                key={license.id}
                license={license}
                onUnassign={handleUnassignLicense}
                onRemove={handleRemoveLicense}
                canManage={true}
              />
            ))}
          </div>
        </div>
      )}

      {licenses.length === 0 && (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">🎫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Licenses Yet</h2>
          <p className="text-gray-600 mb-6">
            Add licenses to give team members access to the system
          </p>
          <Link
            href="/licenses/add"
            className="inline-block bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            + Add Your First License
          </Link>
        </div>
      )}
    </div>
  );
}

// License Card Component
function LicenseCard({ 
  license, 
  onUnassign, 
  onRemove,
  canManage 
}: { 
  license: License & { profiles?: Profile };
  onUnassign: (license: License) => void;
  onRemove: (license: License) => void;
  canManage: boolean;
}) {
  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-800',
      management: 'bg-blue-100 text-blue-800',
      field_staff: 'bg-green-100 text-green-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getTypeColor(license.license_type)}`}>
              {getLicenseTypeName(license.license_type as any)}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(license.status)}`}>
              {license.status}
            </span>
          </div>
          
          {license.profiles ? (
            <div>
              <div className="font-semibold text-gray-900">
                {license.profiles.first_name || license.profiles.last_name
                  ? `${license.profiles.first_name} ${license.profiles.last_name}`
                  : 'User'}
              </div>
              <div className="text-sm text-gray-600">{license.profiles.phone || 'No phone'}</div>
              <div className="text-xs text-gray-500 mt-1">
                Assigned {new Date(license.assigned_at!).toLocaleDateString()}
              </div>
            </div>
          ) : (
            <div className="text-gray-500 italic">Unassigned</div>
          )}
          
          {license.scheduled_for_removal && (
            <div className="mt-2 text-xs text-orange-600 font-medium">
              Scheduled for removal: {license.removal_date ? new Date(license.removal_date).toLocaleDateString() : 'End of billing period'}
            </div>
          )}
        </div>

        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            {license.monthly_cost === 0 ? 'Included' : formatPrice(license.monthly_cost * 100)}
          </div>
          {license.monthly_cost > 0 && (
            <div className="text-sm text-gray-500">/month</div>
          )}
        </div>
      </div>

      {canManage && (
        <div className="flex gap-2 pt-4 border-t">
          {license.profile_id ? (
            <button
              onClick={() => onUnassign(license)}
              className="flex-1 text-orange-600 hover:text-orange-700 py-2 px-4 border border-orange-300 rounded-md text-sm font-medium transition-colors"
            >
              Unassign
            </button>
          ) : (
            <>
              <Link
                href={`/licenses/${license.id}/assign`}
                className="flex-1 text-center text-primary hover:text-primary-hover py-2 px-4 border border-primary rounded-md text-sm font-medium transition-colors"
              >
                Assign User
              </Link>
              <button
                onClick={() => onRemove(license)}
                className="text-red-600 hover:text-red-700 py-2 px-4 border border-red-300 rounded-md text-sm font-medium transition-colors"
              >
                Remove
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Import PRICING constant
const PRICING = {
  MANAGEMENT_LICENSE: 3500,
  FIELD_STAFF_LICENSE: 1500,
};
