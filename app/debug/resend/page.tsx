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
  resend: {
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
      keyType?: string;
    } | null;
    apiTest: {
      success: boolean;
      error?: string;
      message?: string;
      domainsCount?: number;
      hasVerifiedDomain?: boolean;
      type?: string;
      code?: string | number;
    } | null;
    actualFromEmail?: string;
    isUsingDefault?: boolean;
  };
  recommendations: string[];
  status: 'success' | 'partial' | 'error';
  summary: {
    hasApiKey: boolean;
    apiWorking: boolean;
    hasFromEmail: boolean;
    actualFromEmail?: string;
  };
}

export default function ResendDebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  const fetchDebugInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/debug/resend');
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

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/debug/resend/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: testEmail }),
      });

      const result = await response.json();
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Failed to send test email',
      });
    } finally {
      setSendingTest(false);
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
              <h1 className="text-3xl font-bold text-gray-900">Resend Email Debug</h1>
              <p className="text-gray-600 mt-2">Diagnostic information for Resend email configuration</p>
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
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/50 rounded p-3">
              <div className="text-sm opacity-70">API Key</div>
              <div className="font-semibold">{debugInfo.summary.hasApiKey ? '✅ Set' : '❌ Missing'}</div>
            </div>
            <div className="bg-white/50 rounded p-3">
              <div className="text-sm opacity-70">API Connection</div>
              <div className="font-semibold">{debugInfo.summary.apiWorking ? '✅ Working' : '❌ Failed'}</div>
            </div>
            <div className="bg-white/50 rounded p-3">
              <div className="text-sm opacity-70">From Email</div>
              <div className="font-semibold">{debugInfo.summary.hasFromEmail ? '✅ Set' : '⚠️ Using Default'}</div>
              {debugInfo.summary.actualFromEmail && (
                <div className="text-xs opacity-60 mt-1 font-mono break-all">{debugInfo.summary.actualFromEmail}</div>
              )}
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

        {/* Resend Client Test */}
        {debugInfo.resend.clientTest && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Resend Client Test</h2>
            {debugInfo.resend.clientTest.success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-600 font-semibold">✅ Success</span>
                  {debugInfo.resend.clientTest.keyType && (
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                      {debugInfo.resend.clientTest.keyType}
                    </span>
                  )}
                </div>
                <p className="text-green-700">{debugInfo.resend.clientTest.message}</p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-600 font-semibold mb-2">❌ Failed</div>
                <p className="text-red-700">{debugInfo.resend.clientTest.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Resend API Test */}
        {debugInfo.resend.apiTest && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Resend API Connection Test</h2>
            {debugInfo.resend.apiTest.success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-green-600 font-semibold mb-3">✅ API Connection Successful</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {debugInfo.resend.apiTest.domainsCount !== undefined && (
                    <div>
                      <span className="text-gray-600">Domains:</span>
                      <span className="ml-2 font-mono">{debugInfo.resend.apiTest.domainsCount}</span>
                    </div>
                  )}
                  {debugInfo.resend.apiTest.hasVerifiedDomain !== undefined && (
                    <div>
                      <span className="text-gray-600">Verified Domain:</span>
                      <span className="ml-2">{debugInfo.resend.apiTest.hasVerifiedDomain ? '✅ Yes' : '❌ No'}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-green-700 mt-2">{debugInfo.resend.apiTest.message}</p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-600 font-semibold mb-2">❌ API Connection Failed</div>
                <p className="text-red-700 mb-2">{debugInfo.resend.apiTest.error}</p>
                {debugInfo.resend.apiTest.type && (
                  <div className="text-sm text-red-600">
                    <span className="font-medium">Error Type:</span> {debugInfo.resend.apiTest.type}
                  </div>
                )}
                {debugInfo.resend.apiTest.code && (
                  <div className="text-sm text-red-600">
                    <span className="font-medium">Error Code:</span> {debugInfo.resend.apiTest.code}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Current FROM Email Configuration */}
        {debugInfo.resend.actualFromEmail && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current FROM Email Configuration</h2>
            <div className={`rounded-lg p-4 ${
              debugInfo.resend.isUsingDefault 
                ? 'bg-blue-50 border border-blue-200' 
                : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{debugInfo.resend.isUsingDefault ? '📧' : '✅'}</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">
                    {debugInfo.resend.isUsingDefault ? 'Using Default Email' : 'Using Custom Email'}
                  </div>
                  <div className="font-mono text-sm text-gray-700 mb-2 break-all">
                    {debugInfo.resend.actualFromEmail}
                  </div>
                  {debugInfo.resend.isUsingDefault ? (
                    <div className="text-sm text-blue-700">
                      <p>✅ This is the Resend test domain - works immediately for testing (100 emails/day)</p>
                      <p className="mt-1">To use a custom domain, verify it in Resend Dashboard and set RESEND_FROM_EMAIL</p>
                    </div>
                  ) : (
                    <div className="text-sm text-green-700">
                      <p>✅ Custom FROM email is configured</p>
                      <p className="mt-1">Make sure this domain is verified in Resend Dashboard</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
                {Object.entries(debugInfo.resend.envVars).map(([varName, info]) => (
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
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{info.preview}</td>
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

        {/* Test Email Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Email Sending</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send test email to:
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <button
                  onClick={handleSendTestEmail}
                  disabled={sendingTest || !testEmail}
                  className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingTest ? 'Sending...' : 'Send Test'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This will send a test email to verify Resend is working correctly
              </p>
            </div>

            {testResult && (
              <div className={`rounded-lg p-4 ${
                testResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {testResult.success ? (
                  <div>
                    <div className="text-green-600 font-semibold mb-2">✅ Test Email Sent Successfully!</div>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>Email ID: {testResult.emailId}</p>
                      <p>From: {testResult.from}</p>
                      <p>To: {testResult.to}</p>
                      <p className="mt-2">Check your inbox (and spam folder) for the test email.</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-red-600 font-semibold mb-2">❌ Failed to Send Test Email</div>
                    <div className="text-sm text-red-700 mb-2">{testResult.error}</div>
                    {testResult.recommendations && testResult.recommendations.length > 0 && (
                      <div className="mt-3">
                        <div className="font-medium mb-1">Recommendations:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {testResult.recommendations.map((rec: string, idx: number) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📧 Important Notes:</h3>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li><strong>Free Tier:</strong> Use <code className="bg-blue-100 px-1 rounded">onboarding@resend.dev</code> as FROM email (100 emails/day limit)</li>
                <li><strong>Production:</strong> Verify your domain in Resend Dashboard to use custom email addresses</li>
                <li><strong>Domain Verification:</strong> Go to Resend Dashboard → Domains → Add Domain → Verify DNS records</li>
                <li>If emails aren't sending, check the error message above for specific guidance</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://resend.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="font-semibold text-gray-900 mb-1">Resend Dashboard</div>
              <div className="text-sm text-gray-600">View your API keys and account settings</div>
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
              href="/debug/stripe"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="font-semibold text-gray-900 mb-1">Stripe Debug Page</div>
              <div className="text-sm text-gray-600">Check Stripe configuration status</div>
            </a>
            <a
              href="https://resend.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="font-semibold text-gray-900 mb-1">Resend Documentation</div>
              <div className="text-sm text-gray-600">Learn how to use Resend API</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
