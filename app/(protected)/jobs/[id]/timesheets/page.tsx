'use client';

import { useState, useEffect } from 'react';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import TimesheetClock from '@/components/jobs/TimesheetClock';

export default function TimesheetsPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [job, setJob] = useState<any>(null);
  const [activeTimesheet, setActiveTimesheet] = useState<any>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = useSafeSupabaseClient();

  useEffect(() => {
    if (supabase) {
      fetchData();
    }
  }, [jobId, supabase]);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    
    // Fetch job details
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (jobData) setJob(jobData);

    // Fetch timesheets
    const { data: timesheetsData } = await supabase
      .from('timesheets')
      .select('*')
      .eq('job_id', jobId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (timesheetsData) {
      setTimesheets(timesheetsData);
      // Find active timesheet (clocked on but not off)
      const active = timesheetsData.find((t: any) => t.clock_on && !t.clock_off);
      setActiveTimesheet(active);
    }
    
    setLoading(false);
  };

  const calculateTotalHours = () => {
    return timesheets.reduce((total, timesheet) => {
      return total + (parseFloat(timesheet.hours) || 0);
    }, 0);
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
            <h1 className="text-3xl font-bold text-gray-900">Timesheets</h1>
            <p className="text-gray-600 mt-2">{job?.title}</p>
          </div>
          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {showManualEntry ? 'Cancel' : '+ Manual Entry'}
          </button>
        </div>
      </div>

      {/* Clock Component */}
      <div className="mb-8">
        <TimesheetClock 
          jobId={jobId} 
          activeTimesheet={activeTimesheet}
          onUpdate={fetchData}
          showManualEntry={showManualEntry}
          onCancelManual={() => setShowManualEntry(false)}
        />
      </div>

      {/* Total Hours Summary */}
      <div className="bg-primary text-white rounded-lg shadow p-6 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-primary-light text-sm mb-1">Total Hours Logged</p>
            <p className="text-4xl font-bold">{calculateTotalHours().toFixed(2)}</p>
          </div>
          <div className="flex items-center">
            <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Timesheets List */}
      {timesheets.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clock On
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clock Off
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timesheets.map((timesheet: any) => (
                  <tr key={timesheet.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(timesheet.entry_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {timesheet.clock_on ? new Date(timesheet.clock_on).toLocaleTimeString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {timesheet.clock_off ? new Date(timesheet.clock_off).toLocaleTimeString() : 
                       timesheet.clock_on ? <span className="text-green-600 font-medium">Active</span> : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {timesheet.hours ? `${parseFloat(timesheet.hours).toFixed(2)}h` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        timesheet.is_manual ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {timesheet.is_manual ? 'Manual' : 'Clocked'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {timesheet.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="flex justify-center mb-4">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Time Entries Yet</h2>
          <p className="text-gray-600">
            Clock on to start tracking time or add a manual entry
          </p>
        </div>
      )}
    </div>
  );
}
