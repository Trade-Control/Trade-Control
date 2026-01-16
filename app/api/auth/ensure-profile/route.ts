import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isAdminClientAvailable } from '@/lib/supabase/admin';

/**
 * Ensure Profile Exists endpoint
 * 
 * This endpoint checks if a profile exists for the given user and creates
 * one if it doesn't exist. This handles the case where:
 * 1. A user signed up before this fix was implemented
 * 2. Profile creation failed during signup
 * 
 * Called after successful login to ensure the user has a profile.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if admin client is available
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

    // Parse request body
    const body = await request.json();
    const { userId, email, firstName, lastName, phone } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Create admin client
    const supabase = createAdminClient();

    // Check if profile already exists
    console.log('Checking if profile exists for user:', userId);
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
      console.log('Profile already exists:', existingProfile.id);
      return NextResponse.json({
        success: true,
        profileExists: true,
        profile: existingProfile,
        message: 'Profile already exists',
      });
    }

    // Profile doesn't exist, create it
    console.log('Creating profile for user:', userId);

    // Get user details from auth if not provided
    let userFirstName = firstName;
    let userLastName = lastName;
    let userPhone = phone;

    if (!userFirstName || !userLastName) {
      // Try to get from auth user metadata
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
      
      if (!authError && authUser?.user?.user_metadata) {
        userFirstName = userFirstName || authUser.user.user_metadata.first_name || 'Unknown';
        userLastName = userLastName || authUser.user.user_metadata.last_name || 'User';
        userPhone = userPhone || authUser.user.user_metadata.phone || null;
      }
    }

    // Create the profile
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        first_name: userFirstName || 'Unknown',
        last_name: userLastName || 'User',
        phone: userPhone || null,
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

    console.log('Profile created successfully:', newProfile.id);

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
