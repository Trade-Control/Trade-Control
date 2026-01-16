import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Vercel Serverless Runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Supabase Debug API Route
 * 
 * This endpoint helps debug Supabase authentication and configuration issues.
 * It checks environment variables and tests Supabase connectivity.
 */
export async function GET(request: NextRequest) {
  try {
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      vercel: {
        isVercel: !!process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV,
        vercelUrl: process.env.VERCEL_URL,
      },
      supabase: {
        envVars: {} as Record<string, any>,
        clientTest: null as any,
        serverClientTest: null as any,
        adminClientTest: null as any,
        apiTest: null as any,
        authTest: null as any,
      },
      recommendations: [] as string[],
    };

    // Check all Supabase-related environment variables
    const supabaseEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];

    supabaseEnvVars.forEach((varName) => {
      const value = process.env[varName];
      let preview = 'NOT_SET';
      
      if (value) {
        if (varName.includes('SERVICE_ROLE') || varName.includes('ANON_KEY')) {
          // For keys, show first 7 and last 4 chars
          preview = `${value.substring(0, 7)}...${value.substring(value.length - 4)}`;
        } else if (varName.includes('URL')) {
          // For URLs, show first 30 chars
          preview = value.length > 30 ? `${value.substring(0, 30)}...` : value;
        } else {
          preview = value.substring(0, 20);
        }
      }
      
      debugInfo.supabase.envVars[varName] = {
        exists: !!value,
        length: value?.length || 0,
        prefix: value?.substring(0, 10) || 'NOT_SET',
        preview,
      };
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Test 1: Check if required env vars exist
    if (!supabaseUrl) {
      debugInfo.supabase.clientTest = {
        success: false,
        error: 'NEXT_PUBLIC_SUPABASE_URL is not set',
      };
      debugInfo.recommendations.push(
        '❌ NEXT_PUBLIC_SUPABASE_URL is missing. Add it in Vercel Dashboard > Settings > Environment Variables'
      );
    } else if (!supabaseAnonKey) {
      debugInfo.supabase.clientTest = {
        success: false,
        error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is not set',
      };
      debugInfo.recommendations.push(
        '❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Add it in Vercel Dashboard > Settings > Environment Variables'
      );
    } else {
      // Test 2: Try to create browser client
      try {
        const browserClient = createClient(supabaseUrl, supabaseAnonKey);
        
        debugInfo.supabase.clientTest = {
          success: true,
          message: 'Browser client created successfully',
          url: supabaseUrl,
        };

        // Test 3: Try to create server client
        try {
          const cookieStore = await cookies();
          const serverClient = createServerClient(
            supabaseUrl,
            supabaseAnonKey,
            {
              cookies: {
                getAll() {
                  return cookieStore.getAll();
                },
                setAll() {
                  // No-op for debug endpoint
                },
              },
            }
          );

          debugInfo.supabase.serverClientTest = {
            success: true,
            message: 'Server client created successfully',
          };

          // Test 4: Try a simple API call (get current user)
          try {
            const { data: { user }, error: authError } = await serverClient.auth.getUser();
            
            debugInfo.supabase.authTest = {
              success: true,
              message: authError ? 'Auth check completed (no active session)' : 'Auth check completed',
              hasUser: !!user,
              userId: user?.id || null,
              userEmail: user?.email || null,
              error: authError?.message || null,
            };

            if (!authError) {
              debugInfo.recommendations.push('✅ Supabase authentication is working correctly');
            } else {
              debugInfo.recommendations.push('⚠️ No active user session (this is normal for debug endpoint)');
            }
          } catch (authTestError: any) {
            debugInfo.supabase.authTest = {
              success: false,
              error: authTestError.message,
              type: authTestError.name || 'UnknownError',
            };
            debugInfo.recommendations.push(
              `❌ Auth test failed: ${authTestError.message}`
            );
          }

          // Test 5: Try a simple database query (test RLS and connectivity)
          try {
            const { data, error: queryError } = await serverClient
              .from('profiles')
              .select('id')
              .limit(1);
            
            debugInfo.supabase.apiTest = {
              success: !queryError,
              message: queryError 
                ? `Database query test: ${queryError.message}` 
                : 'Database connectivity test successful',
              error: queryError?.message || null,
              code: queryError?.code || null,
              hasData: Array.isArray(data),
            };

            if (!queryError) {
              debugInfo.recommendations.push('✅ Supabase database connectivity is working');
            } else {
              if (queryError.code === 'PGRST301' || queryError.message?.includes('RLS')) {
                debugInfo.recommendations.push(
                  '⚠️ RLS policy may be blocking query (this is normal if not authenticated)'
                );
              } else {
                debugInfo.recommendations.push(
                  `❌ Database query failed: ${queryError.message}`
                );
              }
            }
          } catch (apiError: any) {
            debugInfo.supabase.apiTest = {
              success: false,
              error: apiError.message,
              type: apiError.name || 'UnknownError',
            };
            debugInfo.recommendations.push(
              `❌ Database connectivity test failed: ${apiError.message}`
            );
          }

        } catch (serverError: any) {
          debugInfo.supabase.serverClientTest = {
            success: false,
            error: serverError.message,
          };
          debugInfo.recommendations.push(
            `❌ Failed to create server client: ${serverError.message}`
          );
        }

      } catch (clientError: any) {
        debugInfo.supabase.clientTest = {
          success: false,
          error: clientError.message,
        };
        debugInfo.recommendations.push(
          `❌ Failed to create browser client: ${clientError.message}`
        );
      }
    }

    // Test 6: Check admin client (service role)
    if (!serviceRoleKey) {
      debugInfo.supabase.adminClientTest = {
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY is not set',
      };
      debugInfo.recommendations.push(
        '⚠️ SUPABASE_SERVICE_ROLE_KEY is missing. This is required for server-side operations like signup. Get it from Supabase Dashboard > Settings > API > service_role key'
      );
    } else if (!supabaseUrl) {
      debugInfo.supabase.adminClientTest = {
        success: false,
        error: 'Cannot test admin client without NEXT_PUBLIC_SUPABASE_URL',
      };
    } else {
      try {
        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });

        debugInfo.supabase.adminClientTest = {
          success: true,
          message: 'Admin client created successfully',
        };

        // Test admin client with a simple query (bypasses RLS)
        try {
          const { data, error: adminError } = await adminClient
            .from('profiles')
            .select('id')
            .limit(1);
          
          if (!adminError) {
            debugInfo.supabase.adminClientTest.apiTest = {
              success: true,
              message: 'Admin client can query database (bypasses RLS)',
            };
            debugInfo.recommendations.push('✅ Admin client (service_role) is working correctly');
          } else {
            debugInfo.supabase.adminClientTest.apiTest = {
              success: false,
              error: adminError.message,
            };
            debugInfo.recommendations.push(
              `❌ Admin client query failed: ${adminError.message}`
            );
          }
        } catch (adminApiError: any) {
          debugInfo.supabase.adminClientTest.apiTest = {
            success: false,
            error: adminApiError.message,
          };
        }

      } catch (adminError: any) {
        debugInfo.supabase.adminClientTest = {
          success: false,
          error: adminError.message,
        };
        debugInfo.recommendations.push(
          `❌ Failed to create admin client: ${adminError.message}. Check if SUPABASE_SERVICE_ROLE_KEY is correct`
        );
      }
    }

    // Validate URL format
    if (supabaseUrl) {
      try {
        const url = new URL(supabaseUrl);
        if (!url.hostname.includes('supabase')) {
          debugInfo.recommendations.push(
            '⚠️ Supabase URL format looks unusual. Make sure it\'s from Supabase Dashboard > Settings > API > Project URL'
          );
        }
      } catch {
        debugInfo.recommendations.push(
          '❌ NEXT_PUBLIC_SUPABASE_URL is not a valid URL format'
        );
      }
    }

    // Validate key formats
    if (supabaseAnonKey && supabaseAnonKey.length < 50) {
      debugInfo.recommendations.push(
        '⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY seems too short. Make sure you copied the full key'
      );
    }

    if (serviceRoleKey && serviceRoleKey.length < 50) {
      debugInfo.recommendations.push(
        '⚠️ SUPABASE_SERVICE_ROLE_KEY seems too short. Make sure you copied the full key'
      );
    }

    // Vercel-specific recommendations
    if (process.env.VERCEL) {
      debugInfo.recommendations.push(
        '📝 Vercel detected. Make sure environment variables are set in Vercel Dashboard > Settings > Environment Variables'
      );
      debugInfo.recommendations.push(
        '📝 After adding env vars in Vercel, redeploy your application for changes to take effect'
      );
      debugInfo.recommendations.push(
        '📝 Check that environment variables are set for the correct environment (Production, Preview, Development)'
      );
    }

    // Overall status
    const hasUrl = !!supabaseUrl;
    const hasAnonKey = !!supabaseAnonKey;
    const hasServiceRole = !!serviceRoleKey;
    const clientWorking = debugInfo.supabase.clientTest?.success === true;
    const serverClientWorking = debugInfo.supabase.serverClientTest?.success === true;
    const adminClientWorking = debugInfo.supabase.adminClientTest?.success === true;
    const apiWorking = debugInfo.supabase.apiTest?.success === true;
    
    let status: 'success' | 'partial' | 'error' = 'error';
    if (hasUrl && hasAnonKey && clientWorking && serverClientWorking) {
      if (hasServiceRole && adminClientWorking && apiWorking) {
        status = 'success';
      } else {
        status = 'partial';
      }
    }
    
    debugInfo.status = status;
    debugInfo.summary = {
      hasUrl,
      hasAnonKey,
      hasServiceRole,
      clientWorking,
      serverClientWorking,
      adminClientWorking,
      apiWorking,
    };

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to run debug checks',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
