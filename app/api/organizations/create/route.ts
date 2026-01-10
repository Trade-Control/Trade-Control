import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { name, onboarding_completed, user_id } = body;

    console.log('📝 Creating organization with:', { name, onboarding_completed, user_id });

    if (!name) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // Try to get authenticated user (may not exist if email confirmation is required)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('👤 Auth check:', { userId: user?.id, authError: authError?.message });
    
    // Use provided user_id if available (from signup), otherwise use authenticated user
    const targetUserId = user_id || user?.id;
    
    if (!targetUserId) {
      console.error('❌ No user ID available');
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('🔧 Calling RPC function with user_id:', targetUserId);

    // Use the database function to create organization (bypasses RLS)
    const { data, error: funcError } = await supabase.rpc('create_organization_for_signup', {
      p_user_id: targetUserId,
      p_organization_name: name,
      p_onboarding_completed: onboarding_completed ?? false,
    });

    if (funcError) {
      console.error('❌ Organization creation RPC error:', funcError);
      return NextResponse.json(
        { error: `Failed to create organization: ${funcError.message}`, details: funcError },
        { status: 500 }
      );
    }

    console.log('✅ RPC function returned:', { data, dataType: typeof data });

    if (!data) {
      console.error('❌ RPC function returned no data');
      return NextResponse.json(
        { error: 'Organization not created - function returned no data' },
        { status: 500 }
      );
    }

    // The function now returns the full organization as JSONB, so we can use it directly
    // Convert JSONB to plain object if needed
    const organization = typeof data === 'string' ? JSON.parse(data) : data;

    console.log('✅ Organization created successfully:', organization.id);

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Unexpected error creating organization:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: error.stack },
      { status: 500 }
    );
  }
}
