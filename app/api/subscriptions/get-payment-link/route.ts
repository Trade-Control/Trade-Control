import { NextRequest, NextResponse } from 'next/server';
import { getPaymentLinkForTier } from '@/lib/services/stripe';
import { SubscriptionTier, OperationsProLevel } from '@/lib/types/database.types';

// Vercel Serverless Runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API route to get payment link URL for a subscription tier
 * This keeps the payment link URLs on the server side
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tier, operationsProLevel } = body;

    if (!tier) {
      return NextResponse.json(
        { error: 'Tier is required' },
        { status: 400 }
      );
    }

    const paymentLink = getPaymentLinkForTier(
      tier as SubscriptionTier,
      operationsProLevel as OperationsProLevel | undefined
    );

    if (!paymentLink) {
      return NextResponse.json(
        { 
          error: 'Payment Link not configured. Please set STRIPE_PAYMENT_LINK_* environment variables.',
          tier,
          operationsProLevel
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      paymentLink,
      tier,
      operationsProLevel 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error getting payment link:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to get payment link',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
