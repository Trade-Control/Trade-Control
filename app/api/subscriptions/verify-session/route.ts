import { NextRequest, NextResponse } from 'next/server';
import { verifyCheckoutSession } from '@/lib/services/stripe';
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
 * API route to verify checkout session and extract subscription data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const session = await verifyCheckoutSession(sessionId);

    // Fetch subscription details if available
    let currentPeriodStart = null;
    let currentPeriodEnd = null;
    let trialEnd = null;

    if (session.subscriptionId) {
      try {
        const stripe = getStripeClient();
        const subscription = await stripe.subscriptions.retrieve(session.subscriptionId);
        currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
        currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
      } catch (subError) {
        console.error('Error fetching subscription details:', subError);
        // Continue without subscription details
      }
    }

    return NextResponse.json({
      success: true,
      customerId: session.customerId,
      subscriptionId: session.subscriptionId,
      mode: session.mode,
      metadata: session.metadata,
      paymentStatus: session.paymentStatus,
      status: session.status,
      currentPeriodStart,
      currentPeriodEnd,
      trialEnd,
    });
  } catch (error: any) {
    console.error('Error verifying checkout session:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to verify checkout session',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
