import { NextRequest, NextResponse } from 'next/server';
import { createSubscription } from '@/lib/services/stripe';
import { SubscriptionTier, OperationsProLevel } from '@/lib/types/database.types';

/**
 * API route to create a Stripe subscription
 * This keeps the Stripe secret key on the server side
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { 
          error: 'STRIPE_SECRET_KEY is not configured. Please set it in your environment variables. See ROLLOUT_GUIDE.md for instructions.' 
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { customerId, tier, operationsProLevel, trialDays } = body;

    if (!customerId || !tier) {
      return NextResponse.json(
        { error: 'customerId and tier are required' },
        { status: 400 }
      );
    }

    const subscription = await createSubscription({
      customerId,
      tier: tier as SubscriptionTier,
      operationsProLevel: operationsProLevel as OperationsProLevel | undefined,
      trialDays,
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (error: any) {
    console.error('Error creating Stripe subscription:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create Stripe subscription',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
