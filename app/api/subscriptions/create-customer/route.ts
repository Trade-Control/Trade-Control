import { NextRequest, NextResponse } from 'next/server';
import { createCustomer } from '@/lib/services/stripe';

/**
 * API route to create a Stripe customer
 * This keeps the Stripe secret key on the server side
 */
export async function POST(request: NextRequest) {
  try {
    // Debug: Log if key exists (not the actual key value for security)
    const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
    const keyPrefix = process.env.STRIPE_SECRET_KEY?.substring(0, 7) || 'missing';
    console.log('[Create Customer] STRIPE_SECRET_KEY check:', { hasStripeKey, keyPrefix });

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[Create Customer] STRIPE_SECRET_KEY is not set in environment');
      return NextResponse.json(
        { 
          error: 'STRIPE_SECRET_KEY is not configured. Please set it in your environment variables. See ROLLOUT_GUIDE.md for instructions.' 
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email, name, metadata } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    const customer = await createCustomer({
      email,
      name,
      metadata,
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    console.error('Error creating Stripe customer:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create Stripe customer',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
