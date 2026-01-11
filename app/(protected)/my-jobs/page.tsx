'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function MyJobsPage() {
  const supabase = createClient();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignedJobs();
  }, [selectedDate]);

  const fetchAssignedJobs = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch staff assignments for this user
    const weekStart = new Date(selectedDate);
    weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 14); // Get 2 weeks

    const { data: assignmentsData } = await supabase
      .from('staff_assignments')
      .select('*, jobs(id, job_number, title, description, site_address, site_city, site_state, status, priority, contacts(contact_name, company_name, phone))')
      .eq('assigned_to', user.id)
      .gte('scheduled_start', weekStart.toISOString())
      .lte('scheduled_start', weekEnd.toISOString())
      .order('scheduled_start');

    setAssignments(assignmentsData || []);
    setLoading(false);
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

  const getAssignmentsForDay = (day: Date) => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    return assignments.filter(a => {
      const assignmentDate = new Date(a.scheduled_start);
      return assignmentDate >= dayStart && assignmentDate <= dayEnd;
    });
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      in_progress: 'bg-amber-100 text-amber-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-700',
      normal: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const weekDays = getWeekDays();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>
        <p className="text-gray-600 mt-2">Your assigned jobs and upcoming schedule</p>
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
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'list' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'calendar' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>

      {/* List View */}
      {view === 'list' && (
        <div className="space-y-4">
          {assignments.length > 0 ? (
            assignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/jobs/${assignment.job_id}`}
                className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-5"
              >
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-gray-900">
                            {assignment.jobs?.job_number} - {assignment.jobs?.title}
                          </h3>
                          {assignment.jobs?.priority && (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityColor(assignment.jobs.priority)}`}>
                              {assignment.jobs.priority}
                            </span>
                          )}
                        </div>
                        {assignment.jobs?.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{assignment.jobs.description}</p>
                        )}
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.status)}`}>
                        {assignment.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-gray-700">
                          {new Date(assignment.scheduled_start).toLocaleString([], { 
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      {assignment.jobs?.site_address && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-gray-700">
                            {assignment.jobs.site_address}
                            {assignment.jobs.site_city && `, ${assignment.jobs.site_city}`}
                          </span>
                        </div>
                      )}

                      {assignment.jobs?.contacts && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-gray-700">
                            {assignment.jobs.contacts.company_name || assignment.jobs.contacts.contact_name}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-gray-700 capitalize">{assignment.role}</span>
                      </div>
                    </div>

                    {assignment.notes && (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded text-sm text-gray-700">
                        <span className="font-medium">Note:</span> {assignment.notes}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Assignments This Week</h2>
              <p className="text-gray-600">Check back later or contact your manager</p>
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {weekDays.map((day, idx) => {
              const dayAssignments = getAssignmentsForDay(day);
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={idx}
                  className={`bg-white p-3 min-h-[200px] ${isToday ? 'bg-blue-50' : ''}`}
                >
                  <div className="text-center mb-3">
                    <div className="text-xs font-medium text-gray-500 uppercase">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className={`text-2xl font-bold ${isToday ? 'text-primary' : 'text-gray-900'}`}>
                      {day.getDate()}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {dayAssignments.map((assignment) => (
                      <Link
                        key={assignment.id}
                        href={`/jobs/${assignment.job_id}`}
                        className="block p-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-md text-xs transition-colors"
                      >
                        <div className="font-semibold text-gray-900 truncate">
                          {assignment.jobs?.job_number}
                        </div>
                        <div className="text-gray-700 truncate">{assignment.jobs?.title}</div>
                        <div className="text-gray-600 mt-1">
                          {new Date(assignment.scheduled_start).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                        {assignment.jobs?.priority && (
                          <div className="mt-1">
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getPriorityColor(assignment.jobs.priority)}`}>
                              {assignment.jobs.priority}
                            </span>
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
