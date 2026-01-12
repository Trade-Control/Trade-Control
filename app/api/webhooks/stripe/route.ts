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

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log('[Stripe Webhook] Checkout session completed:', session.id);
        console.log('[Stripe Webhook] Session mode:', session.mode);
        console.log('[Stripe Webhook] Session metadata:', session.metadata);

        const action = session.metadata?.action;
        const stripe = getStripeClient();

        if (action === 'upgrade_to_pro') {
          // Handle upgrade: Add Pro tier to existing subscription
          const existingSubscriptionId = session.metadata?.existing_subscription_id;
          const newTier = session.metadata?.new_tier;
          const operationsProLevel = session.metadata?.operations_pro_level;
          
          if (!existingSubscriptionId || !operationsProLevel) {
            console.error('[Stripe Webhook] Missing metadata for upgrade');
            break;
          }

          // Get the new subscription created by checkout (we'll cancel it)
          const newSubscriptionId = typeof session.subscription === 'string' 
            ? session.subscription 
            : session.subscription?.id;

          if (!newSubscriptionId) {
            console.error('[Stripe Webhook] No subscription ID in checkout session');
            break;
          }

          // Get Pro tier price ID
          const proPriceId = operationsProLevel === 'scale'
            ? process.env.STRIPE_PRICE_ID_OPERATIONS_PRO_SCALE
            : process.env.STRIPE_PRICE_ID_OPERATIONS_PRO_UNLIMITED;

          if (!proPriceId) {
            console.error('[Stripe Webhook] Pro tier price ID not configured');
            break;
          }

          try {
            // Add Pro tier subscription item to existing subscription
            await stripe.subscriptionItems.create({
              subscription: existingSubscriptionId,
              price: proPriceId,
              quantity: 1,
            });

            // Cancel the temporary subscription created by checkout
            await stripe.subscriptions.cancel(newSubscriptionId);

            // Update subscription in database
            const { data: dbSubscription } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('stripe_subscription_id', existingSubscriptionId)
              .single();

            if (dbSubscription) {
              const proPrice = operationsProLevel === 'scale' ? 99 : 199;
              const newTotalPrice = dbSubscription.total_price + proPrice;

              await supabase
                .from('subscriptions')
                .update({
                  tier: newTier,
                  operations_pro_level: operationsProLevel,
                  total_price: newTotalPrice,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', dbSubscription.id);

              console.log('[Stripe Webhook] Upgrade completed successfully');
            }
          } catch (upgradeError: any) {
            console.error('[Stripe Webhook] Error processing upgrade:', upgradeError);
          }
        } else if (action === 'add_license') {
          // Handle license addition: Attach payment method and add license
          const subscriptionId = session.metadata?.subscription_id;
          const licenseType = session.metadata?.license_type;
          const quantity = parseInt(session.metadata?.quantity || '1');
          const organizationId = session.metadata?.organization_id;
          const dbSubscriptionId = session.metadata?.db_subscription_id;

          if (!subscriptionId || !licenseType || !organizationId) {
            console.error('[Stripe Webhook] Missing metadata for license addition');
            break;
          }

          try {
            // Get setup intent to attach payment method
            const setupIntentId = session.setup_intent;
            if (setupIntentId && typeof setupIntentId === 'string') {
              const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
              const paymentMethodId = setupIntent.payment_method;

              if (paymentMethodId && typeof paymentMethodId === 'string') {
                // Attach payment method to subscription
                await stripe.subscriptions.update(subscriptionId, {
                  default_payment_method: paymentMethodId,
                });

                // Add license via API
                const stripeService = await import('@/lib/services/stripe');
                const licenseItem = await stripeService.addLicense({
                  subscriptionId,
                  licenseType: licenseType as 'management' | 'field_staff',
                  quantity,
                });

                // Create licenses in database
                const licensesToCreate = Array.from({ length: quantity }, () => ({
                  organization_id: organizationId,
                  license_type: licenseType,
                  stripe_subscription_item_id: licenseItem.id,
                  status: 'active' as const,
                  monthly_cost: licenseType === 'management' ? 35 : 15,
                }));

                const { error: insertError } = await supabase
                  .from('licenses')
                  .insert(licensesToCreate);

                if (insertError) {
                  console.error('[Stripe Webhook] Error creating licenses:', insertError);
                } else {
                  // Update subscription total price
                  if (dbSubscriptionId) {
                    const { data: dbSubscription } = await supabase
                      .from('subscriptions')
                      .select('total_price')
                      .eq('id', dbSubscriptionId)
                      .single();

                    if (dbSubscription) {
                      const licensePrice = licenseType === 'management' ? 35 : 15;
                      const newTotalPrice = dbSubscription.total_price + (licensePrice * quantity);
                      await supabase
                        .from('subscriptions')
                        .update({ total_price: newTotalPrice })
                        .eq('id', dbSubscriptionId);
                    }
                  }

                  console.log('[Stripe Webhook] License addition completed successfully');
                }
              }
            }
          } catch (licenseError: any) {
            console.error('[Stripe Webhook] Error processing license addition:', licenseError);
          }
        } else {
          // New signup from Payment Link - handled by success page, but we can log it
          console.log('[Stripe Webhook] New signup checkout completed (handled by success page)');
        }

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
