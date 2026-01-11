/**
 * Stripe Service - Real Implementation
 * 
 * This is the production-ready Stripe integration.
 * Uses Stripe test mode keys for sandbox testing.
 */

import Stripe from 'stripe';
import { SubscriptionTier, OperationsProLevel } from '../types/database.types';

// Helper function to create Stripe client lazily (only when needed)
function getStripeClient(secretKeyOverride?: string) {
  const secretKey = secretKeyOverride || process.env.STRIPE_SECRET_KEY;
  
  // Debug logging
  console.log('[getStripeClient] Environment check:', {
    hasKey: !!secretKey,
    keyPrefix: secretKey?.substring(0, 7) || 'MISSING',
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('STRIPE')).join(', ')
  });
  
  if (!secretKey) {
    console.error('[getStripeClient] CRITICAL: STRIPE_SECRET_KEY is undefined');
    console.error('[getStripeClient] Available STRIPE env vars:', 
      Object.keys(process.env)
        .filter(k => k.includes('STRIPE'))
        .map(k => `${k}=${process.env[k]?.substring(0, 10)}...`)
    );
    throw new Error(
      'STRIPE_SECRET_KEY is not configured. ' +
      'Please set STRIPE_SECRET_KEY in your environment variables. ' +
      'See ROLLOUT_GUIDE.md for instructions on setting up Stripe.'
    );
  }

  console.log('[getStripeClient] SUCCESS: Creating Stripe client with key:', secretKey.substring(0, 7));
  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  });
}

// Pricing constants (in cents AUD) - should match your Stripe Price IDs
export const PRICING = {
  OPERATIONS_BASE: parseInt(process.env.OPERATIONS_BASE_PRICE || '4900'),
  MANAGEMENT_LICENSE: parseInt(process.env.MANAGEMENT_LICENSE_PRICE || '3500'),
  FIELD_STAFF_LICENSE: parseInt(process.env.FIELD_STAFF_LICENSE_PRICE || '1500'),
  OPERATIONS_PRO_SCALE: parseInt(process.env.OPERATIONS_PRO_SCALE_PRICE || '9900'),
  OPERATIONS_PRO_UNLIMITED: parseInt(process.env.OPERATIONS_PRO_UNLIMITED_PRICE || '19900'),
};

// Stripe Price IDs - Set these in your environment variables after creating products in Stripe
const STRIPE_PRICE_IDS = {
  OPERATIONS_BASE: process.env.STRIPE_PRICE_ID_OPERATIONS_BASE || '',
  MANAGEMENT_LICENSE: process.env.STRIPE_PRICE_ID_MANAGEMENT_LICENSE || '',
  FIELD_STAFF_LICENSE: process.env.STRIPE_PRICE_ID_FIELD_STAFF_LICENSE || '',
  OPERATIONS_PRO_SCALE: process.env.STRIPE_PRICE_ID_OPERATIONS_PRO_SCALE || '',
  OPERATIONS_PRO_UNLIMITED: process.env.STRIPE_PRICE_ID_OPERATIONS_PRO_UNLIMITED || '',
};

export interface CreateCustomerParams {
  email: string;
  name: string;
  metadata?: Record<string, string>;
  secretKeyOverride?: string;
}

export interface CreateSubscriptionParams {
  customerId: string;
  tier: SubscriptionTier;
  operationsProLevel?: OperationsProLevel;
  trialDays?: number;
  secretKeyOverride?: string;
}

export interface AddLicenseParams {
  subscriptionId: string;
  licenseType: 'management' | 'field_staff';
  quantity?: number;
  secretKeyOverride?: string;
}

export interface ProRataCalculation {
  basePrice: number;
  proRataAmount: number;
  daysRemaining: number;
  totalDays: number;
  effectivePrice: number;
}

/**
 * Calculate pro-rata billing for mid-cycle additions
 */
export function calculateProRata(
  monthlyPrice: number,
  periodStart: Date,
  periodEnd: Date
): ProRataCalculation {
  const now = new Date();
  const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  const proRataAmount = Math.round((monthlyPrice * daysRemaining) / totalDays);
  
  return {
    basePrice: monthlyPrice,
    proRataAmount,
    daysRemaining,
    totalDays,
    effectivePrice: proRataAmount,
  };
}

