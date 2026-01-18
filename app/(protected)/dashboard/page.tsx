import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Get user profile with organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', user.id)
    .single();

  // Get some stats
  const { count: jobsCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true });

  const { count: contactsCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true });

  const { count: quotesCount } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'draft');

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back to Trade Control
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-md p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{jobsCount || 0}</p>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Contacts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{contactsCount || 0}</p>
            </div>
            <div className="h-10 w-10 bg-green-50 rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Quotes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{quotesCount || 0}</p>
            </div>
            <div className="h-10 w-10 bg-amber-50 rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Organisation</p>
              <p className="text-lg font-semibold text-gray-900 mt-1 truncate">
                {(profile?.organizations as any)?.name || 'N/A'}
              </p>
            </div>
            <div className="h-10 w-10 bg-purple-50 rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-md p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a
            href="/jobs/new"
            className="group flex items-center space-x-3 p-4 border border-primary rounded-md hover:bg-primary hover:shadow-sm transition-all"
          >
            <div className="h-9 w-9 bg-primary group-hover:bg-white rounded-md flex items-center justify-center transition-colors">
              <svg className="w-4 h-4 text-white group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-white transition-colors">New Job</p>
              <p className="text-sm text-gray-500 group-hover:text-white/80 transition-colors">Create a new job</p>
            </div>
          </a>

          <a
            href="/contacts"
            className="group flex items-center space-x-3 p-4 border border-gray-200 rounded-md hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <div className="h-9 w-9 bg-gray-100 group-hover:bg-gray-200 rounded-md flex items-center justify-center transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Add Contact</p>
              <p className="text-sm text-gray-500">Add a new customer</p>
            </div>
          </a>

          <a
            href="/inventory"
            className="group flex items-center space-x-3 p-4 border border-gray-200 rounded-md hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <div className="h-9 w-9 bg-gray-100 group-hover:bg-gray-200 rounded-md flex items-center justify-center transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Manage Inventory</p>
              <p className="text-sm text-gray-500">View stock levels</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
