'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserPermissions } from '@/lib/middleware/role-check';

export default function ReportsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
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
    
    if (!permissions || !['owner', 'management'].includes(permissions.role || '')) {
      setLoading(false);
      return;
    }

    setUserRole(permissions.role);
  };

  const fetchReports = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) return;

      // Fetch comprehensive report data
      const [
        jobsData,
        quotesData,
        invoicesData,
        paymentsData,
        contractorsData,
        inventoryData,
      ] = await Promise.all([
        supabase
          .from('jobs')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .gte('created_at', dateFrom)
          .lte('created_at', dateTo + 'T23:59:59'),
        supabase
          .from('quotes')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .is('deleted_at', null)
          .gte('quote_date', dateFrom)
          .lte('quote_date', dateTo),
        supabase
          .from('invoices')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .is('deleted_at', null)
          .gte('invoice_date', dateFrom)
          .lte('invoice_date', dateTo),
        supabase
          .from('invoice_payments')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .gte('payment_date', dateFrom)
          .lte('payment_date', dateTo + 'T23:59:59'),
        supabase
          .from('contractors')
          .select('*')
          .eq('organization_id', profile.organization_id),
        supabase
          .from('inventory')
          .select('*')
          .eq('organization_id', profile.organization_id),
      ]);

      // Process data
      const jobs = jobsData.data || [];
      const quotes = quotesData.data || [];
      const invoices = invoicesData.data || [];
      const payments = paymentsData.data || [];
      const contractors = contractorsData.data || [];
      const inventory = inventoryData.data || [];

      // Calculate metrics
      const totalJobs = jobs.length;
      const completedJobs = jobs.filter(j => j.status === 'completed').length;
      const activeJobs = jobs.filter(j => j.status === 'in_progress').length;
      const quotedJobs = jobs.filter(j => j.status === 'quoted').length;

      const totalQuoted = quotes.reduce((sum, q) => sum + q.total_amount, 0);
      const acceptedQuotes = quotes.filter(q => q.status === 'accepted');
      const totalAcceptedQuotes = acceptedQuotes.reduce((sum, q) => sum + q.total_amount, 0);
      const quoteAcceptanceRate = quotes.length > 0 ? (acceptedQuotes.length / quotes.length * 100) : 0;

      const totalInvoiced = invoices.reduce((sum, i) => sum + i.total_amount, 0);
      const totalPaid = invoices.reduce((sum, i) => sum + i.amount_paid, 0);
      const totalOutstanding = totalInvoiced - totalPaid;
      const paidInvoices = invoices.filter(i => i.status === 'paid').length;
      const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;

      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
      const avgPaymentSize = payments.length > 0 ? totalPayments / payments.length : 0;

      const avgJobValue = completedJobs > 0
        ? invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_amount, 0) / paidInvoices
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
        return sum + (item.quantity * (item.unit_cost || 0));
      }, 0);

      const lowStockItems = inventory.filter(item => {
        return item.reorder_level !== null && item.quantity <= item.reorder_level;
      }).length;

      // Revenue by status
      const revenueByStatus = {
        draft: invoices.filter(i => i.status === 'draft').reduce((s, i) => s + i.total_amount, 0),
        sent: invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total_amount, 0),
        paid: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0),
        overdue: invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total_amount, 0),
      };

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
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading reports...</div>
      </div>
    );
  }

  if (!userRole || !['owner', 'management'].includes(userRole)) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Management Access Required</h1>
        <p className="text-gray-600">
          Reports are only available to owners and management users.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Business Reports</h1>
        <p className="text-gray-600 mt-2">Comprehensive analytics and insights</p>
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
        </div>
      </div>

      {reportData && (
        <div className="space-y-6">
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

          {/* Jobs Overview */}
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

          {/* Quotes Performance */}
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
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Total Payments</div>
                <div className="text-3xl font-bold text-primary">{reportData.payments.total}</div>
                <div className="text-sm text-gray-500 mt-1">
                  Avg: ${reportData.payments.avgPaymentSize.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Contractors & Inventory */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">👷 Operations</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Total Contractors</div>
                <div className="text-3xl font-bold text-gray-900">{reportData.contractors.total}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Compliance Rate</div>
                <div className="text-3xl font-bold text-green-600">{reportData.contractors.complianceRate}%</div>
              </div>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
