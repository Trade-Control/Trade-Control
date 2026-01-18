import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Vercel Serverless Runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper function to create admin client
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { licenseId, email, firstName, lastName, phone } = body;

    // Validate required fields
    if (!licenseId || !email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the current user from the session to verify they're authorized
    const supabase = await createServerClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current user's profile to verify they're an owner
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', currentUser.id)
      .single();

    if (!currentProfile || currentProfile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can assign licenses' },
        { status: 403 }
      );
    }

    // Get the license to verify it belongs to the same organization
    const { data: license } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', licenseId)
      .single();

    if (!license) {
      return NextResponse.json(
        { error: 'License not found' },
        { status: 404 }
      );
    }

    if (license.organization_id !== currentProfile.organization_id) {
      return NextResponse.json(
        { error: 'License does not belong to your organization' },
        { status: 403 }
      );
    }

    if (license.profile_id) {
      return NextResponse.json(
        { error: 'License is already assigned to a user' },
        { status: 400 }
      );
    }

    // Get organization details for the email
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', license.organization_id)
      .single();

    const companyName = org?.name || 'Your Organization';

    // Get admin client (created lazily)
    const supabaseAdmin = getSupabaseAdmin();

    // Check if a profile exists for this email
    const { data: existingProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email, organization_id')
      .eq('email', email);

    let userId: string;
    let isNewUser = false;
    let resetLink: string | null = null;

    if (existingProfiles && existingProfiles.length > 0) {
      // User already exists
      const existingProfile = existingProfiles[0];
      
      // Check if user belongs to a different organization
      if (existingProfile.organization_id && existingProfile.organization_id !== license.organization_id) {
        return NextResponse.json(
          { error: 'This email is already registered with another organization' },
          { status: 400 }
        );
      }

      userId = existingProfile.id;

      // Update their profile
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          role: license.license_type,
          license_id: license.id,
          organization_id: license.organization_id,
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Profile update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update user profile' },
          { status: 500 }
        );
      }
    } else {
      // Check if auth user exists with this email
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = authUsers?.users?.find(u => u.email === email);

      if (existingAuthUser) {
        // Auth user exists but no profile - create profile
        userId = existingAuthUser.id;

        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            email: email,
            role: license.license_type,
            license_id: license.id,
            organization_id: license.organization_id,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          console.error('Profile creation details:', { userId, firstName, lastName, email, phone, role: license.license_type, license_id: license.id, organization_id: license.organization_id });
          return NextResponse.json(
            { error: `Failed to create user profile: ${profileError.message}` },
            { status: 500 }
          );
        }
      } else {
        // Create new auth user
        isNewUser = true;

        // Generate a secure temporary password
        const tempPassword = crypto.randomUUID() + crypto.randomUUID();

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
          },
        });

        if (createError) {
          console.error('User creation error:', createError);
          return NextResponse.json(
            { error: createError.message || 'Failed to create user' },
            { status: 500 }
          );
        }

        if (!newUser.user) {
          return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
          );
        }

        userId = newUser.user.id;

        // Create profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            email: email,
            role: license.license_type,
            license_id: license.id,
            organization_id: license.organization_id,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          console.error('Profile creation details:', { userId, firstName, lastName, email, phone, role: license.license_type, license_id: license.id, organization_id: license.organization_id });
          // Try to clean up the auth user
          await supabaseAdmin.auth.admin.deleteUser(userId);
          return NextResponse.json(
            { error: `Failed to create user profile: ${profileError.message}` },
            { status: 500 }
          );
        }

        // Generate password reset link
        const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: email,
        });

        if (!resetError && resetData.properties?.action_link) {
          resetLink = resetData.properties.action_link;
        }
      }
    }

    // Assign license to user
    const { error: licenseError } = await supabaseAdmin
      .from('licenses')
      .update({
        profile_id: userId,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', license.id);

    if (licenseError) {
      console.error('License assignment error:', licenseError);
      return NextResponse.json(
        { error: 'Failed to assign license' },
        { status: 500 }
      );
    }

    // Mark organization as onboarding completed
    await supabaseAdmin
      .from('organizations')
      .update({ onboarding_completed: true })
      .eq('id', license.organization_id);

    // Log the action in audit if we have the function
    try {
      await supabaseAdmin.rpc('log_audit_event', {
        p_organization_id: license.organization_id,
        p_user_id: currentUser.id,
        p_action: 'create',
        p_resource_type: 'license_assignment',
        p_resource_id: license.id,
        p_job_id: null,
        p_description: `License assigned to ${firstName} ${lastName} (${email})`,
        p_metadata: { license_type: license.license_type, email },
      });
    } catch {
      // Ignore audit log errors
    }

    return NextResponse.json({
      success: true,
      isNewUser,
      resetLink: isNewUser ? resetLink : null,
      message: isNewUser
        ? `User created and license assigned. ${resetLink ? 'Password reset link generated.' : 'User should use "Forgot Password" to set their password.'}`
        : 'License assigned to existing user.',
    });
  } catch (error: any) {
    console.error('License assignment error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
