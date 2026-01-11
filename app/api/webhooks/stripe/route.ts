import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

// Vercel Serverless Runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper function to create Stripe client
function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  });
}

/**
 * Stripe Webhook Handler
 * 
 * This endpoint receives webhook events from Stripe to keep subscription status in sync.
 * 
 * Events handled:
 * - customer.subscription.updated - Update subscription status, pricing
 * - customer.subscription.deleted - Mark subscription as cancelled
 * - invoice.payment_succeeded - Confirm payment received
 * - invoice.payment_failed - Mark subscription as past_due
 * 
 * Setup:
 * 1. In Stripe Dashboard, add webhook endpoint: https://yourdomain.com/api/webhooks/stripe
 * 2. Select events to listen for
 * 3. Copy webhook signing secret to STRIPE_WEBHOOK_SECRET env var
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Stripe Webhook] Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify the webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Get Stripe client (created lazily)
    const stripe = getStripeClient();

    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    console.log('[Stripe Webhook] Received event:', event.type);

    const supabase = await createClient();

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        console.log('[Stripe Webhook] Updating subscription:', subscription.id);

        // Find organization by stripe_customer_id
        const { data: existingSubscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (!existingSubscription) {
          console.error('[Stripe Webhook] Subscription not found:', subscription.id);
          break;
        }

        // Update subscription status and dates
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status, // active, past_due, cancelled, etc.
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error('[Stripe Webhook] Error updating subscription:', updateError);
        } else {
          console.log('[Stripe Webhook] Subscription updated successfully');
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        console.log('[Stripe Webhook] Subscription deleted:', subscription.id);

        const { error: deleteError } = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (deleteError) {
          console.error('[Stripe Webhook] Error cancelling subscription:', deleteError);
        } else {
          console.log('[Stripe Webhook] Subscription cancelled successfully');
        }

        // Also mark all licenses as inactive
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('organization_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (subData) {
          await supabase
            .from('licenses')
            .update({ status: 'inactive' })
            .eq('organization_id', subData.organization_id);
        }

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        
        console.log('[Stripe Webhook] Payment succeeded for invoice:', invoice.id);

        // Update subscription status to active if it was past_due
        if (invoice.subscription) {
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription);

          if (updateError) {
            console.error('[Stripe Webhook] Error updating subscription after payment:', updateError);
          } else {
            console.log('[Stripe Webhook] Subscription reactivated after payment');
          }
        }

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        
        console.log('[Stripe Webhook] Payment failed for invoice:', invoice.id);

        // Mark subscription as past_due
        if (invoice.subscription) {
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription);

          if (updateError) {
            console.error('[Stripe Webhook] Error updating subscription after failed payment:', updateError);
          } else {
            console.log('[Stripe Webhook] Subscription marked as past_due');
          }

          // Optionally: Send notification email to organization owner
          // You could query the organization and send an alert
        }

        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object;
        
        console.log('[Stripe Webhook] Trial ending soon for:', subscription.id);

        // Optionally: Send reminder email about trial ending
        // Get organization email and send notification via Resend

        break;
      }

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('[Stripe Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}

// Stripe requires a GET endpoint to verify the webhook
export async function GET() {
  return NextResponse.json(
    { message: 'Stripe webhook endpoint is active' },
    { status: 200 }
  );
}
