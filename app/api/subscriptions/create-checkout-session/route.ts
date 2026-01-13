import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { SubscriptionTier, OperationsProLevel } from '@/lib/types/database.types';

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
 * API route to create a checkout session for new subscription signups
 * This replaces payment links to ensure proper email validation and redirect
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, tier, operationsProLevel, userId, businessName } = body;

    if (!email || !tier || !userId) {
      return NextResponse.json(
        { error: 'email, tier, and userId are required' },
        { status: 400 }
      );
    }

    if (tier === 'operations_pro' && !operationsProLevel) {
      return NextResponse.json(
        { error: 'operationsProLevel is required for operations_pro tier' },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();

    // Get price IDs
    const basePriceId = process.env.STRIPE_PRICE_ID_OPERATIONS_BASE;
    if (!basePriceId) {
      return NextResponse.json(
        { error: 'STRIPE_PRICE_ID_OPERATIONS_BASE is not configured' },
        { status: 500 }
      );
    }

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: basePriceId,
        quantity: 1,
      },
    ];

    // Add Operations Pro tier if applicable
    if (tier === 'operations_pro') {
      let proPriceId: string | undefined;
      
      if (operationsProLevel === 'scale') {
        proPriceId = process.env.STRIPE_PRICE_ID_OPERATIONS_PRO_SCALE;
      } else if (operationsProLevel === 'unlimited') {
        proPriceId = process.env.STRIPE_PRICE_ID_OPERATIONS_PRO_UNLIMITED;
      }

      if (!proPriceId) {
        return NextResponse.json(
          { error: `Price ID not configured for operations_pro ${operationsProLevel}` },
          { status: 500 }
        );
      }

      lineItems.push({
        price: proPriceId,
        quantity: 1,
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: email, // Pre-fill and lock the email
      mode: 'subscription',
      line_items: lineItems,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata: {
        action: 'new_subscription',
        user_id: userId,
        business_name: businessName || '',
        tier,
        operations_pro_level: operationsProLevel || '',
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          user_id: userId,
          business_name: businessName || '',
          tier,
          operations_pro_level: operationsProLevel || '',
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://trade-control.vercel.app'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://trade-control.vercel.app'}/subscribe`,
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error creating subscription checkout session:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create subscription checkout session',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
