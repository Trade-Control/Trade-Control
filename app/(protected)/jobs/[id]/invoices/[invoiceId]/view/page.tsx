'use client';

import { useEffect, useState } from 'react';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { redirect, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { generateInvoicePDF } from '@/lib/services/pdf-generator';

export default function InvoiceViewPage() {
  const params = useParams();
  const jobId = params.id as string;
  const invoiceId = params.invoiceId as string;
  const supabase = useSafeSupabaseClient();
  
  const [invoice, setInvoice] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        redirect('/login');
        return;
      }

      // Fetch invoice with line items
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select(`
          *,
          jobs (
            *,
            contacts (*)
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (!invoiceData) {
        redirect(`/jobs/${jobId}/invoices`);
        return;
      }

      setInvoice(invoiceData);

      const { data: lineItemsData } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('sort_order');

      if (lineItemsData) setLineItems(lineItemsData);

      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', invoiceData.organization_id)
        .single();

      if (orgData) setOrganization(orgData);
      
      setLoading(false);
    };

    fetchData();
  }, [jobId, invoiceId, supabase]);

  const handleDownloadPDF = async () => {
    if (!invoice || !organization) return;
    
    setDownloadingPDF(true);
    try {
      const pdfBlob = await generateInvoicePDF({
        organization,
        invoice,
        lineItems,
        job: invoice.jobs,
        contact: invoice.jobs?.contacts
      });
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const job = invoice.jobs as any;
  const contact = job?.contacts as any;

  return (
    <div>
      <div className="mb-4 print:hidden">
        <Link href={`/jobs/${jobId}/invoices`} className="text-primary hover:text-primary-hover">
          ← Back to Invoices
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto print:shadow-none">
        {/* Print Button */}
        <div className="mb-6 flex justify-end gap-3 print:hidden">
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {downloadingPDF ? '⏳ Generating PDF...' : '📥 Download PDF'}
          </button>
          <button
            onClick={() => window.print()}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            🖨️ Print / Save as PDF
          </button>
        </div>

        {/* Header with Logo */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2" style={{ borderColor: organization?.brand_color || '#2563eb' }}>
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: organization?.brand_color || '#2563eb' }}>INVOICE</h1>
            <p className="text-gray-600">Invoice #: {invoice.invoice_number}</p>
            <p className="text-gray-600">Date: {new Date(invoice.invoice_date).toLocaleDateString()}</p>
            {invoice.due_date && (
              <p className="text-gray-600 font-semibold">Due: {new Date(invoice.due_date).toLocaleDateString()}</p>
            )}
          </div>
          <div className="text-right">
            {organization?.logo_url && (
              <div className="mb-4">
                <Image 
                  src={organization.logo_url} 
                  alt={organization.name || 'Company Logo'} 
                  width={150} 
                  height={60}
                  className="ml-auto"
                  style={{ maxHeight: '80px', width: 'auto' }}
                />
              </div>
            )}
            <h2 className="text-xl font-bold text-gray-900 mb-2">{organization?.name}</h2>
            {organization?.abn && <p className="text-sm text-gray-600">ABN: {organization.abn}</p>}
            {organization?.address && <p className="text-sm text-gray-600">{organization.address}</p>}
            {(organization?.city || organization?.state || organization?.postcode) && (
              <p className="text-sm text-gray-600">
                {organization?.city} {organization?.state} {organization?.postcode}
              </p>
            )}
            {organization?.phone && <p className="text-sm text-gray-600">Ph: {organization.phone}</p>}
            {organization?.email && <p className="text-sm text-gray-600">{organization.email}</p>}
            {organization?.website_url && <p className="text-sm text-gray-600">{organization.website_url}</p>}
          </div>
        </div>

        {/* Client Details */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Bill To:</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-medium text-gray-900">{contact?.company_name || contact?.contact_name}</p>
            {contact?.contact_name && contact?.company_name && (
              <p className="text-gray-600">{contact.contact_name}</p>
            )}
            {contact?.address && <p className="text-gray-600">{contact.address}</p>}
            {(contact?.city || contact?.state || contact?.postcode) && (
              <p className="text-gray-600">
                {contact?.city} {contact?.state} {contact?.postcode}
              </p>
            )}
            {contact?.email && <p className="text-gray-600">{contact.email}</p>}
            {contact?.phone && <p className="text-gray-600">{contact.phone}</p>}
          </div>
        </div>

        {/* Job Details */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Job Details:</h3>
          <p className="text-gray-900 font-medium">{job?.title}</p>
          {job?.description && <p className="text-gray-600">{job.description}</p>}
          {job?.site_address && (
            <p className="text-gray-600 mt-2">
              Site: {job.site_address}
              {job.site_city && `, ${job.site_city}`}
              {job.site_state && ` ${job.site_state}`}
              {job.site_postcode && ` ${job.site_postcode}`}
            </p>
          )}
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b-2" style={{ backgroundColor: `${organization?.brand_color || '#2563eb'}15`, borderColor: organization?.brand_color || '#2563eb' }}>
                <th className="text-left py-3 px-4 font-bold text-gray-900">Description</th>
                <th className="text-right py-3 px-4 font-bold text-gray-900">Quantity</th>
                <th className="text-right py-3 px-4 font-bold text-gray-900">Unit Price</th>
                <th className="text-right py-3 px-4 font-bold text-gray-900">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems?.map((item: any) => (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="py-3 px-4 text-gray-900">{item.description}</td>
                  <td className="py-3 px-4 text-right text-gray-900">{item.quantity}</td>
                  <td className="py-3 px-4 text-right text-gray-900">${item.unit_price.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-gray-900">${item.line_total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium text-gray-900">${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">GST (10%):</span>
              <span className="font-medium text-gray-900">${invoice.gst_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Total:</span>
              <span className="font-medium text-gray-900">${invoice.total_amount.toFixed(2)}</span>
            </div>
            {invoice.amount_paid > 0 && (
              <>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-medium text-green-600">-${invoice.amount_paid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 border-t-2" style={{ borderColor: organization?.brand_color || '#2563eb' }}>
                  <span className="text-lg font-bold text-gray-900">Balance Due:</span>
                  <span className="text-lg font-bold" style={{ color: organization?.brand_color || '#2563eb' }}>
                    ${(invoice.total_amount - invoice.amount_paid).toFixed(2)}
                  </span>
                </div>
              </>
            )}
            {invoice.amount_paid === 0 && (
              <div className="flex justify-between py-3 border-t-2" style={{ borderColor: organization?.brand_color || '#2563eb' }}>
                <span className="text-lg font-bold text-gray-900">Amount Due:</span>
                <span className="text-lg font-bold" style={{ color: organization?.brand_color || '#2563eb' }}>${invoice.total_amount.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Details */}
        {organization?.payment_details && (
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Payment Details:</h3>
            <p className="text-gray-600 whitespace-pre-line">{organization.payment_details}</p>
          </div>
        )}

        {/* Notes and Terms */}
        {invoice.notes && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Notes:</h3>
            <p className="text-gray-600 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}

        {invoice.terms && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Payment Terms:</h3>
            <p className="text-gray-600 whitespace-pre-line">{invoice.terms}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>Thank you for your business!</p>
        </div>
      </div>
    </div>
  );
}
