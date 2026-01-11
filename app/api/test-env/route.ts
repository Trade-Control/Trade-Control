// Force node runtime and no caching to read env at request time
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Test endpoint to verify environment variables are loaded
 * DELETE THIS FILE after testing - it exposes env var info
 * 
 * Following Vercel's recommended pattern for App Router Route Handlers
 */
export async function GET() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  
  return Response.json({ 
    hasKey: !!stripeKey, 
    keyLength: stripeKey?.length || 0,
    keyPrefix: stripeKey?.substring(0, 10) || 'MISSING',
    startsWithSkTest: stripeKey?.startsWith('sk_test_') || false,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
  });
}
