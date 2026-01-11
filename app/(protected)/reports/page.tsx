'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserPermissions } from '@/lib/middleware/role-check';

interface ReportData {
  jobs: {
    total: number;
    completed: number;
    active: number;
    quoted: number;
    avgCompletionDays: string;
  };
  quotes?: {
    total: number;
    totalValue: number;
    accepted: number;
    acceptedValue: number;
    acceptanceRate: string;
  };
  invoices?: {
    total: number;
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    paid: number;
    overdue: number;
    avgJobValue: number;
    revenueByStatus: {
      draft: number;
      sent: number;
      paid: number;
      overdue: number;
    };
  };
  payments?: {
    total: number;
    totalAmount: number;
    avgPaymentSize: number;
  };
  contractors?: {
    total: number;
    compliant: number;
    complianceRate: string;
  };
  inventory?: {
    totalItems: number;
    totalValue: number;
    lowStock: number;
  };
  timesheets?: {
    totalHours: number;
    totalEntries: number;
    avgHoursPerEntry: string;
  };
}

export default function ReportsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [assignedJobIds, setAssignedJobIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    checkPermissionsAndFetch();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchReports();
    }
  }, [dateFrom, dateTo, userRole]);

  const checkPermissionsAndFetch = async () => {
    const permissions = await getUserPermissions();
    
    if (!permissions || !permissions.role) {
      setLoading(false);
      return;
    }

    setUserRole(permissions.role);
    
    // Get assigned job IDs for field staff
    if (permissions.role === 'field_staff') {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('assigned_job_ids')
          .eq('id', user.id)
          .single();
        
        if (profile?.assigned_job_ids) {
          setAssignedJobIds(profile.assigned_job_ids);
        }
      }
    }
  };

  const fetchReports = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, assigned_job_ids')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) return;

      const isFieldStaff = userRole === 'field_staff';
      const jobIds = profile.assigned_job_ids || [];

      if (isFieldStaff) {
        // Field staff: fetch only their assigned jobs data
        await fetchFieldStaffReports(profile.organization_id, jobIds);
      } else {
        // Management/Owner: fetch full organization data
        await fetchFullReports(profile.organization_id);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFieldStaffReports = async (orgId: string, jobIds: string[]) => {
    if (jobIds.length === 0) {
      setReportData({
        jobs: { total: 0, completed: 0, active: 0, quoted: 0, avgCompletionDays: '0' },
        timesheets: { totalHours: 0, totalEntries: 0, avgHoursPerEntry: '0' },
      });
      return;
    }

    const [jobsData, timesheetsData] = await Promise.all([
      supabase
        .from('jobs')
        .select('*')
        .eq('organization_id', orgId)
        .in('id', jobIds)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59'),
      supabase
        .from('timesheets')
        .select('*')
        .in('job_id', jobIds)
        .gte('clock_in', dateFrom)
        .lte('clock_in', dateTo + 'T23:59:59'),
    ]);

    const jobs = jobsData.data || [];
    const timesheets = timesheetsData.data || [];

    // Calculate job metrics
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    const activeJobs = jobs.filter(j => j.status === 'in_progress').length;
    const quotedJobs = jobs.filter(j => j.status === 'quoted').length;

    const jobsWithDates = jobs.filter(j => j.start_date && j.completed_at);
    const avgCompletionDays = jobsWithDates.length > 0
      ? jobsWithDates.reduce((sum, j) => {
          const start = new Date(j.start_date!);
          const end = new Date(j.completed_at!);
          return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / jobsWithDates.length
      : 0;

    // Calculate timesheet metrics
    const totalHours = timesheets.reduce((sum, t) => {
      if (t.clock_in && t.clock_out) {
        const clockIn = new Date(t.clock_in);
        const clockOut = new Date(t.clock_out);
        return sum + (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
      }
      return sum;
    }, 0);

    const totalEntries = timesheets.length;
    const avgHoursPerEntry = totalEntries > 0 ? totalHours / totalEntries : 0;

    setReportData({
      jobs: {
        total: totalJobs,
        completed: completedJobs,
        active: activeJobs,
        quoted: quotedJobs,
        avgCompletionDays: avgCompletionDays.toFixed(1),
      },
      timesheets: {
        totalHours: Math.round(totalHours * 10) / 10,
        totalEntries,
        avgHoursPerEntry: avgHoursPerEntry.toFixed(1),
      },
    });
  };

  const fetchFullReports = async (orgId: string) => {
    // Fetch comprehensive report data for management/owners
    const [
      jobsData,
      quotesData,
      invoicesData,
      paymentsData,
      contractorsData,
      inventoryData,
      timesheetsData,
    ] = await Promise.all([
      supabase
        .from('jobs')
        .select('*')
        .eq('organization_id', orgId)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59'),
      supabase
        .from('quotes')
        .select('*')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .gte('quote_date', dateFrom)
        .lte('quote_date', dateTo),
      supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .gte('invoice_date', dateFrom)
        .lte('invoice_date', dateTo),
      supabase
        .from('invoice_payments')
        .select('*')
        .eq('organization_id', orgId)
        .gte('payment_date', dateFrom)
        .lte('payment_date', dateTo + 'T23:59:59'),
      supabase
        .from('contractors')
        .select('*')
        .eq('organization_id', orgId),
      supabase
        .from('inventory')
        .select('*')
        .eq('organization_id', orgId),
      supabase
        .from('timesheets')
        .select('*')
        .eq('organization_id', orgId)
        .gte('clock_in', dateFrom)
        .lte('clock_in', dateTo + 'T23:59:59'),
    ]);

    // Process data
    const jobs = jobsData.data || [];
    const quotes = quotesData.data || [];
    const invoices = invoicesData.data || [];
    const payments = paymentsData.data || [];
    const contractors = contractorsData.data || [];
    const inventory = inventoryData.data || [];
    const timesheets = timesheetsData.data || [];

    // Calculate metrics
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    const activeJobs = jobs.filter(j => j.status === 'in_progress').length;
    const quotedJobs = jobs.filter(j => j.status === 'quoted').length;

    const totalQuoted = quotes.reduce((sum, q) => sum + (q.total_amount || 0), 0);
    const acceptedQuotes = quotes.filter(q => q.status === 'accepted');
    const totalAcceptedQuotes = acceptedQuotes.reduce((sum, q) => sum + (q.total_amount || 0), 0);
    const quoteAcceptanceRate = quotes.length > 0 ? (acceptedQuotes.length / quotes.length * 100) : 0;

    const totalInvoiced = invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
    const totalPaid = invoices.reduce((sum, i) => sum + (i.amount_paid || 0), 0);
    const totalOutstanding = totalInvoiced - totalPaid;
    const paidInvoices = invoices.filter(i => i.status === 'paid').length;
    const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;

    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const avgPaymentSize = payments.length > 0 ? totalPayments / payments.length : 0;

    const avgJobValue = paidInvoices > 0
      ? invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0) / paidInvoices
      : 0;

    // Job completion rate
    const jobsWithDates = jobs.filter(j => j.start_date && j.completed_at);
    const avgCompletionDays = jobsWithDates.length > 0
      ? jobsWithDates.reduce((sum, j) => {
          const start = new Date(j.start_date!);
          const end = new Date(j.completed_at!);
          return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / jobsWithDates.length
      : 0;

    // Contractor compliance
    const compliantContractors = contractors.filter(c => {
      if (c.status === 'blocked') return false;
      if (c.insurance_expiry && new Date(c.insurance_expiry) < new Date()) return false;
      if (c.license_expiry && new Date(c.license_expiry) < new Date()) return false;
      return true;
    }).length;

    const complianceRate = contractors.length > 0
      ? (compliantContractors / contractors.length * 100)
      : 100;

    // Inventory value
    const totalInventoryValue = inventory.reduce((sum, item) => {
      return sum + ((item.quantity || 0) * (item.unit_cost || 0));
    }, 0);

    const lowStockItems = inventory.filter(item => {
      return item.reorder_level !== null && item.quantity <= item.reorder_level;
    }).length;

    // Revenue by status
    const revenueByStatus = {
      draft: invoices.filter(i => i.status === 'draft').reduce((s, i) => s + (i.total_amount || 0), 0),
      sent: invoices.filter(i => i.status === 'sent').reduce((s, i) => s + (i.total_amount || 0), 0),
      paid: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total_amount || 0), 0),
      overdue: invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total_amount || 0), 0),
    };

    // Timesheet metrics
    const totalHours = timesheets.reduce((sum, t) => {
      if (t.clock_in && t.clock_out) {
        const clockIn = new Date(t.clock_in);
        const clockOut = new Date(t.clock_out);
        return sum + (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
      }
      return sum;
    }, 0);

    const totalEntries = timesheets.length;
    const avgHoursPerEntry = totalEntries > 0 ? totalHours / totalEntries : 0;

    setReportData({
      jobs: {
        total: totalJobs,
        completed: completedJobs,
        active: activeJobs,
        quoted: quotedJobs,
        avgCompletionDays: avgCompletionDays.toFixed(1),
      },
      quotes: {
        total: quotes.length,
        totalValue: totalQuoted,
        accepted: acceptedQuotes.length,
        acceptedValue: totalAcceptedQuotes,
        acceptanceRate: quoteAcceptanceRate.toFixed(1),
      },
      invoices: {
        total: invoices.length,
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        paid: paidInvoices,
        overdue: overdueInvoices,
        avgJobValue,
        revenueByStatus,
      },
      payments: {
        total: payments.length,
        totalAmount: totalPayments,
        avgPaymentSize,
      },
      contractors: {
        total: contractors.length,
        compliant: compliantContractors,
        complianceRate: complianceRate.toFixed(1),
      },
      inventory: {
        totalItems: inventory.length,
        totalValue: totalInventoryValue,
        lowStock: lowStockItems,
      },
      timesheets: {
        totalHours: Math.round(totalHours * 10) / 10,
        totalEntries,
        avgHoursPerEntry: avgHoursPerEntry.toFixed(1),
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading reports...</div>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <p className="text-gray-600">
          You don't have permission to view reports.
        </p>
      </div>
    );
  }

  const isFieldStaff = userRole === 'field_staff';
  const isManagement = userRole === 'management' || userRole === 'owner';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {isFieldStaff ? 'My Job Reports' : 'Business Reports'}
        </h1>
        <p className="text-gray-600 mt-2">
          {isFieldStaff 
            ? 'Performance analytics for your assigned jobs'
            : 'Comprehensive analytics and insights'}
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button
            onClick={() => {
              const date = new Date();
              date.setMonth(date.getMonth() - 1);
              setDateFrom(date.toISOString().split('T')[0]);
              setDateTo(new Date().toISOString().split('T')[0]);
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => {
              const now = new Date();
              const startOfYear = new Date(now.getFullYear(), 0, 1);
              setDateFrom(startOfYear.toISOString().split('T')[0]);
              setDateTo(now.toISOString().split('T')[0]);
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
          >
            Year to Date
          </button>
        </div>
      </div>

      {reportData && (
        <div className="space-y-6">
          {/* Jobs Overview - All Users */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Jobs Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Total Jobs</div>
                <div className="text-3xl font-bold text-gray-900">{reportData.jobs.total}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Completed</div>
                <div className="text-3xl font-bold text-green-600">{reportData.jobs.completed}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Active</div>
                <div className="text-3xl font-bold text-blue-600">{reportData.jobs.active}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Avg Completion Days</div>
                <div className="text-3xl font-bold text-primary">{reportData.jobs.avgCompletionDays}</div>
              </div>
            </div>
          </div>

          {/* Timesheet Summary - All Users */}
          {reportData.timesheets && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">⏱️ Timesheet Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm text-gray-600 mb-1">Total Hours Logged</div>
                  <div className="text-3xl font-bold text-gray-900">{reportData.timesheets.totalHours}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm text-gray-600 mb-1">Timesheet Entries</div>
                  <div className="text-3xl font-bold text-blue-600">{reportData.timesheets.totalEntries}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm text-gray-600 mb-1">Avg Hours Per Entry</div>
                  <div className="text-3xl font-bold text-primary">{reportData.timesheets.avgHoursPerEntry}</div>
                </div>
              </div>
            </div>
          )}

          {/* Management/Owner Only Sections */}
          {isManagement && reportData.invoices && (
            <>
              {/* Financial Overview */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 Financial Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-600 mb-1">Total Invoiced</div>
                    <div className="text-3xl font-bold text-gray-900">
                      ${reportData.invoices.totalInvoiced.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-600 mb-1">Total Paid</div>
                    <div className="text-3xl font-bold text-green-600">
                      ${reportData.invoices.totalPaid.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-600 mb-1">Outstanding</div>
                    <div className="text-3xl font-bold text-orange-600">
                      ${reportData.invoices.totalOutstanding.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-600 mb-1">Avg Job Value</div>
                    <div className="text-3xl font-bold text-primary">
                      ${reportData.invoices.avgJobValue.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quotes Performance */}
              {reportData.quotes && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">📄 Quotes Performance</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="text-sm text-gray-600 mb-1">Quotes Sent</div>
                      <div className="text-3xl font-bold text-gray-900">{reportData.quotes.total}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        ${reportData.quotes.totalValue.toFixed(2)} total
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="text-sm text-gray-600 mb-1">Quotes Accepted</div>
                      <div className="text-3xl font-bold text-green-600">{reportData.quotes.accepted}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        ${reportData.quotes.acceptedValue.toFixed(2)} value
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="text-sm text-gray-600 mb-1">Acceptance Rate</div>
                      <div className="text-3xl font-bold text-primary">{reportData.quotes.acceptanceRate}%</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Invoices & Payments */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">🧾 Invoices & Payments</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-600 mb-1">Total Invoices</div>
                    <div className="text-3xl font-bold text-gray-900">{reportData.invoices.total}</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-600 mb-1">Paid Invoices</div>
                    <div className="text-3xl font-bold text-green-600">{reportData.invoices.paid}</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-600 mb-1">Overdue Invoices</div>
                    <div className="text-3xl font-bold text-red-600">{reportData.invoices.overdue}</div>
                  </div>
                  {reportData.payments && (
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="text-sm text-gray-600 mb-1">Total Payments</div>
                      <div className="text-3xl font-bold text-primary">{reportData.payments.total}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Avg: ${reportData.payments.avgPaymentSize.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Contractors & Inventory */}
              {(reportData.contractors || reportData.inventory) && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">👷 Operations</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {reportData.contractors && (
                      <>
                        <div className="bg-white rounded-lg shadow p-6">
                          <div className="text-sm text-gray-600 mb-1">Total Contractors</div>
                          <div className="text-3xl font-bold text-gray-900">{reportData.contractors.total}</div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                          <div className="text-sm text-gray-600 mb-1">Compliance Rate</div>
                          <div className="text-3xl font-bold text-green-600">{reportData.contractors.complianceRate}%</div>
                        </div>
                      </>
                    )}
                    {reportData.inventory && (
                      <>
                        <div className="bg-white rounded-lg shadow p-6">
                          <div className="text-sm text-gray-600 mb-1">Inventory Value</div>
                          <div className="text-3xl font-bold text-primary">
                            ${reportData.inventory.totalValue.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {reportData.inventory.totalItems} items
                          </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                          <div className="text-sm text-gray-600 mb-1">Low Stock Items</div>
                          <div className="text-3xl font-bold text-orange-600">{reportData.inventory.lowStock}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Field Staff Note */}
      {isFieldStaff && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-800">Field Staff Reports</h3>
              <p className="text-sm text-blue-700 mt-1">
                These reports show data only for jobs assigned to you. Contact management for full business reports.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
