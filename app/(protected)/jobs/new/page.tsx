'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function NewJobPage() {
  const [formData, setFormData] = useState({
    job_number: '',
    title: '',
    description: '',
    client_id: '',
    site_address: '',
    site_city: '',
    site_state: '',
    site_postcode: '',
    start_date: '',
    end_date: '',
    notes: '',
  });
  const [contacts, setContacts] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchContacts = async () => {
      const { data } = await supabase
        .from('contacts')
        .select('id, contact_name, company_name')
        .eq('type', 'customer')
        .order('contact_name');
      
      if (data) setContacts(data);
    };

    fetchContacts();
  }, [supabase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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

      const jobData = {
        ...formData,
        client_id: formData.client_id || null,
        organization_id: profile.organization_id,
        created_by: user.id,
      };

      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()
        .single();

      if (jobError) throw jobError;

      router.push(`/jobs/${job.id}`);
    } catch (error: any) {
      setError(error.message || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Job</h1>
        <p className="text-gray-600 mt-2">Add a new job to your system</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="job_number" className="block text-sm font-medium text-gray-700 mb-2">
                Job Number <span className="text-red-500">*</span>
              </label>
              <input
                id="job_number"
                name="job_number"
                type="text"
                value={formData.job_number}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                placeholder="JOB-001"
              />
            </div>

            <div>
              <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-2">
                Client
              </label>
              <select
                id="client_id"
                name="client_id"
                value={formData.client_id}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
              >
                <option value="">Select a client</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.company_name || contact.contact_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                placeholder="Kitchen Renovation"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                placeholder="Brief description of the job"
              />
            </div>

            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Site Details</h3>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="site_address" className="block text-sm font-medium text-gray-700 mb-2">
                Site Address
              </label>
              <input
                id="site_address"
                name="site_address"
                type="text"
                value={formData.site_address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                placeholder="123 Main Street"
              />
            </div>

            <div>
              <label htmlFor="site_city" className="block text-sm font-medium text-gray-700 mb-2">
                City/Suburb
              </label>
              <input
                id="site_city"
                name="site_city"
                type="text"
                value={formData.site_city}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                placeholder="Sydney"
              />
            </div>

            <div>
              <label htmlFor="site_state" className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                id="site_state"
                name="site_state"
                type="text"
                value={formData.site_state}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                placeholder="NSW"
              />
            </div>

            <div>
              <label htmlFor="site_postcode" className="block text-sm font-medium text-gray-700 mb-2">
                Postcode
              </label>
              <input
                id="site_postcode"
                name="site_postcode"
                type="text"
                value={formData.site_postcode}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                placeholder="2000"
              />
            </div>

            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
              />
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                id="end_date"
                name="end_date"
                type="date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                placeholder="Additional notes"
              />
            </div>
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
              className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Job'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
