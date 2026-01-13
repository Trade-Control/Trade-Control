import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Vercel Serverless Runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe Debug API Route
 * 
 * This endpoint helps debug Stripe configuration issues in Vercel.
 * It checks environment variables and tests Stripe API connectivity.
 */
export async function GET(request: NextRequest) {
  try {
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      vercel: {
        isVercel: !!process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV,
        vercelUrl: process.env.VERCEL_URL,
      },
      stripe: {
        envVars: {} as Record<string, any>,
        clientTest: null as any,
        apiTest: null as any,
      },
      recommendations: [] as string[],
    };

    // Check all Stripe-related environment variables
    const stripeEnvVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_PRICE_ID_OPERATIONS_BASE',
      'STRIPE_PRICE_ID_MANAGEMENT_LICENSE',
      'STRIPE_PRICE_ID_FIELD_STAFF_LICENSE',
      'STRIPE_PRICE_ID_OPERATIONS_PRO_SCALE',
      'STRIPE_PRICE_ID_OPERATIONS_PRO_UNLIMITED',
      'STRIPE_PAYMENT_LINK_OPERATIONS',
      'STRIPE_PAYMENT_LINK_OPERATIONS_PRO_SCALE',
      'STRIPE_PAYMENT_LINK_OPERATIONS_PRO_UNLIMITED',
    ];

    stripeEnvVars.forEach((varName) => {
      const value = process.env[varName];
      let preview = 'NOT_SET';
      
      if (value) {
        if (varName.includes('SECRET') || varName.includes('KEY')) {
          // For secret keys, show first 7 and last 4 chars
          preview = `${value.substring(0, 7)}...${value.substring(value.length - 4)}`;
        } else if (varName.includes('PAYMENT_LINK')) {
          // For payment links (URLs), show first 50 chars to see the domain
          preview = value.length > 50 ? `${value.substring(0, 50)}...` : value;
        } else {
          // For other variables (Price IDs, etc.), show first 20 chars
          preview = value.substring(0, 20);
        }
      }
      
      debugInfo.stripe.envVars[varName] = {
        exists: !!value,
        length: value?.length || 0,
        prefix: value?.substring(0, 10) || 'NOT_SET',
        preview,
      };
    });

    // Test 1: Check if STRIPE_SECRET_KEY exists and is valid format
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      debugInfo.stripe.clientTest = {
        success: false,
        error: 'STRIPE_SECRET_KEY is not set',
      };
      debugInfo.recommendations.push(
        '❌ STRIPE_SECRET_KEY is missing. Add it in Vercel Dashboard > Settings > Environment Variables'
      );
    } else if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
      debugInfo.stripe.clientTest = {
        success: false,
        error: 'STRIPE_SECRET_KEY format is invalid. Should start with sk_test_ or sk_live_',
      };
      debugInfo.recommendations.push(
        '❌ STRIPE_SECRET_KEY format is invalid. Make sure you copied the full secret key from Stripe Dashboard'
      );
    } else {
      // Test 2: Try to create Stripe client
      try {
        const stripe = new Stripe(secretKey, {
          apiVersion: '2025-02-24.acacia',
        });
        
        debugInfo.stripe.clientTest = {
          success: true,
          message: 'Stripe client created successfully',
          keyType: secretKey.startsWith('sk_test_') ? 'test' : 'live',
        };

        // Test 3: Try a simple API call (retrieve balance to test connectivity)
        try {
          const balance = await stripe.balance.retrieve();
          debugInfo.stripe.apiTest = {
            success: true,
            message: 'Stripe API connection successful',
            accountId: 'Connected Account',
            country: null,
            defaultCurrency: balance.available?.[0]?.currency || balance.available?.[0]?.currency || null,
            chargesEnabled: null,
            payoutsEnabled: null,
          };
          debugInfo.recommendations.push('✅ Stripe API connection is working correctly');
        } catch (apiError: any) {
          debugInfo.stripe.apiTest = {
            success: false,
            error: apiError.message,
            type: apiError.type,
            code: apiError.code,
          };
          
          if (apiError.type === 'StripeAuthenticationError') {
            debugInfo.recommendations.push(
              '❌ Stripe authentication failed. Check if your API key is correct and active in Stripe Dashboard'
            );
          } else if (apiError.type === 'StripeAPIError') {
            debugInfo.recommendations.push(
              `❌ Stripe API error: ${apiError.message}. Check Stripe Dashboard for account status`
            );
          } else {
            debugInfo.recommendations.push(
              `❌ Unexpected error connecting to Stripe: ${apiError.message}`
            );
          }
        }
      } catch (clientError: any) {
        debugInfo.stripe.clientTest = {
          success: false,
          error: clientError.message,
        };
        debugInfo.recommendations.push(
          `❌ Failed to create Stripe client: ${clientError.message}`
        );
      }
    }

    // Check Price IDs
    const missingPriceIds: string[] = [];
    if (!process.env.STRIPE_PRICE_ID_OPERATIONS_BASE) missingPriceIds.push('STRIPE_PRICE_ID_OPERATIONS_BASE');
    if (!process.env.STRIPE_PRICE_ID_MANAGEMENT_LICENSE) missingPriceIds.push('STRIPE_PRICE_ID_MANAGEMENT_LICENSE');
    if (!process.env.STRIPE_PRICE_ID_FIELD_STAFF_LICENSE) missingPriceIds.push('STRIPE_PRICE_ID_FIELD_STAFF_LICENSE');
    if (!process.env.STRIPE_PRICE_ID_OPERATIONS_PRO_SCALE) missingPriceIds.push('STRIPE_PRICE_ID_OPERATIONS_PRO_SCALE');
    if (!process.env.STRIPE_PRICE_ID_OPERATIONS_PRO_UNLIMITED) missingPriceIds.push('STRIPE_PRICE_ID_OPERATIONS_PRO_UNLIMITED');

    if (missingPriceIds.length > 0) {
      debugInfo.recommendations.push(
        `⚠️ Missing Price IDs: ${missingPriceIds.join(', ')}. These are optional but required for subscription features.`
      );
    }

    // Check Payment Links
    const missingPaymentLinks: string[] = [];
    if (!process.env.STRIPE_PAYMENT_LINK_OPERATIONS) missingPaymentLinks.push('STRIPE_PAYMENT_LINK_OPERATIONS');
    if (!process.env.STRIPE_PAYMENT_LINK_OPERATIONS_PRO_SCALE) missingPaymentLinks.push('STRIPE_PAYMENT_LINK_OPERATIONS_PRO_SCALE');
    if (!process.env.STRIPE_PAYMENT_LINK_OPERATIONS_PRO_UNLIMITED) missingPaymentLinks.push('STRIPE_PAYMENT_LINK_OPERATIONS_PRO_UNLIMITED');

    if (missingPaymentLinks.length > 0) {
      debugInfo.recommendations.push(
        `⚠️ Missing Payment Links: ${missingPaymentLinks.join(', ')}. These are required for the subscription signup flow. Create Payment Links in Stripe Dashboard and add the URLs as environment variables.`
      );
    } else {
      debugInfo.recommendations.push(
        '✅ All Payment Links are configured'
      );
    }

    // Vercel-specific recommendations
    if (process.env.VERCEL) {
      debugInfo.recommendations.push(
        '📝 Vercel detected. Make sure environment variables are set in Vercel Dashboard > Settings > Environment Variables'
      );
      debugInfo.recommendations.push(
        '📝 After adding env vars in Vercel, redeploy your application for changes to take effect'
      );
      debugInfo.recommendations.push(
        '📝 Check that environment variables are set for the correct environment (Production, Preview, Development)'
      );
    }

    // Overall status
    const hasSecretKey = !!secretKey && (secretKey.startsWith('sk_test_') || secretKey.startsWith('sk_live_'));
    const apiWorking = debugInfo.stripe.apiTest?.success === true;
    const allPaymentLinksSet = missingPaymentLinks.length === 0;
    
    debugInfo.status = hasSecretKey && apiWorking && allPaymentLinksSet ? 'success' : hasSecretKey && apiWorking ? 'partial' : 'error';
    debugInfo.summary = {
      hasSecretKey,
      apiWorking,
      allPriceIdsSet: missingPriceIds.length === 0,
      allPaymentLinksSet,
    };

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to run debug checks',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
