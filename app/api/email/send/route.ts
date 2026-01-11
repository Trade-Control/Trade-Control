import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';

// Vercel Serverless Runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Resend's free tier requires this exact format for the FROM address
// This is the ONLY email that works without domain verification
const RESEND_FREE_TIER_FROM = 'Trade Control <onboarding@resend.dev>';

/**
 * Get the FROM email address
 * - Uses "Trade Control <onboarding@resend.dev>" by default (works immediately)
 * - Only uses custom RESEND_FROM_EMAIL if RESEND_DOMAIN_VERIFIED is set to 'true'
 */
function getFromEmail(): string {
  const isDomainVerified = process.env.RESEND_DOMAIN_VERIFIED === 'true';
  const customFromEmail = process.env.RESEND_FROM_EMAIL;
  
  if (isDomainVerified && customFromEmail) {
    return customFromEmail;
  }
  
  // Default to Resend free tier email with proper format
  return RESEND_FREE_TIER_FROM;
}

/**
 * Email Send API Route
 * 
 * This endpoint handles email sending on the server side where RESEND_API_KEY is available.
 * Client components should call this API instead of importing sendEmail directly.
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { to, subject, html, replyTo } = body;

    // Validate required fields
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    // Check API key
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Email service not configured. RESEND_API_KEY is missing.' },
        { status: 500 }
      );
    }

    // Create Resend client and send email
    const resend = new Resend(apiKey);
    
    // Always use the safe FROM email (either verified custom or Resend free tier)
    const fromEmail = getFromEmail();

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: to,
      subject: subject,
      html: html,
      replyTo: replyTo,
    });

    if (error) {
      console.error('Resend email error:', JSON.stringify(error, null, 2));
      
      // Return the actual Resend error for debugging
      // The error object from Resend contains: { name, message, statusCode }
      const errorMessage = error.message || 'Unknown Resend error';
      
      return NextResponse.json(
        { 
          error: `Failed to send email: ${errorMessage}`,
          resendError: error,
          fromEmailUsed: fromEmail,
          toEmail: to,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data?.id || '',
      to: to,
      from: fromEmail,
      subject: subject,
    });
  } catch (error: any) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
