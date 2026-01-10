/**
 * Mock Resend Email Service
 * 
 * This provides a complete mock implementation of Resend email functionality
 * for development and testing. Replace with real Resend API calls for production.
 */

import { EmailType } from '../types/database.types';
import { nanoid } from 'nanoid';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Trade Control <noreply@tradecontrol.app>';

/**
 * Mock: Send email via Resend
 */
export async function sendEmail(params: SendEmailParams) {
  console.log('📧 [Resend Mock] Sending email to:', params.to);
  console.log('   Subject:', params.subject);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const messageId = `msg_mock_${nanoid(16)}`;
  
  console.log('✅ [Resend Mock] Email sent successfully');
  console.log('   Message ID:', messageId);
  console.log('   Preview:', params.html.substring(0, 200) + '...');
  
  return {
    id: messageId,
    to: params.to,
    from: params.from || DEFAULT_FROM_EMAIL,
    subject: params.subject,
    status: 'sent',
  };
}

/**
 * Generate contractor job assignment email
 */
export function generateJobAssignmentEmail(data: {
  contractorName: string;
  jobTitle: string;
  jobDescription: string;
  siteAddress: string;
  accessToken: string;
  expiresAt: string;
  companyName: string;
}): EmailTemplate {
  const accessUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/contractor-access/${data.accessToken}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Job Assignment</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #5568d3; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .info-label { font-weight: 600; color: #4b5563; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">New Job Assignment</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.contractorName},</p>
      
      <p>You've been assigned to a new job by <strong>${data.companyName}</strong>.</p>
      
      <div class="info-box">
        <p style="margin: 5px 0;"><span class="info-label">Job:</span> ${data.jobTitle}</p>
        <p style="margin: 5px 0;"><span class="info-label">Location:</span> ${data.siteAddress}</p>
        ${data.jobDescription ? `<p style="margin: 5px 0;"><span class="info-label">Description:</span> ${data.jobDescription}</p>` : ''}
      </div>
      
      <p>Click the button below to view the complete job details and submit your progress:</p>
      
      <div style="text-align: center;">
        <a href="${accessUrl}" class="button">View Job Details</a>
      </div>
      
      <div class="warning">
        <strong>⚠️ Important:</strong> This link will expire on <strong>${new Date(data.expiresAt).toLocaleDateString()}</strong>. Please access it before then.
      </div>
      
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <p style="word-break: break-all; color: #667eea;">${accessUrl}</p>
      
      <p>If you have any questions, please contact ${data.companyName} directly.</p>
      
      <p>Best regards,<br>Trade Control</p>
    </div>
    
    <div class="footer">
      <p>This is an automated email from Trade Control.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
  
  return {
    subject: `New Job Assignment: ${data.jobTitle}`,
    html,
  };
}

/**
 * Generate quote email
 */