/**
 * Calculate total subscription price
 */
export function calculateSubscriptionPrice(
  tier: SubscriptionTier,
  operationsProLevel?: OperationsProLevel,
  managementLicenses: number = 0,
  fieldStaffLicenses: number = 0
): number {
  let total = PRICING.OPERATIONS_BASE;
  
  if (tier === 'operations_pro') {
    if (operationsProLevel === 'scale') {
      total += PRICING.OPERATIONS_PRO_SCALE;
    } else if (operationsProLevel === 'unlimited') {
      total += PRICING.OPERATIONS_PRO_UNLIMITED;
    }
  }
  
  total += (managementLicenses * PRICING.MANAGEMENT_LICENSE);
  total += (fieldStaffLicenses * PRICING.FIELD_STAFF_LICENSE);
  
  return total;
}

/**
 * Create Stripe customer
 */
export async function createCustomer(params: CreateCustomerParams) {
  const stripe = getStripeClient(params.secretKeyOverride);
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: params.metadata || {},
  });

  return {
    id: customer.id,
    email: customer.email || params.email,
    name: customer.name || params.name,
    metadata: customer.metadata,
  };
}

/**
 * Create subscription
 */
export async function createSubscription(params: CreateSubscriptionParams) {
  const stripe = getStripeClient(params.secretKeyOverride);
  const items: Stripe.SubscriptionCreateParams.Item[] = [];

  // Add base Operations plan
  if (STRIPE_PRICE_IDS.OPERATIONS_BASE) {
    items.push({ price: STRIPE_PRICE_IDS.OPERATIONS_BASE });
  }

  // Add Operations Pro tier if applicable
  if (params.tier === 'operations_pro') {
    if (params.operationsProLevel === 'scale' && STRIPE_PRICE_IDS.OPERATIONS_PRO_SCALE) {
      items.push({ price: STRIPE_PRICE_IDS.OPERATIONS_PRO_SCALE });
    } else if (params.operationsProLevel === 'unlimited' && STRIPE_PRICE_IDS.OPERATIONS_PRO_UNLIMITED) {
      items.push({ price: STRIPE_PRICE_IDS.OPERATIONS_PRO_UNLIMITED });
    }
  }

  const subscriptionParams: Stripe.SubscriptionCreateParams = {
    customer: params.customerId,
    items,
    currency: 'aud',
    metadata: {
      tier: params.tier,
      operations_pro_level: params.operationsProLevel || '',
    },
  };

  if (params.trialDays) {
    subscriptionParams.trial_period_days = params.trialDays;
  }

  const subscription = await stripe.subscriptions.create(subscriptionParams);

  return {
    id: subscription.id,
    customerId: subscription.customer as string,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    totalPrice: subscription.items.data.reduce((sum, item) => {
      const price = item.price.unit_amount || 0;
      return sum + (price * (item.quantity || 1));
    }, 0),
  };
}

/**
 * Add license to subscription (creates subscription item)
 */
export async function addLicense(params: AddLicenseParams) {
  const stripe = getStripeClient(params.secretKeyOverride);
  const priceId = params.licenseType === 'management' 
    ? STRIPE_PRICE_IDS.MANAGEMENT_LICENSE 
    : STRIPE_PRICE_IDS.FIELD_STAFF_LICENSE;

  if (!priceId) {
    throw new Error(`Price ID not configured for ${params.licenseType} license`);
  }

  const subscriptionItem = await stripe.subscriptionItems.create({
    subscription: params.subscriptionId,
    price: priceId,
    quantity: params.quantity || 1,
  });

  const monthlyPrice = subscriptionItem.price.unit_amount || 0;

  return {
    id: subscriptionItem.id,
    subscriptionId: params.subscriptionId,
    priceId: subscriptionItem.price.id,
    quantity: subscriptionItem.quantity || 1,
    monthlyPrice,
  };
}

/**
 * Remove license from subscription
 */
