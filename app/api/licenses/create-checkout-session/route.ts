import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    // Always create Stripe checkout session for license additions
    // This ensures payment authorization and proper billing through Stripe
    const stripe = getStripeClient();
    
    // Try to get Price ID from environment, or create product/price programmatically
    let priceId = licenseType === 'management'
      ? process.env.STRIPE_PRICE_ID_MANAGEMENT_LICENSE
      : process.env.STRIPE_PRICE_ID_FIELD_STAFF_LICENSE;

    // If Price ID not configured, create product and price programmatically
    if (!priceId) {
      const productName = licenseType === 'management' 
        ? 'Management License' 
        : 'Field Staff License';
      const unitAmount = licenseType === 'management' ? 3500 : 1500; // in cents AUD

      // Check if product already exists
      const products = await stripe.products.list({ 
        limit: 100,
        active: true 
      });
      
      let product = products.data.find(p => 
        p.name === productName && p.metadata?.license_type === licenseType
      );

      // Create product if it doesn't exist
      if (!product) {
        product = await stripe.products.create({
          name: productName,
          description: `Monthly subscription for ${productName.toLowerCase()}`,
          metadata: {
            license_type: licenseType,
            created_by: 'trade_control_app',
          },
        });
      }

      // Check if price already exists for this product
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
        type: 'recurring',
      });

      let price = prices.data.find(p => 
        p.unit_amount === unitAmount && 
        p.currency === 'aud' &&
        p.recurring?.interval === 'month'
      );

      // Create price if it doesn't exist
      if (!price) {
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: unitAmount,
          currency: 'aud',
          recurring: {
            interval: 'month',
          },
          metadata: {
            license_type: licenseType,
          },
        });
      }

      priceId = price.id;
      console.log(`Created/found ${productName} Price ID: ${priceId}`);
    }

    // Get subscription to calculate pro-rata amount
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    const periodStart = new Date(stripeSubscription.current_period_start * 1000);
    const periodEnd = new Date(stripeSubscription.current_period_end * 1000);
    const daysRemaining = Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const licensePrice = licenseType === 'management' ? 35 : 15; // in dollars
    const monthlyPriceCents = licensePrice * 100;
    const proRataAmount = Math.round((monthlyPriceCents * daysRemaining / totalDays) * (quantity || 1));

    // Create checkout session in payment mode to charge pro-rata amount immediately
    // After payment, webhook will add subscription items to existing subscription using the Price ID
    const session = await stripe.checkout.sessions.create({
      customer: subscription.stripe_customer_id || '',
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: `${licenseType === 'management' ? 'Management' : 'Field Staff'} License${(quantity || 1) > 1 ? 's' : ''} (Pro-rated)`,
              description: `Add ${quantity || 1} ${licenseType === 'management' ? 'Management' : 'Field Staff'} license${(quantity || 1) > 1 ? 's' : ''} to your subscription. Pro-rated charge for ${daysRemaining} days remaining in billing period.`,
            },
            unit_amount: proRataAmount / (quantity || 1),
          },
          quantity: quantity || 1,
        },
      ],
      metadata: {
        action: 'add_license',
        subscription_id: subscription.stripe_subscription_id,
        license_type: licenseType,
        quantity: (quantity || 1).toString(),
        organization_id: profile.organization_id,
        db_subscription_id: subscription.id,
        price_id: priceId, // This Price ID will be used to add recurring subscription item
        user_id: user.id,
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
