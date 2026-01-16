import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isAdminClientAvailable } from '@/lib/supabase/admin';

/**
 * Server-side signup endpoint
 * 
 * This endpoint handles user signup using the service_role key to:
 * 1. Create the user in Supabase Auth
 * 2. Create the profile in the profiles table (bypassing RLS)
 * 
 * This is more reliable than the trigger-based approach which can fail
 * in hosted Supabase environments.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if admin client is available
    if (!isAdminClientAvailable()) {
      console.error('Admin client not available - missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json(
        { 
          error: 'Server configuration error. Please contact support.',
          code: 'CONFIG_ERROR'
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email, password, firstName, lastName, phone, selectedTier } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Create admin client
    const supabase = createAdminClient();

    // Helper: find existing user by email
    const findExistingUserByEmail = async () => {
      const { data, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });

      if (error) {
        console.warn('Failed to list users before signup:', error);
        return null;
      }

      return data?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
    };

    // Pre-check: if user exists, decide path
    const existingUser = await findExistingUserByEmail();

    if (existingUser) {
      const isConfirmed = !!existingUser.email_confirmed_at;

      if (isConfirmed) {
        return NextResponse.json(
          {
            error: 'This email is already registered. Please log in instead.',
            code: 'EMAIL_EXISTS',
          },
          { status: 409 }
        );
      }

      // Unconfirmed user exists: clean it up so we can recreate and re-trigger verification
      try {
        // Cascade will clean profile via FK
        const { error: deleteError } = await supabase.auth.admin.deleteUser(
          existingUser.id
        );
        if (deleteError) {
          console.error('Failed to delete unverified user before re-signup:', deleteError);
          return NextResponse.json(
            {
              error: 'A previous unverified account is blocking signup. Please try again.',
              code: 'UNVERIFIED_EXISTS',
              details: deleteError.message,
            },
            { status: 409 }
          );
        }
      } catch (cleanupError: any) {
        console.error('Error cleaning up unverified user:', cleanupError);
        return NextResponse.json(
          {
            error: 'Cleanup failed for an existing unverified account. Please try again.',
            code: 'UNVERIFIED_CLEANUP_FAILED',
            details: cleanupError.message,
          },
          { status: 409 }
        );
      }
    }

    // Step 1: Create user in Supabase Auth
    console.log('Creating user in Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Use Supabase built-in email confirmation
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        selected_tier: selectedTier || null,
      },
    });

    if (authError) {
      console.error('=== SIGNUP AUTH ERROR ===');
      console.error('Full error object:', JSON.stringify(authError, null, 2));
      console.error('Error message:', authError.message);
      console.error('Error status:', authError.status);
      console.error('Error code:', (authError as any).code);
      console.error('Error name:', authError.name);
      console.error('Error stack:', (authError as any).stack);
      console.error('=========================');
      
      // Handle specific auth errors
      if (authError.message?.includes('already registered') || 
          authError.message?.includes('already been registered') ||
          authError.message?.includes('User already registered')) {
        return NextResponse.json(
          { 
            error: 'This email is already registered. Please try logging in instead.',
            code: 'EMAIL_EXISTS'
          },
          { status: 409 }
        );
      }

      if (authError.message?.includes('Invalid email')) {
        return NextResponse.json(
          { error: 'Please enter a valid email address', code: 'INVALID_EMAIL' },
          { status: 400 }
        );
      }

      // Check for database-related errors - ALWAYS return the actual message for debugging
      if (authError.message?.includes('Database error') || 
          authError.message?.includes('database')) {
        return NextResponse.json(
          { 
            error: 'Database connection error. Please try again in a moment.',
            code: 'DB_ERROR',
            // ALWAYS include details for now to debug this issue
            details: authError.message,
            fullError: JSON.stringify(authError),
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { 
          error: authError.message || 'Failed to create account', 
          code: 'AUTH_ERROR',
          // ALWAYS include details for now to debug this issue
          details: authError.message,
          fullError: JSON.stringify(authError),
        },
        { status: 500 }
      );
    }

    if (!authData.user) {
      console.error('No user returned from auth');
      return NextResponse.json(
        { error: 'Failed to create account - no user returned', code: 'AUTH_ERROR' },
        { status: 500 }
      );
    }

    console.log('User created successfully:', authData.user.id);

    // Step 2: Create profile in profiles table
    // Using service_role key, this bypasses RLS
    console.log('Creating profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      
      // Profile creation failed, but user was created
      // We'll log this but still return success since the user exists
      // The ensure-profile endpoint can fix this later
      console.warn('Profile creation failed, but user was created. Profile can be created on login.');
      
      // Don't fail the signup - user was created successfully
      // The ensure-profile API will handle missing profiles on login
    } else {
      console.log('Profile created successfully');
    }

    // Step 3: Built-in verification email sent by Supabase (email_confirm=false)
    
    // Return success response
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      message: 'Account created successfully. Please check your email to verify your account.',
      profileCreated: !profileError,
    });

  } catch (error: any) {
    console.error('Signup error:', error);
    
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred. Please try again.',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
