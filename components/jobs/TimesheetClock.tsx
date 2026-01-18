'use client';

import { useState, useEffect } from 'react';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';

interface TimesheetClockProps {
  jobId: string;
  activeTimesheet: any;
  onUpdate: () => void;
  showManualEntry: boolean;
  onCancelManual: () => void;
}

export default function TimesheetClock({ 
  jobId, 
  activeTimesheet, 
  onUpdate, 
  showManualEntry,
  onCancelManual 
}: TimesheetClockProps) {
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [manualEntry, setManualEntry] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    hours: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = useSafeSupabaseClient();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeTimesheet?.clock_on) {
      interval = setInterval(() => {
        const start = new Date(activeTimesheet.clock_on).getTime();
        const now = new Date().getTime();
        const diff = now - start;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setElapsedTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimesheet]);

  const handleClockOn = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      const { error } = await supabase
        .from('timesheets')
        .insert([{
          job_id: jobId,
          organization_id: profile.organization_id,
          created_by: user.id,
          entry_date: new Date().toISOString().split('T')[0],
          clock_on: new Date().toISOString(),
          is_manual: false,
        }]);

      if (error) throw error;
      onUpdate();
    } catch (error: any) {
      setError(error.message || 'Failed to clock on');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOff = async () => {
    if (!activeTimesheet) return;
    
    setLoading(true);
    setError('');
    
    try {
      const clockOff = new Date();
      const clockOn = new Date(activeTimesheet.clock_on);
      const diffMs = clockOff.getTime() - clockOn.getTime();
      const hours = diffMs / (1000 * 60 * 60);

      const { error } = await supabase
        .from('timesheets')
        .update({
          clock_off: clockOff.toISOString(),
          hours: hours.toFixed(2),
        })
        .eq('id', activeTimesheet.id);

      if (error) throw error;
      onUpdate();
    } catch (error: any) {
      setError(error.message || 'Failed to clock off');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      const { error } = await supabase
        .from('timesheets')
        .insert([{
          job_id: jobId,
          organization_id: profile.organization_id,
          created_by: user.id,
          entry_date: manualEntry.entry_date,
          hours: parseFloat(manualEntry.hours),
          description: manualEntry.description,
          is_manual: true,
        }]);

      if (error) throw error;
      
      setManualEntry({
        entry_date: new Date().toISOString().split('T')[0],
        hours: '',
        description: '',
      });
      onCancelManual();
      onUpdate();
    } catch (error: any) {
      setError(error.message || 'Failed to add manual entry');
    } finally {
      setLoading(false);
    }
  };

  if (showManualEntry) {
    // Calculate hours from clock on/off if available
    const calculateHours = (clockOn: string, clockOff: string) => {
      if (!clockOn || !clockOff) return '';
      const start = new Date(clockOn);
      const end = new Date(clockOff);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return hours.toFixed(2);
    };

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Manual Time Entry</h2>
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={manualEntry.entry_date}
                onChange={(e) => setManualEntry({ ...manualEntry, entry_date: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={manualEntry.clock_on ? new Date(manualEntry.clock_on).toTimeString().slice(0, 5) : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const date = manualEntry.entry_date || new Date().toISOString().split('T')[0];
                    const clockOn = `${date}T${e.target.value}:00`;
                    setManualEntry({ ...manualEntry, clock_on: clockOn });
                    
                    // Auto-calculate hours if clock off is set
                    if (manualEntry.clock_off) {
                      const hours = calculateHours(clockOn, manualEntry.clock_off);
                      setManualEntry({ ...manualEntry, clock_on: clockOn, hours });
                    }
                  } else {
                    setManualEntry({ ...manualEntry, clock_on: '' });
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={manualEntry.clock_off ? new Date(manualEntry.clock_off).toTimeString().slice(0, 5) : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const date = manualEntry.entry_date || new Date().toISOString().split('T')[0];
                    const clockOff = `${date}T${e.target.value}:00`;
                    setManualEntry({ ...manualEntry, clock_off: clockOff });
                    
                    // Auto-calculate hours if clock on is set
                    if (manualEntry.clock_on) {
                      const hours = calculateHours(manualEntry.clock_on, clockOff);
                      setManualEntry({ ...manualEntry, clock_off: clockOff, hours });
                    }
                  } else {
                    setManualEntry({ ...manualEntry, clock_off: '' });
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (hours) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.25"
                value={manualEntry.hours}
                onChange={(e) => setManualEntry({ ...manualEntry, hours: e.target.value })}
                required
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                placeholder="8.0"
                readOnly={!!(manualEntry.clock_on && manualEntry.clock_off)}
              />
              {manualEntry.clock_on && manualEntry.clock_off && (
                <p className="text-xs text-gray-500 mt-1">Auto-calculated from start and end time</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={manualEntry.description}
              onChange={(e) => setManualEntry({ ...manualEntry, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              placeholder="What did you work on?"
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
              {loading ? 'Adding...' : 'Add Entry'}
            </button>
            <button
              type="button"
              onClick={onCancelManual}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col items-center">
        {activeTimesheet ? (
          <>
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600 mb-2">Time Elapsed</p>
              <p className="text-6xl font-bold text-primary font-mono">{elapsedTime}</p>
              <p className="text-sm text-gray-600 mt-2">
                Started at {new Date(activeTimesheet.clock_on).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={handleClockOff}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <span>⏹️</span>
              <span>{loading ? 'Clocking Off...' : 'Clock Off'}</span>
            </button>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <p className="text-xl text-gray-600 mb-4">Ready to start work?</p>
              <p className="text-6xl font-bold text-gray-300 font-mono">00:00:00</p>
            </div>
            <button
              onClick={handleClockOn}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <span>▶️</span>
              <span>{loading ? 'Clocking On...' : 'Clock On'}</span>
            </button>
          </>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mt-4">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
