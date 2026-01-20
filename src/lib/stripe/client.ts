import Stripe from 'stripe'

// Only initialize Stripe if secret key is available (prevents build-time errors)
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia' as any,
      typescript: true,
    })
  : null as any

// Price IDs from environment
export const STRIPE_PRICES = {
  OPERATIONS: process.env.STRIPE_OPERATIONS_PRICE_ID!,
  OPERATIONS_PRO_SCALE_ADDON: process.env.STRIPE_OPERATIONS_PRO_SCALE_ADDON_PRICE_ID!,
  OPERATIONS_PRO_UNLIMITED_ADDON: process.env.STRIPE_OPERATIONS_PRO_UNLIMITED_ADDON_PRICE_ID!,
  MANAGEMENT_LICENSE: process.env.STRIPE_MANAGEMENT_LICENSE_PRICE_ID!,
  FIELD_STAFF_LICENSE: process.env.STRIPE_FIELD_STAFF_LICENSE_PRICE_ID!,
}

export async function createCheckoutSession(params: {
  customerId?: string
  priceId: string
  quantity?: number
  successUrl: string
  cancelUrl: string
  trialPeriodDays?: number
  metadata?: Record<string, string>
}) {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: 'subscription',
    line_items: [
      {
        price: params.priceId,
        quantity: params.quantity || 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    subscription_data: params.trialPeriodDays
      ? {
          trial_period_days: params.trialPeriodDays,
          metadata: params.metadata,
        }
      : {
          metadata: params.metadata,
        },
  })

  return session
}

export async function createCustomer(params: {
  email: string
  name: string
  metadata?: Record<string, string>
}) {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: params.metadata,
  })

  return customer
}

export async function addSubscriptionItem(params: {
  subscriptionId: string
  priceId: string
  quantity?: number
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
}) {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  const subscriptionItem = await stripe.subscriptionItems.create({
    subscription: params.subscriptionId,
    price: params.priceId,
    quantity: params.quantity || 1,
    proration_behavior: params.prorationBehavior || 'create_prorations',
  })

  return subscriptionItem
}

export async function removeSubscriptionItem(params: {
  subscriptionItemId: string
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
}) {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  await stripe.subscriptionItems.del(params.subscriptionItemId, {
    proration_behavior: params.prorationBehavior || 'create_prorations',
  })
}

export async function updateSubscription(params: {
  subscriptionId: string
  priceId?: string
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
}) {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  const subscription = await stripe.subscriptions.update(params.subscriptionId, {
    items: params.priceId
      ? [
          {
            price: params.priceId,
          },
        ]
      : undefined,
    proration_behavior: params.prorationBehavior || 'create_prorations',
  })

  return subscription
}

export async function cancelSubscription(subscriptionId: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })

  return subscription
}

export async function reactivateSubscription(subscriptionId: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })

  return subscription
}
