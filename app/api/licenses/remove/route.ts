import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { removeLicense } from '@/lib/services/stripe';
import { getUserPermissionsServer } from '@/lib/middleware/role-check-server';

// Vercel Serverless Runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API route to remove licenses through Stripe
 * 
 * This route removes licenses by deleting the Stripe subscription item.
 * Stripe automatically handles pro-rata credits/refunds and keeps the
 * license active until the current billing period ends.
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has permission (owner role)
    const permissions = await getUserPermissionsServer();
    if (!permissions?.canManageLicenses) {
      return NextResponse.json(
        { error: 'Only owners can remove licenses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { licenseId } = body;

    if (!licenseId) {
      return NextResponse.json(
        { error: 'licenseId is required' },
        { status: 400 }
      );
    }

    // Get license and verify ownership
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', licenseId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (licenseError || !license) {
      return NextResponse.json(
        { error: 'License not found or access denied' },
        { status: 404 }
      );
    }

    // Check if license is assigned (must unassign first)
    if (license.profile_id) {
      return NextResponse.json(
        { error: 'License must be unassigned before removal. Please unassign the license first.' },
        { status: 400 }
      );
    }

    // Check if license is already scheduled for removal
    if (license.scheduled_for_removal) {
      return NextResponse.json(
        { error: 'License is already scheduled for removal' },
        { status: 400 }
      );
    }

    // Check if license has Stripe subscription item ID
    if (!license.stripe_subscription_item_id) {
      return NextResponse.json(
        { error: 'License does not have a Stripe subscription item. Please contact support.' },
        { status: 400 }
      );
    }

    // Get subscription to get period end date
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, current_period_end, total_price')
      .eq('organization_id', profile.organization_id)
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Remove license from Stripe subscription
    // Stripe automatically handles pro-rata and keeps item active until period end
    try {
      await removeLicense(license.stripe_subscription_item_id);
    } catch (stripeError: any) {
      console.error('Error removing license from Stripe:', stripeError);
      return NextResponse.json(
        { error: `Failed to remove license from Stripe: ${stripeError.message}` },
        { status: 500 }
      );
    }

    // Update license in database - mark as scheduled for removal
    const removalDate = subscription.current_period_end 
      ? new Date(subscription.current_period_end)
      : new Date();

    const { error: updateError } = await supabase
      .from('licenses')
      .update({
        scheduled_for_removal: true,
        removal_date: removalDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', licenseId);

    if (updateError) {
      console.error('Error updating license:', updateError);
      return NextResponse.json(
        { error: 'Failed to update license status' },
        { status: 500 }
      );
    }

    // Update subscription total price
    const licensePrice = license.monthly_cost || (license.license_type === 'management' ? 35 : 15);
    const newTotalPrice = Math.max(0, (subscription.total_price || 0) - licensePrice);
    
    await supabase
      .from('subscriptions')
      .update({ 
        total_price: newTotalPrice,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', profile.organization_id);

    return NextResponse.json({ 
      success: true,
      message: 'License scheduled for removal',
      removalDate: removalDate.toISOString(),
    });
  } catch (error: any) {
    console.error('Error removing license:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to remove license',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
