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
  stripe: {
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
      accountId?: string;
      country?: string;
      defaultCurrency?: string;
      chargesEnabled?: boolean;
      payoutsEnabled?: boolean;
      type?: string;
      code?: string;
    } | null;
  };
  recommendations: string[];
  status: 'success' | 'partial' | 'error';
  summary: {
    hasSecretKey: boolean;
    apiWorking: boolean;
    allPriceIdsSet: boolean;
  };
}

export default function StripeDebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  const fetchDebugInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/debug/stripe');
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
              <h1 className="text-3xl font-bold text-gray-900">Stripe API Debug</h1>
              <p className="text-gray-600 mt-2">Diagnostic information for Stripe configuration</p>
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
              <div className="text-sm opacity-70">Secret Key</div>
              <div className="font-semibold">{debugInfo.summary.hasSecretKey ? '✅ Set' : '❌ Missing'}</div>
            </div>
            <div className="bg-white/50 rounded p-3">
              <div className="text-sm opacity-70">API Connection</div>
              <div className="font-semibold">{debugInfo.summary.apiWorking ? '✅ Working' : '❌ Failed'}</div>
            </div>
            <div className="bg-white/50 rounded p-3">
              <div className="text-sm opacity-70">Price IDs</div>
              <div className="font-semibold">{debugInfo.summary.allPriceIdsSet ? '✅ All Set' : '⚠️ Some Missing'}</div>
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

        {/* Stripe Client Test */}
        {debugInfo.stripe.clientTest && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Stripe Client Test</h2>
            {debugInfo.stripe.clientTest.success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-600 font-semibold">✅ Success</span>
                  {debugInfo.stripe.clientTest.keyType && (
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                      {debugInfo.stripe.clientTest.keyType.toUpperCase()} Mode
                    </span>
                  )}
                </div>
                <p className="text-green-700">{debugInfo.stripe.clientTest.message}</p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-600 font-semibold mb-2">❌ Failed</div>
                <p className="text-red-700">{debugInfo.stripe.clientTest.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Stripe API Test */}
        {debugInfo.stripe.apiTest && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Stripe API Connection Test</h2>
            {debugInfo.stripe.apiTest.success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-green-600 font-semibold mb-3">✅ API Connection Successful</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Account ID:</span>
                    <span className="ml-2 font-mono">{debugInfo.stripe.apiTest.accountId}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Country:</span>
                    <span className="ml-2">{debugInfo.stripe.apiTest.country}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Currency:</span>
                    <span className="ml-2">{debugInfo.stripe.apiTest.defaultCurrency?.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Charges Enabled:</span>
                    <span className="ml-2">{debugInfo.stripe.apiTest.chargesEnabled ? '✅' : '❌'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Payouts Enabled:</span>
                    <span className="ml-2">{debugInfo.stripe.apiTest.payoutsEnabled ? '✅' : '❌'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-600 font-semibold mb-2">❌ API Connection Failed</div>
                <p className="text-red-700 mb-2">{debugInfo.stripe.apiTest.error}</p>
                {debugInfo.stripe.apiTest.type && (
                  <div className="text-sm text-red-600">
                    <span className="font-medium">Error Type:</span> {debugInfo.stripe.apiTest.type}
                  </div>
                )}
                {debugInfo.stripe.apiTest.code && (
                  <div className="text-sm text-red-600">
                    <span className="font-medium">Error Code:</span> {debugInfo.stripe.apiTest.code}
                  </div>
                )}
              </div>
            )}
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
                {Object.entries(debugInfo.stripe.envVars).map(([varName, info]) => (
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

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://dashboard.stripe.com/test/apikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="font-semibold text-gray-900 mb-1">Stripe Dashboard</div>
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
          </div>
        </div>
      </div>
    </div>
  );
}
