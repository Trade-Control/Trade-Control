'use client';

import { useState, useEffect } from 'react';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import Link from 'next/link';

export default function SchedulingPage() {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [staff, setStaff] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    job_id: '',
    assigned_to: '',
    scheduled_start: '',
    scheduled_end: '',
    role: 'technician',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const supabase = useSafeSupabaseClient();

  useEffect(() => {
    if (supabase) {
      fetchData();
    }
  }, [selectedDate, supabase]);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role, can_manage_staff')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) return;

      // Check if user has permission
      if (profile.role !== 'owner' && profile.role !== 'manager' && !profile.can_manage_staff) {
        setError('You do not have permission to view this page');
        setLoading(false);
        return;
      }

      // Fetch all staff in organization
      const { data: staffData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, service_areas')
        .eq('organization_id', profile.organization_id)
        .order('first_name');

      // Fetch assignments for the selected week
      const weekStart = new Date(selectedDate);
      weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const { data: assignmentsData } = await supabase
        .from('staff_assignments')
        .select('*, jobs(title, job_number, site_city), profiles(first_name, last_name)')
        .eq('organization_id', profile.organization_id)
        .gte('scheduled_start', weekStart.toISOString())
        .lte('scheduled_start', weekEnd.toISOString())
        .order('scheduled_start');

      // Fetch active jobs
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('id, job_number, title, site_address, site_city, status')
        .eq('organization_id', profile.organization_id)
        .in('status', ['draft', 'quoted', 'approved', 'in_progress'])
        .order('created_at', { ascending: false });

      setStaff(staffData || []);
      setAssignments(assignmentsData || []);
      setJobs(jobsData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      const { error: insertError } = await supabase
        .from('staff_assignments')
        .insert([{
          organization_id: profile.organization_id,
          assigned_by: user.id,
          ...newAssignment,
          status: 'scheduled',
        }]);

      if (insertError) throw insertError;

      setShowAssignmentModal(false);
      setNewAssignment({
        job_id: '',
        assigned_to: '',
        scheduled_start: '',
        scheduled_end: '',
        role: 'technician',
        notes: '',
      });
      fetchData();
    } catch (err: any) {
      alert('Failed to create assignment: ' + err.message);
    }
  };

  const getWeekDays = () => {
    const days = [];
    const start = new Date(selectedDate);
    start.setDate(selectedDate.getDate() - selectedDate.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getAssignmentsForStaffAndDay = (staffId: string, day: Date) => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    return assignments.filter(a => {
      const assignmentDate = new Date(a.scheduled_start);
      return a.assigned_to === staffId && assignmentDate >= dayStart && assignmentDate <= dayEnd;
    });
  };

  const getStaffCapacitySummary = (staffId: string) => {
    const weekDays = getWeekDays();
    let totalAssignments = 0;
    
    weekDays.forEach(day => {
      const dayAssignments = getAssignmentsForStaffAndDay(staffId, day);
      totalAssignments += dayAssignments.length;
    });

    return totalAssignments;
  };

  const previousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const today = () => {
    setSelectedDate(new Date());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
        {error}
      </div>
    );
  }

  const weekDays = getWeekDays();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Staff Scheduling</h1>
        <p className="text-gray-600 mt-2">Manage job assignments and view staff capacity</p>
      </div>

      {/* Header Controls */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={previousWeek}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={today}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextWeek}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="text-lg font-semibold text-gray-900 ml-2">
              {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'calendar' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'list' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setShowAssignmentModal(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              + Assign Job
            </button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[150px]">
                  Staff Member
                </th>
                {weekDays.map((day, idx) => (
                  <th key={idx} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[140px]">
                    <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="text-lg font-semibold text-gray-900 mt-1">
                      {day.getDate()}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white px-4 py-3 border-r border-gray-200">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                      {member.service_areas && member.service_areas.length > 0 && (
                        <p className="text-xs text-blue-600 mt-0.5">{member.service_areas.join(', ')}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {getStaffCapacitySummary(member.id)} assignments this week
                      </p>
                    </div>
                  </td>
                  {weekDays.map((day, idx) => {
                    const dayAssignments = getAssignmentsForStaffAndDay(member.id, day);
                    const isToday = day.toDateString() === new Date().toDateString();
                    
                    return (
                      <td
                        key={idx}
                        className={`px-2 py-2 align-top ${isToday ? 'bg-blue-50' : ''}`}
                      >
                        <div className="space-y-1">
                          {dayAssignments.map((assignment) => (
                            <Link
                              key={assignment.id}
                              href={`/jobs/${assignment.job_id}`}
                              className="block p-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded text-xs transition-colors"
                            >
                              <p className="font-medium text-gray-900 truncate">
                                {assignment.jobs?.job_number}
                              </p>
                              <p className="text-gray-600 truncate">{assignment.jobs?.title}</p>
                              <p className="text-gray-500 mt-1">
                                {new Date(assignment.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </Link>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {staff.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No staff members found</p>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-lg shadow">
          <div className="divide-y divide-gray-200">
            {assignments.length > 0 ? (
              assignments.map((assignment) => (
                <div key={assignment.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/jobs/${assignment.job_id}`}
                          className="text-base font-semibold text-primary hover:text-primary-hover"
                        >
                          {assignment.jobs?.job_number} - {assignment.jobs?.title}
                        </Link>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          assignment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          assignment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          assignment.status === 'in_progress' ? 'bg-amber-100 text-amber-800' :
                          assignment.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {assignment.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">Assigned To</p>
                          <p className="font-medium text-gray-900">
                            {assignment.profiles?.first_name} {assignment.profiles?.last_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Role</p>
                          <p className="font-medium text-gray-900 capitalize">{assignment.role}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Start Time</p>
                          <p className="font-medium text-gray-900">
                            {new Date(assignment.scheduled_start).toLocaleString([], { 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">End Time</p>
                          <p className="font-medium text-gray-900">
                            {assignment.scheduled_end ? new Date(assignment.scheduled_end).toLocaleString([], { 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }) : '-'}
                          </p>
                        </div>
                      </div>
                      {assignment.notes && (
                        <p className="mt-2 text-sm text-gray-600">{assignment.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>No assignments for this week</p>
                <button
                  onClick={() => setShowAssignmentModal(true)}
                  className="mt-3 text-primary hover:text-primary-hover font-medium text-sm"
                >
                  Create your first assignment
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Assign Job to Staff</h3>
            
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job <span className="text-red-500">*</span>
                </label>
                <select
                  value={newAssignment.job_id}
                  onChange={(e) => setNewAssignment({ ...newAssignment, job_id: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                >
                  <option value="">Select a job...</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.job_number} - {job.title} {job.site_city ? `(${job.site_city})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign To <span className="text-red-500">*</span>
                </label>
                <select
                  value={newAssignment.assigned_to}
                  onChange={(e) => setNewAssignment({ ...newAssignment, assigned_to: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                >
                  <option value="">Select staff member...</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.first_name} {member.last_name} ({member.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={newAssignment.role}
                  onChange={(e) => setNewAssignment({ ...newAssignment, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                >
                  <option value="lead">Lead</option>
                  <option value="technician">Technician</option>
                  <option value="helper">Helper</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={newAssignment.scheduled_start}
                    onChange={(e) => setNewAssignment({ ...newAssignment, scheduled_start: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End
                  </label>
                  <input
                    type="datetime-local"
                    value={newAssignment.scheduled_end}
                    onChange={(e) => setNewAssignment({ ...newAssignment, scheduled_end: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={newAssignment.notes}
                  onChange={(e) => setNewAssignment({ ...newAssignment, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  placeholder="Any special instructions..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignmentModal(false);
                    setNewAssignment({
                      job_id: '',
                      assigned_to: '',
                      scheduled_start: '',
                      scheduled_end: '',
                      role: 'technician',
                      notes: '',
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-medium"
                >
                  Create Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
