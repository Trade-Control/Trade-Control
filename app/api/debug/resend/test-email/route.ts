import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Vercel Serverless Runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Resend Test Email API Route
 * 
 * This endpoint sends a test email to verify Resend is working correctly.
 * Use this to debug email sending issues.
 */
export async function POST(request: NextRequest) {
  try {
    const { to, from } = await request.json();

    if (!to) {
      return NextResponse.json(
        { error: 'Email address (to) is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    // Determine FROM email
    // Resend free tier allows: onboarding@resend.dev
    // For production, you need a verified domain
    let fromEmail = from || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    
    // If using custom domain format, extract email or use Resend test domain
    if (fromEmail.includes('@') && !fromEmail.includes('resend.dev') && !fromEmail.includes('onboarding@resend.dev')) {
      // Check if domain is verified - if not, fall back to Resend test domain
      fromEmail = 'onboarding@resend.dev';
    }

    // Send test email
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: to,
      subject: 'Test Email from Trade Control',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Test Email Successful!</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>This is a test email from Trade Control to verify that Resend email service is working correctly.</p>
              <div class="success">
                <strong>Email Details:</strong><br>
                From: ${fromEmail}<br>
                To: ${to}<br>
                Sent: ${new Date().toLocaleString()}<br>
                Status: Success ✅
              </div>
              <p>If you received this email, your Resend configuration is working correctly!</p>
              <p>Best regards,<br>Trade Control</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend test email error:', error);
      
      // Provide helpful error messages
      let errorMessage = error.message || 'Unknown error';
      let recommendations: string[] = [];

      if (error.message?.includes('domain') || error.message?.includes('not verified')) {
        errorMessage = 'Domain not verified. Resend requires verified domains for custom email addresses.';
        recommendations.push('Use onboarding@resend.dev for testing (free tier)');
        recommendations.push('Or verify your domain in Resend Dashboard > Domains');
      } else if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
        errorMessage = 'API key authentication failed';
        recommendations.push('Check if RESEND_API_KEY is correct in Vercel environment variables');
        recommendations.push('Verify API key in Resend Dashboard');
      } else if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
        errorMessage = 'Rate limit exceeded';
        recommendations.push('Resend free tier allows 100 emails/day');
        recommendations.push('Check your usage in Resend Dashboard');
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          recommendations,
          details: error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      emailId: data?.id,
      from: fromEmail,
      to: to,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Test email error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send test email',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