export function generateQuoteEmail(data: {
  clientName: string;
  quoteNumber: string;
  jobTitle: string;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  validUntil: string | null;
  notes: string | null;
  companyName: string;
  companyEmail: string;
  viewUrl: string;
}): EmailTemplate {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote ${data.quoteNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .totals { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .total-row { display: flex; justify-content: space-between; margin: 10px 0; }
    .total-label { font-weight: 600; }
    .grand-total { border-top: 2px solid #667eea; padding-top: 15px; margin-top: 15px; font-size: 1.2em; color: #667eea; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Quote ${data.quoteNumber}</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">from ${data.companyName}</p>
    </div>
    
    <div class="content">
      <p>Dear ${data.clientName},</p>
      
      <p>Thank you for your interest. Please find our quote for <strong>${data.jobTitle}</strong>.</p>
      
      <div class="totals">
        <div class="total-row">
          <span class="total-label">Subtotal:</span>
          <span>$${data.subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">GST (10%):</span>
          <span>$${data.gstAmount.toFixed(2)}</span>
        </div>
        <div class="total-row grand-total">
          <span class="total-label">Total:</span>
          <span><strong>$${data.totalAmount.toFixed(2)} AUD</strong></span>
        </div>
      </div>
      
      ${data.validUntil ? `<p><strong>This quote is valid until:</strong> ${new Date(data.validUntil).toLocaleDateString()}</p>` : ''}
      
      ${data.notes ? `<div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;"><p style="margin: 0;"><strong>Notes:</strong></p><p style="margin: 10px 0 0 0;">${data.notes}</p></div>` : ''}
      
      <div style="text-align: center;">
        <a href="${data.viewUrl}" class="button">View Full Quote</a>
      </div>
      
      <p>If you have any questions, please don't hesitate to contact us.</p>
      
      <p>Best regards,<br>${data.companyName}<br>${data.companyEmail}</p>
    </div>
    
    <div class="footer">
      <p>Generated by Trade Control</p>
    </div>
  </div>
</body>
</html>
  `;
  
  return {
    subject: `Quote ${data.quoteNumber} - ${data.jobTitle}`,
    html,
  };
}

/**
 * Generate invoice email
 */
export function generateInvoiceEmail(data: {
  clientName: string;
  invoiceNumber: string;
  jobTitle: string;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  amountPaid: number;
  dueDate: string | null;
  companyName: string;
  companyEmail: string;
  viewUrl: string;
}): EmailTemplate {
  const balance = data.totalAmount - data.amountPaid;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .button { display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .totals { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .total-row { display: flex; justify-content: space-between; margin: 10px 0; }
    .total-label { font-weight: 600; }
    .amount-due { border-top: 2px solid #10b981; padding-top: 15px; margin-top: 15px; font-size: 1.3em; color: #10b981; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .urgent { background: #fee2e2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Invoice ${data.invoiceNumber}</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">from ${data.companyName}</p>
    </div>
    
    <div class="content">
      <p>Dear ${data.clientName},</p>
      
      <p>Thank you for your business. Please find the invoice for <strong>${data.jobTitle}</strong>.</p>
      
      ${data.dueDate ? `<div class="urgent"><strong>Payment Due:</strong> ${new Date(data.dueDate).toLocaleDateString()}</div>` : ''}
      
      <div class="totals">
        <div class="total-row">
          <span class="total-label">Subtotal:</span>
          <span>$${data.subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">GST (10%):</span>
          <span>$${data.gstAmount.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Total:</span>
          <span>$${data.totalAmount.toFixed(2)}</span>
        </div>
        ${data.amountPaid > 0 ? `
        <div class="total-row">
          <span class="total-label">Amount Paid:</span>
          <span style="color: #10b981;">-$${data.amountPaid.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="total-row amount-due">
          <span class="total-label">${data.amountPaid > 0 ? 'Balance Due:' : 'Amount Due:'}</span>
          <span><strong>$${balance.toFixed(2)} AUD</strong></span>
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="${data.viewUrl}" class="button">View Full Invoice</a>
      </div>
      
      <p>Please remit payment to the address shown on the invoice.</p>
      
      <p>If you have any questions, please contact us.</p>
      
      <p>Best regards,<br>${data.companyName}<br>${data.companyEmail}</p>
    </div>
    
    <div class="footer">
      <p>Generated by Trade Control</p>
    </div>
  </div>
</body>
</html>
  `;
  
  return {
    subject: `Invoice ${data.invoiceNumber} - ${data.jobTitle}`,
    html,
  };
}

/**
 * Generate compliance reminder email for contractors
 */
export function generateComplianceReminderEmail(data: {
  contractorName: string;
  companyName: string;
  expiringItems: Array<{type: string; expiryDate: string}>;
}): EmailTemplate {
  const itemsList = data.expiringItems.map(item => 
    `<li><strong>${item.type}</strong> expires on ${new Date(item.expiryDate).toLocaleDateString()}</li>`
  ).join('');
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .warning { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">⚠️ Compliance Documents Expiring Soon</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.contractorName},</p>
      
      <p>This is a friendly reminder from <strong>${data.companyName}</strong> that the following compliance documents are expiring soon:</p>
      
      <ul>${itemsList}</ul>
      
      <div class="warning">
        <strong>Action Required:</strong> Please update your documents to maintain active status and continue receiving job assignments.
      </div>
      
      <p>If you have questions, please contact ${data.companyName}.</p>
      
      <p>Best regards,<br>Trade Control</p>
    </div>
  </div>
</body>
</html>
  `;
  
  return {
    subject: `Compliance Documents Expiring Soon - ${data.companyName}`,
    html,
  };
}

/**
 * Mock: Get email status (for tracking)
 */
export async function getEmailStatus(messageId: string) {
  console.log('📧 [Resend Mock] Getting email status:', messageId);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return {
    id: messageId,
    status: 'delivered',
    lastEvent: 'delivered',
    lastEventAt: new Date().toISOString(),
  };
}