export async function removeLicense(subscriptionItemId: string, secretKeyOverride?: string) {
  const stripe = getStripeClient(secretKeyOverride);
  await stripe.subscriptionItems.del(subscriptionItemId);
  return { success: true };
}

/**
 * Update subscription (upgrade/downgrade tier)
 */
export async function updateSubscription(
  subscriptionId: string,
  updates: {
    tier?: SubscriptionTier;
    operationsProLevel?: OperationsProLevel;
  },
  secretKeyOverride?: string
) {
  const stripe = getStripeClient(secretKeyOverride);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  const items: Stripe.SubscriptionUpdateParams.Item[] = subscription.items.data.map(item => ({
    id: item.id,
    price: item.price.id,
    quantity: item.quantity,
  }));

  // Update Operations Pro level if needed
  if (updates.operationsProLevel) {
    // Remove existing Operations Pro items
    const proItems = items.filter(item => 
      item.price === STRIPE_PRICE_IDS.OPERATIONS_PRO_SCALE || 
      item.price === STRIPE_PRICE_IDS.OPERATIONS_PRO_UNLIMITED
    );
    
    proItems.forEach(item => {
      const index = items.findIndex(i => i.id === item.id);
      if (index !== -1) {
        items[index] = { id: item.id, deleted: true };
      }
    });

    // Add new Operations Pro level
    if (updates.operationsProLevel === 'scale' && STRIPE_PRICE_IDS.OPERATIONS_PRO_SCALE) {
      items.push({ price: STRIPE_PRICE_IDS.OPERATIONS_PRO_SCALE });
    } else if (updates.operationsProLevel === 'unlimited' && STRIPE_PRICE_IDS.OPERATIONS_PRO_UNLIMITED) {
      items.push({ price: STRIPE_PRICE_IDS.OPERATIONS_PRO_UNLIMITED });
    }
  }

  const updated = await stripe.subscriptions.update(subscriptionId, {
    items,
    metadata: {
      ...subscription.metadata,
      tier: updates.tier || subscription.metadata.tier || '',
      operations_pro_level: updates.operationsProLevel || subscription.metadata.operations_pro_level || '',
    },
  });

  return {
    id: updated.id,
    tier: updates.tier,
    operationsProLevel: updates.operationsProLevel,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
) {
  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd,
  });

  return {
    id: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
  };
}

/**
 * Retrieve subscription
 */
export async function retrieveSubscription(subscriptionId: string) {
  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  return {
    id: subscription.id,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
  };
}

/**
 * Create payment method (for UI only - returns client secret for Stripe Elements)
 */
export async function createPaymentMethod(cardDetails: {
  number: string;
  exp_month: number;
  exp_year: number;
  cvc: string;
}) {
  const stripe = getStripeClient();
  // In production, use Stripe Elements on the frontend
  // This is just for reference
  const paymentMethod = await stripe.paymentMethods.create({
    type: 'card',
    card: {
      number: cardDetails.number,
      exp_month: cardDetails.exp_month,
      exp_year: cardDetails.exp_year,
      cvc: cardDetails.cvc,
    },
  });

  return {
    id: paymentMethod.id,
    type: paymentMethod.type,
    card: paymentMethod.card ? {
      last4: paymentMethod.card.last4,
      brand: paymentMethod.card.brand,
      exp_month: paymentMethod.card.exp_month,
      exp_year: paymentMethod.card.exp_year,
    } : undefined,
  };
}

/**
 * Handle webhook
 */
export async function handleWebhook(payload: string | Buffer, signature: string) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    webhookSecret
  );

  return event;
}

/**
 * Helper: Format price for display
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)} AUD`;
}

/**
 * Helper: Get readable license type name
 */
export function getLicenseTypeName(type: 'management' | 'field_staff'): string {
  return type === 'management' ? 'Management Login' : 'Field Staff Login';
}

/**
 * Helper: Get license monthly price
 */
export function getLicensePrice(type: 'management' | 'field_staff'): number {
  return type === 'management' ? PRICING.MANAGEMENT_LICENSE : PRICING.FIELD_STAFF_LICENSE;
}
