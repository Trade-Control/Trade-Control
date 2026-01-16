import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Diagnostic endpoint to test signup flow programmatically
 * This helps identify where the signup process is failing
 * 
 * Usage:
 * POST /api/debug/signup-test
 * Body: { email: string, password: string, firstName?: string, lastName?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName = 'Test', lastName = 'User' } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      steps: [],
      errors: [],
      warnings: [],
      success: false,
    };

    // Step 1: Attempt signup
    diagnostics.steps.push({
      step: 1,
      name: 'Signup',
      status: 'in_progress',
    });

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (signupError) {
      diagnostics.errors.push({
        step: 1,
        error: signupError.message,
        code: signupError.code,
        status: signupError.status,
      });
      diagnostics.steps[0].status = 'failed';
      diagnostics.steps[0].error = signupError.message;
      
      return NextResponse.json(diagnostics, { status: 500 });
    }

    if (!signupData.user) {
      diagnostics.errors.push({
        step: 1,
        error: 'Signup succeeded but no user returned',
      });
      diagnostics.steps[0].status = 'failed';
      
      return NextResponse.json(diagnostics, { status: 500 });
    }

    diagnostics.steps[0].status = 'success';
    diagnostics.steps[0].userId = signupData.user.id;
    diagnostics.steps[0].email = signupData.user.email;

    // Step 2: Check if profile exists
    diagnostics.steps.push({
      step: 2,
      name: 'Check Profile Exists',
      status: 'in_progress',
    });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', signupData.user.id)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        // No rows returned - profile doesn't exist
        diagnostics.warnings.push({
          step: 2,
          warning: 'Profile does not exist - trigger may have failed',
        });
        diagnostics.steps[1].status = 'warning';
        diagnostics.steps[1].profileExists = false;
      } else {
        diagnostics.errors.push({
          step: 2,
          error: profileError.message,
          code: profileError.code,
        });
        diagnostics.steps[1].status = 'failed';
      }
    } else {
      diagnostics.steps[1].status = 'success';
      diagnostics.steps[1].profileExists = true;
      diagnostics.steps[1].profile = profile;
    }

    // Step 3: Try to create profile if it doesn't exist
    if (!profile) {
      diagnostics.steps.push({
        step: 3,
        name: 'Create Fallback Profile',
        status: 'in_progress',
      });

      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: signupData.user.id,
          first_name: firstName,
          last_name: lastName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (createError) {
        diagnostics.errors.push({
          step: 3,
          error: createError.message,
          code: createError.code,
          hint: createError.hint,
        });
        diagnostics.steps[2].status = 'failed';
      } else {
        diagnostics.steps[2].status = 'success';
        diagnostics.steps[2].message = 'Fallback profile created successfully';
      }
    }

    // Step 4: Try to update profile
    diagnostics.steps.push({
      step: 4,
      name: 'Update Profile',
      status: 'in_progress',
    });

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', signupData.user.id);

    if (updateError) {
      diagnostics.errors.push({
        step: 4,
        error: updateError.message,
        code: updateError.code,
      });
      diagnostics.steps[diagnostics.steps.length - 1].status = 'failed';
    } else {
      diagnostics.steps[diagnostics.steps.length - 1].status = 'success';
    }

    // Final status
    diagnostics.success = diagnostics.errors.length === 0;
    
    // Summary
    diagnostics.summary = {
      userCreated: !!signupData.user,
      profileExists: !!profile || diagnostics.steps[2]?.status === 'success',
      profileUpdated: diagnostics.steps[diagnostics.steps.length - 1]?.status === 'success',
      totalErrors: diagnostics.errors.length,
      totalWarnings: diagnostics.warnings.length,
    };

    return NextResponse.json(diagnostics, {
      status: diagnostics.success ? 200 : 500,
    });
  } catch (error: any) {
    console.error('Diagnostic endpoint error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
