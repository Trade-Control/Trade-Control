/**
 * Mock Stripe Service
 * 
 * This provides a complete mock implementation of Stripe functionality
 * for development and testing. Replace with real Stripe API calls for production.
 */

import { SubscriptionTier, OperationsProLevel } from '../types/database.types';

// Pricing constants (in cents AUD)
export const PRICING = {
  OPERATIONS_BASE: parseInt(process.env.OPERATIONS_BASE_PRICE || '4900'),
  MANAGEMENT_LICENSE: parseInt(process.env.MANAGEMENT_LICENSE_PRICE || '3500'),
  FIELD_STAFF_LICENSE: parseInt(process.env.FIELD_STAFF_LICENSE_PRICE || '1500'),
  OPERATIONS_PRO_SCALE: parseInt(process.env.OPERATIONS_PRO_SCALE_PRICE || '9900'),
  OPERATIONS_PRO_UNLIMITED: parseInt(process.env.OPERATIONS_PRO_UNLIMITED_PRICE || '19900'),
};

export interface CreateCustomerParams {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

export interface CreateSubscriptionParams {
  customerId: string;
  tier: SubscriptionTier;
  operationsProLevel?: OperationsProLevel;
  trialDays?: number;
}

export interface AddLicenseParams {
  subscriptionId: string;
  licenseType: 'management' | 'field_staff';
  quantity?: number;
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
 * Mock: Create Stripe customer
 */
export async function createCustomer(params: CreateCustomerParams) {
  console.log('🔵 [Stripe Mock] Creating customer:', params);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const customerId = `cus_mock_${Date.now()}`;
  
  console.log('✅ [Stripe Mock] Customer created:', customerId);
  
  return {
    id: customerId,
    email: params.email,
    name: params.name,
    metadata: params.metadata || {},
  };
}

/**
 * Mock: Create subscription
 */
export async function createSubscription(params: CreateSubscriptionParams) {
  console.log('🔵 [Stripe Mock] Creating subscription:', params);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const subscriptionId = `sub_mock_${Date.now()}`;
  const now = new Date();
  const periodStart = new Date();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  
  const totalPrice = calculateSubscriptionPrice(
    params.tier,
    params.operationsProLevel
  );
  
  let trialEnd = null;
  if (params.trialDays) {
    trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + params.trialDays);
  }
  
  console.log('✅ [Stripe Mock] Subscription created:', subscriptionId);
  
  return {
    id: subscriptionId,
    customerId: params.customerId,
    status: params.trialDays ? 'trialing' : 'active',
    currentPeriodStart: periodStart.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    trialEnd: trialEnd?.toISOString() || null,
    totalPrice,
  };
}

/**
 * Mock: Add license to subscription (creates subscription item)
 */
export async function addLicense(params: AddLicenseParams) {
  console.log('🔵 [Stripe Mock] Adding license:', params);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const itemId = `si_mock_${Date.now()}`;
  const monthlyPrice = params.licenseType === 'management' 
    ? PRICING.MANAGEMENT_LICENSE 
    : PRICING.FIELD_STAFF_LICENSE;
  
  console.log('✅ [Stripe Mock] License added:', itemId);
  
  return {
    id: itemId,
    subscriptionId: params.subscriptionId,
    priceId: `price_mock_${params.licenseType}`,
    quantity: params.quantity || 1,
    monthlyPrice,
  };
}

/**
 * Mock: Remove license from subscription
 */
export async function removeLicense(subscriptionItemId: string) {
  console.log('🔵 [Stripe Mock] Removing license:', subscriptionItemId);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('✅ [Stripe Mock] License removed');
  
  return { success: true };
}

/**
 * Mock: Update subscription (upgrade/downgrade tier)
 */
export async function updateSubscription(
  subscriptionId: string,
  updates: {
    tier?: SubscriptionTier;
    operationsProLevel?: OperationsProLevel;
  }
) {
  console.log('🔵 [Stripe Mock] Updating subscription:', subscriptionId, updates);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 700));
  
  console.log('✅ [Stripe Mock] Subscription updated');
  
  return {
    id: subscriptionId,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Mock: Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
) {
  console.log('🔵 [Stripe Mock] Cancelling subscription:', subscriptionId);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('✅ [Stripe Mock] Subscription cancelled');
  
  return {
    id: subscriptionId,
    status: cancelAtPeriodEnd ? 'active' : 'canceled',
    cancelAtPeriodEnd,
    canceledAt: new Date().toISOString(),
  };
}

/**
 * Mock: Retrieve subscription
 */
export async function retrieveSubscription(subscriptionId: string) {
  console.log('🔵 [Stripe Mock] Retrieving subscription:', subscriptionId);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const now = new Date();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  
  return {
    id: subscriptionId,
    status: 'active',
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
  };
}

/**
 * Mock: Create payment method (for UI only)
 */
export async function createPaymentMethod(cardDetails: {
  number: string;
  exp_month: number;
  exp_year: number;
  cvc: string;
}) {
  console.log('🔵 [Stripe Mock] Creating payment method (card ending in ****' + cardDetails.number.slice(-4) + ')');
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const pmId = `pm_mock_${Date.now()}`;
  
  console.log('✅ [Stripe Mock] Payment method created:', pmId);
  
  return {
    id: pmId,
    type: 'card',
    card: {
      last4: cardDetails.number.slice(-4),
      brand: 'visa',
      exp_month: cardDetails.exp_month,
      exp_year: cardDetails.exp_year,
    },
  };
}

/**
 * Mock: Handle webhook (for testing webhook logic)
 */
export async function handleWebhook(payload: any, signature: string) {
  console.log('🔵 [Stripe Mock] Webhook received:', payload.type);
  
  // In production, verify signature with Stripe.webhooks.constructEvent
  // For mock, we just log it
  
  const event = {
    id: `evt_mock_${Date.now()}`,
    type: payload.type,
    data: payload.data,
  };
  
  console.log('✅ [Stripe Mock] Webhook processed');
  
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
