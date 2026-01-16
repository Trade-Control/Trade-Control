import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Vercel Serverless Runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper to check for problematic triggers
async function checkForProblematicTrigger(adminClient: any) {
  try {
    // Query pg_trigger to check if the problematic trigger exists
    const { data, error } = await adminClient.rpc('check_auth_trigger_exists');
    
    if (error) {
      // If RPC doesn't exist, try a direct query
      const { data: triggerData, error: triggerError } = await adminClient
        .from('pg_trigger')
        .select('tgname')
        .eq('tgname', 'on_auth_user_created')
        .limit(1);
      
      // This query will likely fail due to permissions, so we'll return unknown
      return { exists: 'unknown', error: error.message };
    }
    
    return { exists: data, error: null };
  } catch (e: any) {
    return { exists: 'unknown', error: e.message };
  }
}

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

    // Test 7: Check for problematic auth trigger (if admin client available)
    if (serviceRoleKey && supabaseUrl) {
      try {
        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // Try to check if the trigger exists by querying auth users count
        // This is a safer test than actually creating a user
        const { count, error: countError } = await adminClient
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        debugInfo.supabase.triggerTest = {
          profilesTableAccessible: !countError,
          profilesCount: count || 0,
          error: countError?.message || null,
        };

        // Test the auth admin API by listing users (doesn't create anything)
        try {
          const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({
            page: 1,
            perPage: 1,
          });

          debugInfo.supabase.authAdminTest = {
            success: !usersError,
            message: usersError ? usersError.message : 'Auth Admin API is accessible',
            usersCount: usersData?.users?.length || 0,
          };

          if (!usersError) {
            debugInfo.recommendations.push('✅ Auth Admin API is working (can list users)');
          } else {
            debugInfo.recommendations.push(`❌ Auth Admin API error: ${usersError.message}`);
          }
        } catch (authAdminError: any) {
          debugInfo.supabase.authAdminTest = {
            success: false,
            error: authAdminError.message,
          };
          debugInfo.recommendations.push(`❌ Auth Admin API test failed: ${authAdminError.message}`);
        }

      } catch (triggerTestError: any) {
        debugInfo.supabase.triggerTest = {
          error: triggerTestError.message,
        };
      }
    }

    // Overall status
    const hasUrl = !!supabaseUrl;
    const hasAnonKey = !!supabaseAnonKey;
    const hasServiceRole = !!serviceRoleKey;
    const clientWorking = debugInfo.supabase.clientTest?.success === true;
    const serverClientWorking = debugInfo.supabase.serverClientTest?.success === true;
    const adminClientWorking = debugInfo.supabase.adminClientTest?.success === true;
    const apiWorking = debugInfo.supabase.apiTest?.success === true;
    const authAdminWorking = debugInfo.supabase.authAdminTest?.success === true;
    
    let status: 'success' | 'partial' | 'error' = 'error';
    if (hasUrl && hasAnonKey && clientWorking && serverClientWorking) {
      if (hasServiceRole && adminClientWorking && apiWorking && authAdminWorking) {
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
      authAdminWorking,
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

/**
 * POST handler to test signup process
 * This creates a test user and immediately deletes it to verify the auth flow works
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email } = body;

    if (!['test-signup', 'check-email', 'delete-user'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use: test-signup, check-email, or delete-user' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing required environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasServiceRole: !!serviceRoleKey,
        },
      }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Handle check-email action
    if (action === 'check-email') {
      if (!email) {
        return NextResponse.json({ error: 'Email is required for check-email action' }, { status: 400 });
      }

      const result = await checkExistingUser(adminClient, email);
      
      if (result.exists) {
        // Also check if profile exists
        const { data: profileData } = await adminClient
          .from('profiles')
          .select('id, first_name, last_name, organization_id, created_at')
          .eq('id', result.user.id)
          .single();

        return NextResponse.json({
          exists: true,
          user: result.user,
          hasProfile: !!profileData,
          profile: profileData || null,
          recommendation: result.user.emailConfirmed
            ? 'User exists and email is confirmed. They should login instead of signup.'
            : 'User exists but email NOT confirmed. They need to verify their email or you can delete this user and let them sign up again.',
        });
      }

      return NextResponse.json({
        exists: false,
        message: 'No user found with this email. They can sign up.',
      });
    }

    // Handle delete-user action
    if (action === 'delete-user') {
      if (!email) {
        return NextResponse.json({ error: 'Email is required for delete-user action' }, { status: 400 });
      }

      const result = await checkExistingUser(adminClient, email);
      
      if (!result.exists) {
        return NextResponse.json({
          success: false,
          message: 'No user found with this email.',
        });
      }

      // Delete profile first (if exists)
      await adminClient
        .from('profiles')
        .delete()
        .eq('id', result.user.id);

      // Delete auth user
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(result.user.id);
      
      if (deleteError) {
        return NextResponse.json({
          success: false,
          error: deleteError.message,
        });
      }

      return NextResponse.json({
        success: true,
        message: `User ${email} has been deleted. They can now sign up again.`,
        deletedUserId: result.user.id,
      });
    }

    // Handle test-signup action
    // Generate a unique test email
    const testEmail = `debug-test-${Date.now()}@test-delete-me.local`;
    const testPassword = 'TestPassword123!';

    console.log('[Debug] Testing signup with:', testEmail);

    // Step 1: Try to create a user - use SAME settings as real signup
    // IMPORTANT: email_confirm: false matches what the real signup does
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: false, // Match real signup - requires email verification
      user_metadata: {
        first_name: 'Debug',
        last_name: 'Test',
        is_debug_test: true,
      },
    });

    if (authError) {
      console.error('[Debug] Auth error:', authError);
      
      // Return detailed error information
      return NextResponse.json({
        success: false,
        step: 'create_user',
        error: authError.message,
        errorDetails: {
          name: authError.name,
          status: authError.status,
          code: (authError as any).code,
          message: authError.message,
        },
        diagnosis: getDiagnosis(authError.message),
        fix: getFix(authError.message),
      }, { status: 200 }); // Return 200 so frontend can read the response
    }

    console.log('[Debug] User created successfully:', authData.user?.id);

    // Step 2: Try to create a profile (this is where the trigger issue usually manifests)
    let profileError = null;
    if (authData.user) {
      const { error: pError } = await adminClient
        .from('profiles')
        .insert({
          id: authData.user.id,
          first_name: 'Debug',
          last_name: 'Test',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      
      profileError = pError;
      if (pError) {
        console.error('[Debug] Profile creation error:', pError);
      }
    }

    // Step 3: Clean up - delete the test user
    if (authData.user) {
      // First delete the profile
      await adminClient
        .from('profiles')
        .delete()
        .eq('id', authData.user.id);

      // Then delete the auth user
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(authData.user.id);
      if (deleteError) {
        console.error('[Debug] Failed to delete test user:', deleteError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Signup test passed! User creation and profile creation are working.',
      details: {
        userCreated: !!authData.user,
        profileCreated: !profileError,
        profileError: profileError?.message || null,
        testUserCleaned: true,
      },
    });

  } catch (error: any) {
    console.error('[Debug] Signup test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      diagnosis: getDiagnosis(error.message),
      fix: getFix(error.message),
    }, { status: 200 });
  }
}

/**
 * Check if an email already exists in the auth system
 */
async function checkExistingUser(adminClient: any, email: string) {
  try {
    // List users and filter by email
    const { data, error } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000, // Get enough to search through
    });

    if (error) {
      return { exists: false, error: error.message };
    }

    const existingUser = data?.users?.find((u: any) => 
      u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      return {
        exists: true,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          emailConfirmed: existingUser.email_confirmed_at ? true : false,
          createdAt: existingUser.created_at,
          lastSignIn: existingUser.last_sign_in_at,
        },
      };
    }

    return { exists: false };
  } catch (e: any) {
    return { exists: false, error: e.message };
  }
}

function getDiagnosis(errorMessage: string): string {
  if (errorMessage.includes('Database error')) {
    return 'A database trigger is failing during user creation. This is usually caused by the on_auth_user_created trigger.';
  }
  if (errorMessage.includes('duplicate key')) {
    return 'A user or profile with this ID already exists.';
  }
  if (errorMessage.includes('permission denied') || errorMessage.includes('RLS')) {
    return 'Row Level Security is blocking the operation. The service_role policy may not be set up correctly.';
  }
  if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
    return 'The profiles table does not exist. Run the database migrations.';
  }
  return 'Unknown error. Check the Supabase logs for more details.';
}

function getFix(errorMessage: string): string {
  if (errorMessage.includes('Database error')) {
    return `Run this SQL in Supabase SQL Editor to fix:

-- Remove the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Add service role policy
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.profiles TO service_role;`;
  }
  if (errorMessage.includes('permission denied') || errorMessage.includes('RLS')) {
    return `Run this SQL in Supabase SQL Editor:

DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.profiles TO service_role;`;
  }
  return 'Check Supabase Dashboard > Logs for detailed error information.';
}
