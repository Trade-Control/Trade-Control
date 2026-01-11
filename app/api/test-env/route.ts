// Cloudflare Pages Edge Runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Test endpoint to verify environment variables are loaded
 * DELETE THIS FILE after testing - it exposes env var info
 * 
 * Cloudflare Pages Route Handler
 */
export async function GET() {
  return Response.json({ 
    testVar: process.env.TEST_VARIABLE,
    stripeKey: process.env.STRIPE_SECRET_KEY,
    allEnvKeys: Object.keys(process.env).filter(k => 
      k.includes('STRIPE') || k.includes('TEST')
    ),
    platform: 'cloudflare-pages'
  });
}
