'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface InvoiceGeneratorProps {
  jobId: string;
  acceptedQuotes: any[];
  onSuccess: () => void;
}

export default function InvoiceGenerator({ jobId, acceptedQuotes, onSuccess }: InvoiceGeneratorProps) {
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    quote_id: '',
    notes: '',
    terms: 'Payment due within 30 days',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    generateInvoiceNumber();
  }, []);

  const generateInvoiceNumber = async () => {
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true });
    
    const invoiceNum = `INV-${String((count || 0) + 1).padStart(4, '0')}`;
    setFormData({ ...formData, invoice_number: invoiceNum });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      // Get quote data if selected
      let subtotal = 0;
      let gst_amount = 0;
      let total_amount = 0;
      let lineItemsData: any[] = [];

      if (formData.quote_id) {
        const { data: quote } = await supabase
          .from('quotes')
          .select('*')
          .eq('id', formData.quote_id)
          .single();

        if (quote) {
          subtotal = quote.subtotal;
          gst_amount = quote.gst_amount;
          total_amount = quote.total_amount;

          // Get quote line items
          const { data: quoteLineItems } = await supabase
            .from('quote_line_items')
            .select('*')
            .eq('quote_id', formData.quote_id)
            .order('sort_order');

          if (quoteLineItems) {
            lineItemsData = quoteLineItems;
          }
        }
      }

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          ...formData,
          job_id: jobId,
          quote_id: formData.quote_id || null,
          organization_id: profile.organization_id,
          created_by: user.id,
          subtotal,
          gst_amount,
          total_amount,
          amount_paid: 0,
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice line items from quote
      if (lineItemsData.length > 0) {
        const invoiceLineItems = lineItemsData.map((item, index) => ({
          invoice_id: invoice.id,
          job_code_id: item.job_code_id || null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          sort_order: index,
        }));

        const { error: lineItemsError } = await supabase
          .from('invoice_line_items')
          .insert(invoiceLineItems);

        if (lineItemsError) throw lineItemsError;
      }

      // Update job status
      await supabase
        .from('jobs')
        .update({ status: 'in_progress' })
        .eq('id', jobId);

      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Invoice</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Number <span className="text-red-500">*</span>
            </label>
            <input
              name="invoice_number"
              type="text"
              value={formData.invoice_number}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Quote
            </label>
            <select
              name="quote_id"
              value={formData.quote_id}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="">Select a quote</option>
              {acceptedQuotes.map((quote) => (
                <option key={quote.id} value={quote.id}>
                  {quote.quote_number} - ${quote.total_amount.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Date <span className="text-red-500">*</span>
            </label>
            <input
              name="invoice_date"
              type="date"
              value={formData.invoice_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date
            </label>
            <input
              name="due_date"
              type="date"
              value={formData.due_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
        </div>

        {formData.quote_id && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              ✓ Invoice will be generated from the selected quote with all line items
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            placeholder="Additional notes for the invoice"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Terms
          </label>
          <textarea
            name="terms"
            value={formData.terms}
            onChange={handleChange}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
