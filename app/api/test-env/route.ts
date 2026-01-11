import { NextRequest, NextResponse } from 'next/server';

// Force node runtime and no caching to read env at request time
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Test endpoint to verify environment variables are loaded
 * DELETE THIS FILE after testing - it exposes env var info
 */
export async function GET(request: NextRequest) {
  // Check for exact key name
  const exactKey = process.env.STRIPE_SECRET_KEY;
  const keyExists = exactKey !== undefined;
  const keyType = typeof exactKey;
  const keyLength = exactKey?.length || 0;
  
  // Check for variations (casing/spaces)
  const allKeys = Object.keys(process.env);
  const stripeRelatedKeys = allKeys.filter(k => 
    k.toLowerCase().includes('stripe') || 
    k.includes('STRIPE') ||
    k.trim() === 'STRIPE_SECRET_KEY'
  );

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
    
    // Detailed STRIPE_SECRET_KEY diagnostics
    stripeSecretKeyCheck: {
      exists: keyExists,
      type: keyType,
      length: keyLength,
      prefix: exactKey?.substring(0, 10) || 'MISSING',
      startsWithSkTest: exactKey?.startsWith('sk_test_') || false,
    },
    
    // All stripe-related keys found
    allStripeKeys: stripeRelatedKeys,
    
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7) || 'MISSING',
    stripeVars,
    supabaseVars,
    totalEnvVars: Object.keys(process.env).length,
    
    // Runtime info
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
  });
}
