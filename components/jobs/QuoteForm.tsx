'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface QuoteFormProps {
  jobId: string;
  onSuccess: () => void;
}

export default function QuoteForm({ jobId, onSuccess }: QuoteFormProps) {
  const [formData, setFormData] = useState({
    quote_number: '',
    quote_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    notes: '',
    terms: 'Payment due within 30 days',
  });
  const [lineItems, setLineItems] = useState<any[]>([
    { description: '', quantity: 1, unit_price: 0, line_total: 0, job_code_id: null }
  ]);
  const [jobCodes, setJobCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchJobCodes();
    generateQuoteNumber();
  }, []);

  const fetchJobCodes = async () => {
    const { data } = await supabase
      .from('job_codes')
      .select('*')
      .eq('is_active', true)
      .order('code');
    
    if (data) setJobCodes(data);
  };

  const generateQuoteNumber = async () => {
    const { count } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true });
    
    const quoteNum = `QT-${String((count || 0) + 1).padStart(4, '0')}`;
    setFormData({ ...formData, quote_number: quoteNum });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...lineItems];
    updatedItems[index][field] = value;

    // If job code selected, populate description and price
    if (field === 'job_code_id' && value) {
      const jobCode = jobCodes.find(jc => jc.id === value);
      if (jobCode) {
        updatedItems[index].description = jobCode.description;
        updatedItems[index].unit_price = jobCode.unit_price;
      }
    }

    // Calculate line total
    if (field === 'quantity' || field === 'unit_price' || field === 'job_code_id') {
      updatedItems[index].line_total = 
        parseFloat(updatedItems[index].quantity || 0) * 
        parseFloat(updatedItems[index].unit_price || 0);
    }

    setLineItems(updatedItems);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: '', quantity: 1, unit_price: 0, line_total: 0, job_code_id: null }
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.line_total) || 0), 0);
    const gst_amount = subtotal * 0.1; // 10% GST
    const total_amount = subtotal + gst_amount;
    return { subtotal, gst_amount, total_amount };
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

      const { subtotal, gst_amount, total_amount } = calculateTotals();

      // Create quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert([{
          ...formData,
          job_id: jobId,
          organization_id: profile.organization_id,
          created_by: user.id,
          subtotal,
          gst_amount,
          total_amount,
        }])
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create line items
      const lineItemsData = lineItems.map((item, index) => ({
        quote_id: quote.id,
        job_code_id: item.job_code_id || null,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
        line_total: parseFloat(item.line_total),
        sort_order: index,
      }));

      const { error: lineItemsError } = await supabase
        .from('quote_line_items')
        .insert(lineItemsData);

      if (lineItemsError) throw lineItemsError;

      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to create quote');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Quote</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quote Number <span className="text-red-500">*</span>
            </label>
            <input
              name="quote_number"
              type="text"
              value={formData.quote_number}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quote Date <span className="text-red-500">*</span>
            </label>
            <input
              name="quote_date"
              type="date"
              value={formData.quote_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valid Until
            </label>
            <input
              name="valid_until"
              type="date"
              value={formData.valid_until}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Line Items</h3>
            <button
              type="button"
              onClick={addLineItem}
              className="text-primary hover:text-primary-hover font-medium text-sm"
            >
              + Add Line Item
            </button>
          </div>

          <div className="space-y-4">
            {lineItems.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Code (Optional)
                    </label>
                    <select
                      value={item.job_code_id || ''}
                      onChange={(e) => handleLineItemChange(index, 'job_code_id', e.target.value || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    >
                      <option value="">Manual Entry</option>
                      {jobCodes.map((jc) => (
                        <option key={jc.id} value={jc.id}>
                          {jc.code} - {jc.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => handleLineItemChange(index, 'unit_price', e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-gray-600">
                    Line Total: <span className="font-bold">${item.line_total.toFixed(2)}</span>
                  </p>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">GST (10%):</span>
              <span className="font-medium">${totals.gst_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-primary">${totals.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

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
            placeholder="Additional notes for the quote"
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
            {loading ? 'Creating...' : 'Create Quote'}
          </button>
        </div>
      </form>
    </div>
  );
}
