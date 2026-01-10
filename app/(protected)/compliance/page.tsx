'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Contractor } from '@/lib/types/database.types';
import { hasOperationsPro } from '@/lib/middleware/role-check';
import { sendEmail, generateComplianceReminderEmail } from '@/lib/services/resend-mock';
import Link from 'next/link';

export default function CompliancePage() {
  const supabase = createClient();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasProAccess, setHasProAccess] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

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

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const isExpiringSoon = (date: string | null, days: number = 30) => {
    if (!date) return false;
    const expiry = new Date(date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= days;
  };

  const expiredContractors = contractors.filter(c =>
    isExpired(c.insurance_expiry) || isExpired(c.license_expiry)
  );

  const expiringSoon30 = contractors.filter(c =>
    (isExpiringSoon(c.insurance_expiry, 30) || isExpiringSoon(c.license_expiry, 30)) &&
    !isExpired(c.insurance_expiry) && !isExpired(c.license_expiry)
  );

  const expiringSoon60 = contractors.filter(c =>
    (isExpiringSoon(c.insurance_expiry, 60) || isExpiringSoon(c.license_expiry, 60)) &&
    !isExpiringSoon(c.insurance_expiry, 30) && !isExpiringSoon(c.license_expiry, 30) &&
    !isExpired(c.insurance_expiry) && !isExpired(c.license_expiry)
  );

  const blockedContractors = contractors.filter(c => c.status === 'blocked');
  const flaggedContractors = contractors.filter(c => c.status === 'flagged');

  const handleSendReminders = async () => {
    setSendingReminders(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) return;

    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
      .single();

    // Send reminders to contractors expiring in next 30 days
    for (const contractor of expiringSoon30) {
      const expiringItems = [];
      
      if (isExpiringSoon(contractor.insurance_expiry, 30)) {
        expiringItems.push({
          type: 'Insurance',
          expiryDate: contractor.insurance_expiry!,
        });
      }
      
      if (isExpiringSoon(contractor.license_expiry, 30)) {
        expiringItems.push({
          type: 'License',
          expiryDate: contractor.license_expiry!,
        });
      }

      if (expiringItems.length > 0) {
        const emailTemplate = generateComplianceReminderEmail({
          contractorName: contractor.contractor_name,
          companyName: org?.name || 'Trade Control',
          expiringItems,
        });

        await sendEmail({
          to: contractor.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        });

        // Log email
        await supabase.from('email_communications').insert({
          organization_id: profile.organization_id,
          contractor_id: contractor.id,
          email_type: 'reminder',
          recipient_email: contractor.email,
          subject: emailTemplate.subject,
          body: emailTemplate.html,
          status: 'sent',
        });
      }
    }

    setSendingReminders(false);
    alert(`Sent compliance reminders to ${expiringSoon30.length} contractors`);
  };

  if (!hasProAccess) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Operations Pro Required</h1>
        <p className="text-gray-600 mb-6">
          Compliance Shield is available with Operations Pro subscription.
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
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Shield</h1>
          <p className="text-gray-600 mt-2">Monitor and manage contractor compliance</p>
        </div>
        <button
          onClick={handleSendReminders}
          disabled={sendingReminders || expiringSoon30.length === 0}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {sendingReminders ? 'Sending...' : `Send Reminders (${expiringSoon30.length})`}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg shadow p-6">
          <div className="text-sm text-red-600 mb-1 font-medium">Expired</div>
          <div className="text-4xl font-bold text-red-600">{expiredContractors.length}</div>
          <div className="text-sm text-red-700 mt-1">Immediate action required</div>
        </div>

        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg shadow p-6">
          <div className="text-sm text-orange-600 mb-1 font-medium">Expiring (30 days)</div>
          <div className="text-4xl font-bold text-orange-600">{expiringSoon30.length}</div>
          <div className="text-sm text-orange-700 mt-1">Send reminders</div>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg shadow p-6">
          <div className="text-sm text-yellow-600 mb-1 font-medium">Expiring (60 days)</div>
          <div className="text-4xl font-bold text-yellow-600">{expiringSoon60.length}</div>
          <div className="text-sm text-yellow-700 mt-1">Monitor closely</div>
        </div>

        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1 font-medium">Blocked/Flagged</div>
          <div className="text-4xl font-bold text-gray-900">{blockedContractors.length + flaggedContractors.length}</div>
          <div className="text-sm text-gray-700 mt-1">Review status</div>
        </div>
      </div>

      {/* Expired Contractors */}
      {expiredContractors.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">❌ Expired Credentials</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-red-50 border-b border-red-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-red-900">Contractor</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-red-900">Expired Item</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-red-900">Expiry Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-red-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expiredContractors.map((contractor) => (
                  <tr key={contractor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{contractor.contractor_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {isExpired(contractor.insurance_expiry) && <div>Insurance</div>}
                      {isExpired(contractor.license_expiry) && <div>License</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600 font-medium">
                      {isExpired(contractor.insurance_expiry) && contractor.insurance_expiry && (
                        <div>{new Date(contractor.insurance_expiry).toLocaleDateString()}</div>
                      )}
                      {isExpired(contractor.license_expiry) && contractor.license_expiry && (
                        <div>{new Date(contractor.license_expiry).toLocaleDateString()}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/contractors/${contractor.id}`}
                        className="text-primary hover:text-primary-hover font-medium"
                      >
                        Update →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expiring Soon (30 days) */}
      {expiringSoon30.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-orange-600 mb-4">⚠️ Expiring in 30 Days</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-orange-50 border-b border-orange-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-orange-900">Contractor</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-orange-900">Expiring Item</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-orange-900">Days Until Expiry</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-orange-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expiringSoon30.map((contractor) => {
                  const insuranceDays = contractor.insurance_expiry
                    ? Math.ceil((new Date(contractor.insurance_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  const licenseDays = contractor.license_expiry
                    ? Math.ceil((new Date(contractor.license_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    : null;

                  return (
                    <tr key={contractor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{contractor.contractor_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {insuranceDays && insuranceDays <= 30 && <div>Insurance</div>}
                        {licenseDays && licenseDays <= 30 && <div>License</div>}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-orange-600">
                        {insuranceDays && insuranceDays <= 30 && <div>{insuranceDays} days</div>}
                        {licenseDays && licenseDays <= 30 && <div>{licenseDays} days</div>}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/contractors/${contractor.id}`}
                          className="text-primary hover:text-primary-hover font-medium"
                        >
                          Update →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {expiredContractors.length === 0 && expiringSoon30.length === 0 && expiringSoon60.length === 0 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-900 mb-4">All Compliant!</h2>
          <p className="text-green-700">
            All contractors have valid credentials. Great work!
          </p>
        </div>
      )}
    </div>
  );
}
