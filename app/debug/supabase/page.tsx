'use client';

import { useState, useEffect } from 'react';

interface DebugInfo {
  timestamp: string;
  environment: string;
  vercel: {
    isVercel: boolean;
    vercelEnv: string;
    vercelUrl: string;
  };
  supabase: {
    envVars: Record<string, {
      exists: boolean;
      length: number;
      prefix: string;
      preview: string;
    }>;
    clientTest: {
      success: boolean;
      error?: string;
      message?: string;
      url?: string;
    } | null;
    serverClientTest: {
      success: boolean;
      error?: string;
      message?: string;
    } | null;
    adminClientTest: {
      success: boolean;
      error?: string;
      message?: string;
      apiTest?: {
        success: boolean;
        error?: string;
        message?: string;
      };
    } | null;
    apiTest: {
      success: boolean;
      error?: string;
      message?: string;
      code?: string;
      hasData?: boolean;
    } | null;
    authTest: {
      success: boolean;
      error?: string;
      message?: string;
      hasUser?: boolean;
      userId?: string | null;
      userEmail?: string | null;
    } | null;
    authAdminTest?: {
      success: boolean;
      error?: string;
      message?: string;
      usersCount?: number;
    } | null;
    triggerTest?: {
      profilesTableAccessible?: boolean;
      profilesCount?: number;
      error?: string | null;
    } | null;
  };
  recommendations: string[];
  status: 'success' | 'partial' | 'error';
  summary: {
    hasUrl: boolean;
    hasAnonKey: boolean;
    hasServiceRole: boolean;
    clientWorking: boolean;
    serverClientWorking: boolean;
    adminClientWorking: boolean;
    apiWorking: boolean;
    authAdminWorking?: boolean;
  };
}

interface SignupTestResult {
  success: boolean;
  message?: string;
  error?: string;
  step?: string;
  errorDetails?: {
    name?: string;
    status?: number;
    code?: string;
    message?: string;
  };
  diagnosis?: string;
  fix?: string;
  details?: {
    userCreated?: boolean;
    profileCreated?: boolean;
    profileError?: string | null;
    testUserCleaned?: boolean;
  };
}

interface EmailCheckResult {
  exists: boolean;
  user?: {
    id: string;
    email: string;
    emailConfirmed: boolean;
    createdAt: string;
    lastSignIn: string | null;
  };
  hasProfile?: boolean;
  profile?: any;
  recommendation?: string;
  message?: string;
  error?: string;
}

