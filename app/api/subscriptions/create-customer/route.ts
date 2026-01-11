import { NextRequest, NextResponse } from 'next/server';
import { createCustomer } from '@/lib/services/stripe';

// Vercel Serverless Runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API route to create a Stripe customer
 * This keeps the Stripe secret key on the server side
 */
export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
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

    // Pass the key into createCustomer lazily
    const customer = await createCustomer({
      email,
      name,
      metadata,
      secretKeyOverride: stripeSecretKey,
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
