'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import InvoiceGenerator from '@/components/jobs/InvoiceGenerator';
import { sendEmail, generateInvoiceEmail } from '@/lib/services/resend-mock';

export default function InvoicesPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [invoices, setInvoices] = useState<any[]>([]);
  const [acceptedQuotes, setAcceptedQuotes] = useState<any[]>([]);
  const [job, setJob] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [jobId]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch job details
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*, contacts(*)')
      .eq('id', jobId)
      .single();
    
    if (jobData) setJob(jobData);

    // Fetch invoices
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    
    if (invoicesData) setInvoices(invoicesData);

    // Fetch accepted quotes that don't have invoices yet
    const { data: quotesData } = await supabase
      .from('quotes')
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'accepted');
    
    if (quotesData) {
      // Filter out quotes that already have invoices
      const quotesWithoutInvoices = quotesData.filter(
        q => !invoicesData?.some(inv => inv.quote_id === q.id)
      );
      setAcceptedQuotes(quotesWithoutInvoices);
    }
    
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-300 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleEmailInvoice = async (invoice: any) => {
    const contact = job?.contacts;
    if (!contact?.email) {
      alert('Client email not found. Please add an email to the contact.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('Organization not found');

      // Fetch organization details
      const { data: org } = await supabase
        .from('organizations')
        .select('name, email')
        .eq('id', profile.organization_id)
        .single();

      // Generate email using Resend template
      const viewUrl = `${window.location.origin}/jobs/${jobId}/invoices/${invoice.id}/view`;
      const emailTemplate = generateInvoiceEmail({
        clientName: contact.contact_name || contact.company_name || 'Valued Customer',
        invoiceNumber: invoice.invoice_number,
        jobTitle: job.title,
        subtotal: invoice.subtotal,
        gstAmount: invoice.gst_amount,
        totalAmount: invoice.total_amount,
        amountPaid: invoice.amount_paid,
        dueDate: invoice.due_date,
        companyName: org?.name || 'Trade Control',
        companyEmail: org?.email || 'noreply@tradecontrol.app',
        viewUrl: viewUrl,
      });

      // Send email via Resend
      const emailResult = await sendEmail({
        to: contact.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });

      // Log email to database
      await supabase.from('email_communications').insert({
        organization_id: profile.organization_id,
        job_id: jobId,
        contractor_id: null,
        email_type: 'invoice',
        recipient_email: contact.email,
        subject: emailTemplate.subject,
        body: emailTemplate.html,
        resend_message_id: emailResult.id,
        status: 'sent',
      });

      // Create activity feed entry
      await supabase.from('activity_feed').insert({
        organization_id: profile.organization_id,
        job_id: jobId,
        activity_type: 'invoice_sent',
        actor_type: 'user',
        actor_id: user.id,
        description: `Invoice ${invoice.invoice_number} sent to ${contact.contact_name || contact.company_name}`,
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          recipient_email: contact.email,
          total_amount: invoice.total_amount,
          balance_due: invoice.total_amount - invoice.amount_paid,
        },
      });

      // Update invoice status to sent
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoice.id);

      alert(`Invoice sent successfully to ${contact.email}!`);
      fetchData();
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Failed to send invoice email');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <Link href={`/jobs/${jobId}`} className="text-primary hover:text-primary-hover mb-4 inline-block">
          ← Back to Job
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600 mt-2">{job?.title}</p>
          </div>
          {acceptedQuotes.length > 0 && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {showForm ? 'Cancel' : '+ New Invoice'}
            </button>
          )}
        </div>
      </div>

      {acceptedQuotes.length > 0 && !showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            💡 You have {acceptedQuotes.length} accepted quote{acceptedQuotes.length > 1 ? 's' : ''} ready to be invoiced.
          </p>
        </div>
      )}

      {showForm && (
        <div className="mb-8">
          <InvoiceGenerator 
            jobId={jobId} 
            acceptedQuotes={acceptedQuotes}
            onSuccess={() => { setShowForm(false); fetchData(); }} 
          />
        </div>
      )}

      {invoices.length > 0 ? (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Invoice #{invoice.invoice_number}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Date: {new Date(invoice.invoice_date).toLocaleDateString()}
                  </p>
                  {invoice.due_date && (
                    <p className="text-sm text-gray-600">
                      Due: {new Date(invoice.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-lg font-medium">${invoice.total_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount Paid</p>
                    <p className="text-lg font-medium text-green-600">${invoice.amount_paid.toFixed(2)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Balance Due</p>
                    <p className="text-2xl font-bold text-primary">
                      ${(invoice.total_amount - invoice.amount_paid).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/jobs/${jobId}/invoices/${invoice.id}/view`}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-sm font-medium transition-colors"
                >
                  View Details
                </Link>
                <button
                  onClick={() => handleEmailInvoice(invoice)}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-medium transition-colors"
                >
                  📧 Email Invoice
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🧾</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Invoices Yet</h2>
            {acceptedQuotes.length > 0 ? (
              <>
                <p className="text-gray-600 mb-6">
                  You have accepted quotes ready to be invoiced
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  + Create Invoice
                </button>
              </>
            ) : (
              <p className="text-gray-600">
                Accept a quote first to create an invoice
              </p>
            )}
          </div>
        )
      )}
    </div>
  );
}