export default function SupabaseDebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signupTestLoading, setSignupTestLoading] = useState(false);
  const [signupTestResult, setSignupTestResult] = useState<SignupTestResult | null>(null);
  
  // Email check state
  const [checkEmail, setCheckEmail] = useState('');
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailCheckResult, setEmailCheckResult] = useState<EmailCheckResult | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  const fetchDebugInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/debug/supabase');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch debug info');
      }
      
      setDebugInfo(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load debug information');
    } finally {
      setLoading(false);
    }
  };

  const runSignupTest = async () => {
    try {
      setSignupTestLoading(true);
      setSignupTestResult(null);
      
      const response = await fetch('/api/debug/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-signup' }),
      });
      
      const data = await response.json();
      setSignupTestResult(data);
    } catch (err: any) {
      setSignupTestResult({
        success: false,
        error: err.message || 'Failed to run signup test',
      });
    } finally {
      setSignupTestLoading(false);
    }
  };

  const checkUserEmail = async () => {
    if (!checkEmail || !checkEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    
    try {
      setEmailCheckLoading(true);
      setEmailCheckResult(null);
      setDeleteResult(null);
      
      const response = await fetch('/api/debug/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-email', email: checkEmail }),
      });
      
      const data = await response.json();
      setEmailCheckResult(data);
    } catch (err: any) {
      setEmailCheckResult({
        exists: false,
        error: err.message || 'Failed to check email',
      });
    } finally {
      setEmailCheckLoading(false);
    }
  };

  const deleteUser = async () => {
    if (!checkEmail || !emailCheckResult?.exists) {
      return;
    }
    
    if (!confirm(`Are you sure you want to delete the user "${checkEmail}"? This cannot be undone.`)) {
      return;
    }
    
    try {
      setDeleteLoading(true);
      setDeleteResult(null);
      
      const response = await fetch('/api/debug/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-user', email: checkEmail }),
      });
      
      const data = await response.json();
      setDeleteResult(data);
      
      if (data.success) {
        setEmailCheckResult(null);
      }
    } catch (err: any) {
      setDeleteResult({
        success: false,
        message: err.message || 'Failed to delete user',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'partial':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading debug information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold text-red-900 mb-2">Error</h2>
              <p className="text-red-700">{error}</p>
            </div>
            <button
              onClick={fetchDebugInfo}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!debugInfo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Supabase Authentication Debug</h1>
              <p className="text-gray-600 mt-2">Diagnostic information for Supabase configuration and authentication</p>
              <p className="text-sm text-gray-500 mt-1">Public debug page - no authentication required</p>
            </div>
            <button
              onClick={fetchDebugInfo}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Overall Status */}
        <div className={`border-2 rounded-lg p-6 mb-6 ${getStatusColor(debugInfo.status)}`}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{getStatusIcon(debugInfo.status)}</span>
            <div>
              <h2 className="text-xl font-bold">Overall Status: {debugInfo.status.toUpperCase()}</h2>
              <p className="text-sm opacity-80">Last checked: {new Date(debugInfo.timestamp).toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/50 rounded p-3">
              <div className="text-sm opacity-70">Supabase URL</div>
              <div className="font-semibold">{debugInfo.summary.hasUrl ? '✅ Set' : '❌ Missing'}</div>
            </div>
            <div className="bg-white/50 rounded p-3">
              <div className="text-sm opacity-70">Anon Key</div>
              <div className="font-semibold">{debugInfo.summary.hasAnonKey ? '✅ Set' : '❌ Missing'}</div>
            </div>
            <div className="bg-white/50 rounded p-3">
              <div className="text-sm opacity-70">Service Role</div>
              <div className="font-semibold">{debugInfo.summary.hasServiceRole ? '✅ Set' : '⚠️ Missing'}</div>
            </div>
            <div className="bg-white/50 rounded p-3">
              <div className="text-sm opacity-70">API Connection</div>
              <div className="font-semibold">{debugInfo.summary.apiWorking ? '✅ Working' : '❌ Failed'}</div>
            </div>
          </div>
        </div>

        {/* Environment Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Environment Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Environment</div>
              <div className="font-medium">{debugInfo.environment || 'Not set'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Vercel</div>
              <div className="font-medium">
                {debugInfo.vercel.isVercel ? '✅ Detected' : '❌ Not detected'}
              </div>
            </div>
            {debugInfo.vercel.isVercel && (
              <>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Vercel Environment</div>
                  <div className="font-medium">{debugInfo.vercel.vercelEnv || 'Not set'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Vercel URL</div>
                  <div className="font-medium">{debugInfo.vercel.vercelUrl || 'Not set'}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Browser Client Test */}
        {debugInfo.supabase.clientTest && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Browser Client Test</h2>
            {debugInfo.supabase.clientTest.success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-green-600 font-semibold mb-2">✅ Success</div>
                <p className="text-green-700 mb-2">{debugInfo.supabase.clientTest.message}</p>
                {debugInfo.supabase.clientTest.url && (
                  <div className="text-sm text-green-600">
                    <span className="font-medium">URL:</span>{' '}
                    <span className="font-mono">{debugInfo.supabase.clientTest.url}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-600 font-semibold mb-2">❌ Failed</div>
                <p className="text-red-700">{debugInfo.supabase.clientTest.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Server Client Test */}
        {debugInfo.supabase.serverClientTest && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Server Client Test</h2>
            {debugInfo.supabase.serverClientTest.success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-green-600 font-semibold mb-2">✅ Success</div>
                <p className="text-green-700">{debugInfo.supabase.serverClientTest.message}</p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-600 font-semibold mb-2">❌ Failed</div>
                <p className="text-red-700">{debugInfo.supabase.serverClientTest.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Admin Client Test */}
        {debugInfo.supabase.adminClientTest && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Client Test (Service Role)</h2>
            {debugInfo.supabase.adminClientTest.success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-green-600 font-semibold mb-2">✅ Success</div>
                <p className="text-green-700 mb-3">{debugInfo.supabase.adminClientTest.message}</p>
                {debugInfo.supabase.adminClientTest.apiTest && (
                  <div className="mt-3 pt-3 border-t border-green-300">
                    {debugInfo.supabase.adminClientTest.apiTest.success ? (
                      <div className="text-sm text-green-700">
                        ✅ {debugInfo.supabase.adminClientTest.apiTest.message}
                      </div>
                    ) : (
                      <div className="text-sm text-red-700">
                        ❌ {debugInfo.supabase.adminClientTest.apiTest.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-yellow-600 font-semibold mb-2">⚠️ Service Role Key Missing</div>
                <p className="text-yellow-700 mb-2">{debugInfo.supabase.adminClientTest.error}</p>
                <div className="text-sm text-yellow-700 mt-2">
                  <p className="font-medium">Required for:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>User signup (bypasses RLS)</li>
                    <li>Server-side admin operations</li>
                    <li>Profile creation during signup</li>
                  </ul>
                  <p className="mt-2">
                    Get it from: Supabase Dashboard → Settings → API → service_role key
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Authentication Test */}
        {debugInfo.supabase.authTest && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Authentication Test</h2>
            <div className={`rounded-lg p-4 ${
              debugInfo.supabase.authTest.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="text-sm space-y-2">
                <div>
                  <span className="font-medium">Status:</span>{' '}
                  {debugInfo.supabase.authTest.success ? '✅ Working' : '⚠️ No Session'}
                </div>
                <div>
                  <span className="font-medium">Message:</span>{' '}
                  {debugInfo.supabase.authTest.message}
                </div>
                {debugInfo.supabase.authTest.hasUser && (
                  <>
                    <div>
                      <span className="font-medium">User ID:</span>{' '}
                      <span className="font-mono text-xs">{debugInfo.supabase.authTest.userId}</span>
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>{' '}
                      {debugInfo.supabase.authTest.userEmail}
                    </div>
                  </>
                )}
                {debugInfo.supabase.authTest.error && (
                  <div className="text-red-600">
                    <span className="font-medium">Error:</span>{' '}
                    {debugInfo.supabase.authTest.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Database API Test */}
        {debugInfo.supabase.apiTest && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Database Connectivity Test</h2>
            {debugInfo.supabase.apiTest.success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-green-600 font-semibold mb-2">✅ Success</div>
                <p className="text-green-700">{debugInfo.supabase.apiTest.message}</p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-yellow-600 font-semibold mb-2">⚠️ Query Result</div>
                <p className="text-yellow-700 mb-2">{debugInfo.supabase.apiTest.message}</p>
                {debugInfo.supabase.apiTest.error && (
                  <div className="text-sm text-yellow-700">
                    <div className="font-medium mb-1">Error Details:</div>
                    <div className="font-mono text-xs bg-yellow-100 p-2 rounded break-all">
                      {debugInfo.supabase.apiTest.error}
                    </div>
                    {debugInfo.supabase.apiTest.code && (
                      <div className="mt-1">
                        <span className="font-medium">Code:</span> {debugInfo.supabase.apiTest.code}
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-3 text-sm text-yellow-700">
                  <p className="font-medium">Note:</p>
                  <p>This is normal if you're not authenticated. RLS policies may block queries for unauthenticated users.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Auth Admin Test */}
        {debugInfo.supabase.authAdminTest && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Auth Admin API Test</h2>
            {debugInfo.supabase.authAdminTest.success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-green-600 font-semibold mb-2">✅ Success</div>
                <p className="text-green-700">{debugInfo.supabase.authAdminTest.message}</p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-600 font-semibold mb-2">❌ Failed</div>
                <p className="text-red-700">{debugInfo.supabase.authAdminTest.error || debugInfo.supabase.authAdminTest.message}</p>
              </div>
            )}
          </div>
        )}

        {/* Email Check Section - IMPORTANT FOR TROUBLESHOOTING */}
        <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-orange-300">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Check/Fix User Email</h2>
          <p className="text-orange-700 text-sm mb-4 font-medium">
            If signup fails, the email may already exist in the database from a previous attempt. Check here first!
          </p>
          
          <div className="flex gap-2 mb-4">
            <input
              type="email"
              value={checkEmail}
              onChange={(e) => setCheckEmail(e.target.value)}
              placeholder="Enter email to check..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              onClick={checkUserEmail}
              disabled={emailCheckLoading || !checkEmail}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {emailCheckLoading ? 'Checking...' : 'Check Email'}
            </button>
          </div>

          {emailCheckResult && (
            <div className="mt-4">
              {emailCheckResult.exists ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="text-yellow-800 font-semibold text-lg mb-3">
                    User Found in Database
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                    <div className="text-yellow-700">Email:</div>
                    <div className="font-mono">{emailCheckResult.user?.email}</div>
                    
                    <div className="text-yellow-700">Email Confirmed:</div>
                    <div>{emailCheckResult.user?.emailConfirmed ? '✅ Yes' : '❌ No'}</div>
                    
                    <div className="text-yellow-700">Has Profile:</div>
                    <div>{emailCheckResult.hasProfile ? '✅ Yes' : '❌ No'}</div>
                    
                    <div className="text-yellow-700">Created At:</div>
                    <div className="text-xs">{emailCheckResult.user?.createdAt}</div>
                    
                    <div className="text-yellow-700">Last Sign In:</div>
                    <div className="text-xs">{emailCheckResult.user?.lastSignIn || 'Never'}</div>
                  </div>

                  <div className="bg-yellow-100 p-3 rounded mb-4">
                    <div className="font-medium text-yellow-800 mb-1">Recommendation:</div>
                    <p className="text-yellow-700 text-sm">{emailCheckResult.recommendation}</p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3">
                    <button
                      onClick={deleteUser}
                      disabled={deleteLoading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                    >
                      {deleteLoading ? 'Deleting...' : 'Delete User & Allow Re-signup'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-green-600 font-semibold">✅ No User Found</div>
                  <p className="text-green-700 text-sm mt-1">
                    {emailCheckResult.message || 'This email is available for signup.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {deleteResult && (
            <div className={`mt-4 p-4 rounded-lg ${deleteResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className={`font-semibold ${deleteResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {deleteResult.success ? '✅ ' : '❌ '}{deleteResult.message}
              </div>
            </div>
          )}
        </div>

        {/* Signup Test Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Signup Flow Test</h2>
          <p className="text-gray-600 mb-4">
            Test the complete signup flow by creating and immediately deleting a test user. 
            This will identify if there are any database triggers or RLS policies blocking signup.
          </p>
          
          <button
            onClick={runSignupTest}
            disabled={signupTestLoading}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {signupTestLoading ? 'Testing Signup...' : 'Run Signup Test'}
          </button>

          {signupTestResult && (
            <div className="mt-6">
              {signupTestResult.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="text-green-600 font-semibold text-lg mb-3">✅ Signup Test Passed!</div>
                  <p className="text-green-700 mb-3">{signupTestResult.message}</p>
                  {signupTestResult.details && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-green-700">User Created:</div>
                      <div>{signupTestResult.details.userCreated ? '✅ Yes' : '❌ No'}</div>
                      <div className="text-green-700">Profile Created:</div>
                      <div>{signupTestResult.details.profileCreated ? '✅ Yes' : '❌ No'}</div>
                      <div className="text-green-700">Test User Cleaned:</div>
                      <div>{signupTestResult.details.testUserCleaned ? '✅ Yes' : '❌ No'}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="text-red-600 font-semibold text-lg mb-3">❌ Signup Test Failed</div>
                  
                  {signupTestResult.step && (
                    <div className="mb-3">
                      <span className="font-medium text-red-700">Failed at step:</span>{' '}
                      <span className="text-red-600">{signupTestResult.step}</span>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <span className="font-medium text-red-700">Error:</span>{' '}
                    <span className="text-red-600">{signupTestResult.error}</span>
                  </div>

                  {signupTestResult.errorDetails && (
                    <div className="bg-red-100 rounded p-3 mb-4 text-sm font-mono">
                      <div><strong>Name:</strong> {signupTestResult.errorDetails.name}</div>
                      <div><strong>Status:</strong> {signupTestResult.errorDetails.status}</div>
                      <div><strong>Code:</strong> {signupTestResult.errorDetails.code}</div>
                      <div><strong>Message:</strong> {signupTestResult.errorDetails.message}</div>
                    </div>
                  )}

                  {signupTestResult.diagnosis && (
                    <div className="mb-4">
                      <div className="font-semibold text-red-800 mb-1">Diagnosis:</div>
                      <p className="text-red-700">{signupTestResult.diagnosis}</p>
                    </div>
                  )}

                  {signupTestResult.fix && (
                    <div>
                      <div className="font-semibold text-red-800 mb-2">Fix:</div>
                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-sm whitespace-pre-wrap">{signupTestResult.fix}</pre>
                      </div>
                      <p className="text-sm text-red-600 mt-2">
                        Copy and run this SQL in your Supabase Dashboard → SQL Editor
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Environment Variables */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Environment Variables</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variable</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preview</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Length</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(debugInfo.supabase.envVars).map(([varName, info]) => (
                  <tr key={varName}>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{varName}</td>
                    <td className="px-4 py-3">
                      {info.exists ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✅ Set
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ❌ Missing
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600 break-all">{info.preview}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{info.length} chars</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommendations</h2>
          <div className="space-y-2">
            {debugInfo.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg">{rec.includes('✅') ? '✅' : rec.includes('❌') ? '❌' : rec.includes('⚠️') ? '⚠️' : '📝'}</span>
                <span className="text-sm text-gray-700">{rec.replace(/^[✅❌⚠️📝]\s*/, '')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="font-semibold text-gray-900 mb-1">Supabase Dashboard</div>
              <div className="text-sm text-gray-600">View your project settings and API keys</div>
            </a>
            <a
              href="https://vercel.com/docs/concepts/projects/environment-variables"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="font-semibold text-gray-900 mb-1">Vercel Environment Variables</div>
              <div className="text-sm text-gray-600">Learn how to set environment variables in Vercel</div>
            </a>
            <a
              href="/debug/resend"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="font-semibold text-gray-900 mb-1">Resend Debug Page</div>
              <div className="text-sm text-gray-600">Check Resend email configuration status</div>
            </a>
            <a
              href="/debug/stripe"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="font-semibold text-gray-900 mb-1">Stripe Debug Page</div>
              <div className="text-sm text-gray-600">Check Stripe configuration status</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
