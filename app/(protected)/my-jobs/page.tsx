'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function MyJobsPage() {
  const supabase = createClient();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignedJobs();
  }, []);

  const fetchAssignedJobs = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('assigned_job_ids, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'field_staff') {
      setLoading(false);
      return;
    }

    const assignedJobIds = profile.assigned_job_ids || [];

    if (assignedJobIds.length === 0) {
      setLoading(false);
      return;
    }

    const { data: jobsData } = await supabase
      .from('jobs')
      .select('*, contacts(*)')
      .in('id', assignedJobIds)
      .order('created_at', { ascending: false });

    setJobs(jobsData || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading your jobs...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Assigned Jobs</h1>
        <p className="text-gray-600 mt-2">Jobs assigned to you for completion</p>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Jobs Assigned Yet</h2>
          <p className="text-gray-600">
            Your manager will assign jobs to you soon
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{job.title}</h3>
                  <p className="text-sm text-gray-600">#{job.job_number}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  job.status === 'completed' ? 'bg-green-100 text-green-800' :
                  job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {job.status.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>

              {job.description && (
                <p className="text-gray-700 mb-4 line-clamp-2">{job.description}</p>
              )}

              {job.site_address && (
                <div className="text-sm text-gray-600 mb-2">
                  📍 {job.site_address}
                  {job.site_city && `, ${job.site_city}`}
                </div>
              )}

              {job.contacts && (
                <div className="text-sm text-gray-600">
                  👤 {job.contacts.first_name} {job.contacts.last_name}
                </div>
              )}

              <div className="mt-4 text-primary font-medium">
                View Job Details →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
