import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isAdminClientAvailable } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Ensure Profile Exists endpoint
 * 
 * SECURITY: This endpoint extracts the userId from the verified JWT session,
 * NOT from the request body. This prevents malicious users from creating
 * profiles for other users.
 * 
 * This endpoint checks if a profile exists for the authenticated user and creates
 * one if it doesn't exist. This handles the case where:
 * 1. A user signed up before this fix was implemented
 * 2. Profile creation failed during signup (trigger didn't fire)
 * 
 * Called after successful login to ensure the user has a profile.
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get user from authenticated session, not request body
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { 
          error: 'You must be logged in to ensure profile',
          code: 'AUTH_ERROR'
        },
        { status: 401 }
      );
    }

    // Extract userId from verified session - NEVER trust request body for userId
    const userId = user.id;
    const userEmail = user.email;
    
    // Check if admin client is available for profile operations
    if (!isAdminClientAvailable()) {
      console.error('Admin client not available - missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          code: 'CONFIG_ERROR'
        },
        { status: 500 }
      );
    }

    // Create admin client for profile operations (bypasses RLS)
    const supabase = createAdminClient();

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is expected if profile doesn't exist
      console.error('Error checking profile:', checkError);
      return NextResponse.json(
        { error: 'Failed to check profile', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // If profile exists, return it
    if (existingProfile) {
      return NextResponse.json({
        success: true,
        profileExists: true,
        profile: existingProfile,
        message: 'Profile already exists',
      });
    }

    // Profile doesn't exist, create it

    // Get user details from the authenticated session's metadata
    const userMetadata = user.user_metadata || {};
    const userFirstName = userMetadata.first_name || 'Unknown';
    const userLastName = userMetadata.last_name || 'User';
    const userPhone = userMetadata.phone || null;

    // Create the profile
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        first_name: userFirstName,
        last_name: userLastName,
        phone: userPhone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Profile creation error:', createError);
      
      // Check if it's a duplicate key error (profile was created in a race condition)
      if (createError.code === '23505') {
        // Profile was created by another request, fetch it
        const { data: raceProfile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('id', userId)
          .single();
        
        if (raceProfile) {
          return NextResponse.json({
            success: true,
            profileExists: true,
            profile: raceProfile,
            message: 'Profile exists (created by concurrent request)',
          });
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to create profile', code: 'DB_ERROR' },
        { status: 500 }
      );
    }


    return NextResponse.json({
      success: true,
      profileExists: false,
      profileCreated: true,
      profile: newProfile,
      message: 'Profile created successfully',
    });

  } catch (error: any) {
    console.error('Ensure profile error:', error);
    
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
