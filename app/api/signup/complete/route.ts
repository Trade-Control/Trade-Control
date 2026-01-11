import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON.' },
        { status: 400 }
      );
    }
    
    const { 
      user_id,
      organization_name,
      tier,
      operations_pro_level,
      stripe_customer_id,
      stripe_subscription_id,
      base_price,
      total_price,
      current_period_start,
      current_period_end,
      trial_ends_at,
    } = body;

    console.log('📝 Complete signup for user:', user_id);

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!organization_name) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    if (!tier) {
      return NextResponse.json(
        { error: 'Tier is required' },
        { status: 400 }
      );
    }

    console.log('🔧 Calling complete_signup RPC function...');

    // Use the comprehensive database function
    const { data, error: funcError } = await supabase.rpc('complete_signup', {
      p_user_id: user_id,
      p_organization_name: organization_name,
      p_tier: tier,
      p_operations_pro_level: operations_pro_level || null,
      p_stripe_customer_id: stripe_customer_id || null,
      p_stripe_subscription_id: stripe_subscription_id || null,
      p_base_price: base_price || 0,
      p_total_price: total_price || 0,
      p_current_period_start: current_period_start || new Date().toISOString(),
      p_current_period_end: current_period_end || null,
      p_trial_ends_at: trial_ends_at || null,
    });

    if (funcError) {
      console.error('❌ Complete signup RPC error:', funcError);
      
      // Check if function doesn't exist
      if (funcError.message?.includes('function') && funcError.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Database function not found. Please run migration 005_complete_signup_function.sql in Supabase.',
            details: funcError.message 
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: `Signup failed: ${funcError.message}`, details: funcError },
        { status: 500 }
      );
    }

    if (!data) {
      console.error('❌ RPC function returned no data');
      return NextResponse.json(
        { error: 'Signup failed - function returned no data' },
        { status: 500 }
      );
    }

    console.log('✅ Complete signup successful:', data);

    // Parse the result if it's a string
    const result = typeof data === 'string' ? JSON.parse(data) : data;

    return NextResponse.json({ 
      success: true,
      organization_id: result.organization_id,
      subscription_id: result.subscription_id,
      license_id: result.license_id,
      organization: result.organization,
      subscription: result.subscription,
    }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Unexpected error in complete signup:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
