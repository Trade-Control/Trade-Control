import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';

// Vercel Serverless Runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Default FROM email - Resend free tier requires onboarding@resend.dev for unverified domains
const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

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
    const { to, subject, html, from, replyTo } = body;

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
    const fromEmail = from || DEFAULT_FROM_EMAIL;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: to,
      subject: subject,
      html: html,
      replyTo: replyTo,
    });

    if (error) {
      console.error('Resend email error:', error);
      
      // Provide helpful error messages
      let errorMessage = error.message || 'Unknown error';
      
      if (error.message?.includes('domain') || error.message?.includes('not verified')) {
        errorMessage = `Domain not verified: ${fromEmail}. Use onboarding@resend.dev for testing or verify your domain in Resend Dashboard.`;
      } else if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
        errorMessage = 'Resend API authentication failed. Check your RESEND_API_KEY.';
      } else if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
        errorMessage = 'Resend rate limit exceeded. Free tier allows 100 emails/day.';
      }
      
      return NextResponse.json(
        { error: `Failed to send email: ${errorMessage}` },
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
