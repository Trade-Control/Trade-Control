import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createUpgradeCheckoutSession } from '@/lib/services/stripe';
import { SubscriptionTier, OperationsProLevel } from '@/lib/types/database.types';

// Vercel Serverless Runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API route to create checkout session for upgrading subscription to Operations Pro
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

    const body = await request.json();
    const { subscriptionId, newTier, operationsProLevel } = body;

    if (!subscriptionId || !newTier || !operationsProLevel) {
      return NextResponse.json(
        { error: 'subscriptionId, newTier, and operationsProLevel are required' },
        { status: 400 }
      );
    }

    // Verify user owns this subscription
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

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found or access denied' },
        { status: 404 }
      );
    }

    if (!subscription.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Stripe subscription ID not found' },
        { status: 400 }
      );
    }

    // Create checkout session for upgrade
    const checkoutSession = await createUpgradeCheckoutSession({
      subscriptionId: subscription.stripe_subscription_id,
      customerId: subscription.stripe_customer_id || '',
      newTier: newTier as SubscriptionTier,
      operationsProLevel: operationsProLevel as OperationsProLevel,
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.sessionId,
    });
  } catch (error: any) {
    console.error('Error creating upgrade checkout session:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create upgrade checkout session',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
