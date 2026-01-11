/**
 * Client-side Email Service
 * 
 * This module provides client-side functions for sending emails.
 * It calls the server-side API route where RESEND_API_KEY is available.
 * 
 * Use this in 'use client' components instead of importing from resend.ts directly.
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  to?: string;
  from?: string;
  subject?: string;
  error?: string;
}

/**
 * Send email via API route (client-side safe)
 * 
 * This function calls the /api/email/send endpoint which has access to RESEND_API_KEY.
 * Use this in client components instead of importing sendEmail from resend.ts.
 */
export async function sendEmailClient(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }

    return {
      success: true,
      id: result.id,
      to: result.to,
      from: result.from,
      subject: result.subject,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

// Re-export template generators for convenience (these don't use env vars, so they're safe client-side)
export { 
  generateQuoteEmail, 
  generateInvoiceEmail,
  generateJobAssignmentEmail,
  generateComplianceReminderEmail,
  generateUserInvitationEmail,
} from './resend';
