'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ActivityFeed as ActivityFeedType, EmailCommunication } from '@/lib/types/database.types';

export default function ActivityPage() {
  const params = useParams();
  const jobId = params.id as string;
  const supabase = createClient();

  const [activities, setActivities] = useState<ActivityFeedType[]>([]);
  const [emails, setEmails] = useState<EmailCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'emails' | 'submissions' | 'status'>('all');

  useEffect(() => {
    fetchData();
  }, [jobId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch activity feed
    const { data: activityData } = await supabase
      .from('activity_feed')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    setActivities(activityData || []);

    // Fetch emails
    const { data: emailData } = await supabase
      .from('email_communications')
      .select('*')
      .eq('job_id', jobId)
      .order('sent_at', { ascending: false });

    setEmails(emailData || []);
    setLoading(false);
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      email_sent: '📧',
      contractor_submission: '📝',
      status_change: '🔄',
      quote_sent: '💰',
      invoice_sent: '🧾',
      contractor_assigned: '👷',
      field_staff_assigned: '👤',
      document_uploaded: '📎',
      note_added: '📌',
    };
    return icons[type] || '•';
  };

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      email_sent: 'bg-blue-100 text-blue-800',
      contractor_submission: 'bg-green-100 text-green-800',
      status_change: 'bg-purple-100 text-purple-800',
      quote_sent: 'bg-yellow-100 text-yellow-800',
      invoice_sent: 'bg-orange-100 text-orange-800',
      contractor_assigned: 'bg-indigo-100 text-indigo-800',
      field_staff_assigned: 'bg-teal-100 text-teal-800',
      document_uploaded: 'bg-gray-100 text-gray-800',
      note_added: 'bg-pink-100 text-pink-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const filteredActivities = activities.filter((activity) => {
    if (filter === 'all') return true;
    if (filter === 'emails') return activity.activity_type.includes('_sent');
    if (filter === 'submissions') return activity.activity_type === 'contractor_submission';
    if (filter === 'status') return activity.activity_type === 'status_change';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading activity...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Activity Feed</h1>
        <p className="text-gray-600 mt-2">Chronological log of all job-related activity</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setFilter('emails')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'emails'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Emails
          </button>
          <button
            onClick={() => setFilter('submissions')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'submissions'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Submissions
          </button>
          <button
            onClick={() => setFilter('status')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'status'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Status Changes
          </button>
        </div>
      </div>

      {/* Activity Timeline */}
      {filteredActivities.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Activity Yet</h2>
          <p className="text-gray-600">
            Activity will appear here as actions are taken on this job
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${getActivityColor(activity.activity_type)}`}>
                  {getActivityIcon(activity.activity_type)}
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{activity.description}</h3>
                      <p className="text-sm text-gray-500">
                        {activity.actor_type === 'user' ? 'User' : activity.actor_type === 'contractor' ? 'Contractor' : 'System'}
                        {' • '}
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getActivityColor(activity.activity_type)}`}>
                      {activity.activity_type.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>

                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-3">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(activity.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Emails Section */}
      {emails.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Communications</h2>
          <div className="space-y-4">
            {emails.map((email) => (
              <div
                key={email.id}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{email.subject}</h3>
                    <p className="text-sm text-gray-600">To: {email.recipient_email}</p>
                    <p className="text-sm text-gray-500">{new Date(email.sent_at).toLocaleString()}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    email.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    email.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {email.status.toUpperCase()}
                  </span>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-primary font-medium text-sm">
                    View Email Content
                  </summary>
                  <div className="mt-3 border-t pt-3">
                    <div dangerouslySetInnerHTML={{ __html: email.body }} />
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
