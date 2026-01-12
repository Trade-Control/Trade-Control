import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addLicense } from '@/lib/services/stripe';
import Stripe from 'stripe';

// Vercel Serverless Runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  });
}

/**
 * API route to create checkout session for adding licenses
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
    const { subscriptionId, licenseType, quantity } = body;

    if (!subscriptionId || !licenseType) {
      return NextResponse.json(
        { error: 'subscriptionId and licenseType are required' },
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

    // Check if subscription has payment method
    const stripe = getStripeClient();
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    const hasPaymentMethod = stripeSubscription.default_payment_method !== null;

    if (hasPaymentMethod) {
      // Payment method exists - add license directly via API
      const licenseItem = await addLicense({
        subscriptionId: subscription.stripe_subscription_id,
        licenseType: licenseType as 'management' | 'field_staff',
        quantity: quantity || 1,
      });

      // Create licenses in database
      const licensesToCreate = Array.from({ length: quantity || 1 }, () => ({
        organization_id: profile.organization_id,
        license_type: licenseType,
        stripe_subscription_item_id: licenseItem.id,
        status: 'active' as const,
        monthly_cost: licenseType === 'management' ? 35 : 15,
      }));

      const { error: insertError } = await supabase
        .from('licenses')
        .insert(licensesToCreate);

      if (insertError) {
        throw insertError;
      }

      // Update subscription total price
      const licensePrice = licenseType === 'management' ? 35 : 15;
      const newTotalPrice = subscription.total_price + (licensePrice * (quantity || 1));
      await supabase
        .from('subscriptions')
        .update({ total_price: newTotalPrice })
        .eq('id', subscription.id);

      return NextResponse.json({ 
        success: true, 
        licenseItem,
        message: 'License added successfully' 
      });
    }

    // No payment method - create checkout session to collect it
    const priceId = licenseType === 'management'
      ? process.env.STRIPE_PRICE_ID_MANAGEMENT_LICENSE
      : process.env.STRIPE_PRICE_ID_FIELD_STAFF_LICENSE;

    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for ${licenseType} license` },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: subscription.stripe_customer_id || '',
      mode: 'setup', // Collect payment method without charging
      payment_method_types: ['card'],
      metadata: {
        action: 'add_license',
        subscription_id: subscription.stripe_subscription_id,
        license_type: licenseType,
        quantity: (quantity || 1).toString(),
        organization_id: profile.organization_id,
        db_subscription_id: subscription.id,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://trade-control.vercel.app'}/licenses/add/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://trade-control.vercel.app'}/licenses/add`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating license checkout session:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create license checkout session',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
