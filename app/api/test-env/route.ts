import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to verify environment variables are loaded
 * DELETE THIS FILE after testing - it exposes env var info
 */
export async function GET(request: NextRequest) {
  const stripeVars = Object.keys(process.env)
    .filter(k => k.includes('STRIPE'))
    .reduce((acc, key) => {
      const value = process.env[key];
      acc[key] = value ? `${value.substring(0, 10)}...` : 'NOT_SET';
      return acc;
    }, {} as Record<string, string>);

  const supabaseVars = Object.keys(process.env)
    .filter(k => k.includes('SUPABASE'))
    .reduce((acc, key) => {
      const value = process.env[key];
      acc[key] = value ? `${value.substring(0, 10)}...` : 'NOT_SET';
      return acc;
    }, {} as Record<string, string>);

  return NextResponse.json({
    message: 'Environment variable check',
    nodeEnv: process.env.NODE_ENV,
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7) || 'MISSING',
    stripeVars,
    supabaseVars,
    totalEnvVars: Object.keys(process.env).length,
  });
}
