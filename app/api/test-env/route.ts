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
  return Response.json({ 
    testVar: process.env.TEST_VARIABLE,
    stripeKey: process.env.STRIPE_SECRET_KEY,
    allEnvKeys: Object.keys(process.env).filter(k => 
      k.includes('STRIPE') || k.includes('TEST')
    )
  });
}
