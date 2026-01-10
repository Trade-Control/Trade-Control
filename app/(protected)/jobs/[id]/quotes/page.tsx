'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import QuoteForm from '@/components/jobs/QuoteForm';
import { sendEmail, generateQuoteEmail } from '@/lib/services/resend-mock';

export default function QuotesPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [quotes, setQuotes] = useState<any[]>([]);
  const [job, setJob] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

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

    // Fetch quotes
    const { data: quotesData } = await supabase
      .from('quotes')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    
    if (quotesData) setQuotes(quotesData);
    
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleEmailQuote = async (quote: any) => {
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
      const viewUrl = `${window.location.origin}/jobs/${jobId}/quotes/${quote.id}/view`;
      const emailTemplate = generateQuoteEmail({
        clientName: contact.contact_name || contact.company_name || 'Valued Customer',
        quoteNumber: quote.quote_number,
        jobTitle: job.title,
        subtotal: quote.subtotal,
        gstAmount: quote.gst_amount,
        totalAmount: quote.total_amount,
        validUntil: quote.valid_until,
        notes: quote.notes,
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
        email_type: 'quote',
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
        activity_type: 'quote_sent',
        actor_type: 'user',
        actor_id: user.id,
        description: `Quote ${quote.quote_number} sent to ${contact.contact_name || contact.company_name}`,
        metadata: {
          quote_id: quote.id,
          quote_number: quote.quote_number,
          recipient_email: contact.email,
          total_amount: quote.total_amount,
        },
      });

      // Update quote status to sent
      await supabase
        .from('quotes')
        .update({ status: 'sent' })
        .eq('id', quote.id);
      
      alert(`Quote sent successfully to ${contact.email}!`);
      fetchData();
    } catch (error) {
      console.error('Error sending quote:', error);
      alert('Failed to send quote email');
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    if (!confirm('Accept this quote and convert to invoice?')) return;

    try {
      // Update quote status
      await supabase
        .from('quotes')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      // Update job status
      await supabase
        .from('jobs')
        .update({ status: 'approved' })
        .eq('id', jobId);

      alert('Quote accepted! You can now create an invoice from the Invoices tab.');
      fetchData();
    } catch (error) {
      console.error('Error accepting quote:', error);
      alert('Failed to accept quote');
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
            <h1 className="text-3xl font-bold text-gray-900">Quotes</h1>
            <p className="text-gray-600 mt-2">{job?.title}</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {showForm ? 'Cancel' : '+ New Quote'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-8">
          <QuoteForm jobId={jobId} onSuccess={() => { setShowForm(false); fetchData(); }} />
        </div>
      )}

      {quotes.length > 0 ? (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <div key={quote.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Quote #{quote.quote_number}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Date: {new Date(quote.quote_date).toLocaleDateString()}
                  </p>
                  {quote.valid_until && (
                    <p className="text-sm text-gray-600">
                      Valid until: {new Date(quote.valid_until).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(quote.status)}`}>
                    {quote.status}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Subtotal</p>
                    <p className="text-lg font-medium">${quote.subtotal.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">GST (10%)</p>
                    <p className="text-lg font-medium">${quote.gst_amount.toFixed(2)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-primary">${quote.total_amount.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/jobs/${jobId}/quotes/${quote.id}/view`}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-sm font-medium transition-colors"
                >
                  View Details
                </Link>
                {quote.status !== 'accepted' && (
                  <>
                    <button
                      onClick={() => handleEmailQuote(quote)}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-medium transition-colors"
                    >
                      📧 Email Quote
                    </button>
                    <button
                      onClick={() => handleAcceptQuote(quote.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      ✓ Accept Quote
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Quotes Yet</h2>
            <p className="text-gray-600 mb-6">Create your first quote for this job</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              + Create Quote
            </button>
          </div>
        )
      )}
    </div>
  );
}
