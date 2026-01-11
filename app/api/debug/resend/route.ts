import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Vercel Serverless Runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Resend Debug API Route
 * 
 * This endpoint helps debug Resend email configuration issues in Vercel.
 * It checks environment variables and tests Resend API connectivity.
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
      resend: {
        envVars: {} as Record<string, any>,
        clientTest: null as any,
        apiTest: null as any,
      },
      recommendations: [] as string[],
    };

    // Check all Resend-related environment variables
    const resendEnvVars = [
      'RESEND_API_KEY',
      'RESEND_FROM_EMAIL',
    ];

    resendEnvVars.forEach((varName) => {
      const value = process.env[varName];
      debugInfo.resend.envVars[varName] = {
        exists: !!value,
        length: value?.length || 0,
        prefix: value?.substring(0, 10) || 'NOT_SET',
        // Show first 7 chars and last 4 chars for API keys (for debugging)
        preview: value 
          ? (varName.includes('KEY')
              ? `${value.substring(0, 7)}...${value.substring(value.length - 4)}`
              : value.substring(0, 30))
          : 'NOT_SET',
      };
    });

    // Test 1: Check if RESEND_API_KEY exists and is valid format
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      debugInfo.resend.clientTest = {
        success: false,
        error: 'RESEND_API_KEY is not set',
      };
      debugInfo.recommendations.push(
        '❌ RESEND_API_KEY is missing. Add it in Vercel Dashboard > Settings > Environment Variables'
      );
    } else if (!apiKey.startsWith('re_')) {
      debugInfo.resend.clientTest = {
        success: false,
        error: 'RESEND_API_KEY format is invalid. Should start with re_',
      };
      debugInfo.recommendations.push(
        '❌ RESEND_API_KEY format is invalid. Make sure you copied the full API key from Resend Dashboard'
      );
    } else {
      // Test 2: Try to create Resend client
      try {
        const resend = new Resend(apiKey);
        
        debugInfo.resend.clientTest = {
          success: true,
          message: 'Resend client created successfully',
          keyType: apiKey.startsWith('re_') ? 'api_key' : 'unknown',
        };

        // Test 3: Try a simple API call (get domains list as a simple API test)
        try {
          // Try to get domains list as a simple API test
          // This doesn't send an email but tests API connectivity
          const domainsResponse = await resend.domains.list();
          
          // Handle different response structures
          const domainsData = Array.isArray(domainsResponse?.data) 
            ? domainsResponse.data 
            : domainsResponse?.data 
              ? [domainsResponse.data] 
              : [];
          
          debugInfo.resend.apiTest = {
            success: true,
            message: 'Resend API connection successful',
            domainsCount: domainsData.length,
            hasVerifiedDomain: domainsData.some((d: any) => d.status === 'verified') || false,
          };
          debugInfo.recommendations.push('✅ Resend API connection is working correctly');
        } catch (apiError: any) {
          // If domains.list fails, try a simpler validation
          // Resend API keys are validated when creating the client, so if we got here, 
          // the client creation succeeded but API call failed
          debugInfo.resend.apiTest = {
            success: false,
            error: apiError.message,
            type: apiError.name || 'UnknownError',
            code: apiError.status || apiError.code,
          };
          
          if (apiError.message?.includes('Unauthorized') || apiError.message?.includes('401')) {
            debugInfo.recommendations.push(
              '❌ Resend authentication failed. Check if your API key is correct and active in Resend Dashboard'
            );
          } else if (apiError.message?.includes('Forbidden') || apiError.message?.includes('403')) {
            debugInfo.recommendations.push(
              '❌ Resend API access forbidden. Check your API key permissions in Resend Dashboard'
            );
          } else {
            debugInfo.recommendations.push(
              `❌ Resend API error: ${apiError.message}. Check Resend Dashboard for account status`
            );
          }
        }
      } catch (clientError: any) {
        debugInfo.resend.clientTest = {
          success: false,
          error: clientError.message,
        };
        debugInfo.recommendations.push(
          `❌ Failed to create Resend client: ${clientError.message}`
        );
      }
    }

    // Check From Email
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!fromEmail) {
      debugInfo.recommendations.push(
        '⚠️ RESEND_FROM_EMAIL is not set. Using default: Trade Control <noreply@tradecontrol.app>'
      );
      debugInfo.recommendations.push(
        '📝 Set RESEND_FROM_EMAIL in Vercel to customize the sender email address'
      );
    } else {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emailMatch = fromEmail.match(/<(.+)>/);
      const emailAddress = emailMatch ? emailMatch[1] : fromEmail;
      
      if (!emailRegex.test(emailAddress)) {
        debugInfo.recommendations.push(
          '⚠️ RESEND_FROM_EMAIL format appears invalid. Use format: "Name <email@domain.com>" or "email@domain.com"'
        );
      } else {
        debugInfo.recommendations.push('✅ RESEND_FROM_EMAIL is configured correctly');
      }
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
    const hasApiKey = !!apiKey && apiKey.startsWith('re_');
    const apiWorking = debugInfo.resend.apiTest?.success === true;
    
    debugInfo.status = hasApiKey && apiWorking ? 'success' : hasApiKey ? 'partial' : 'error';
    debugInfo.summary = {
      hasApiKey,
      apiWorking,
      hasFromEmail: !!fromEmail,
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
