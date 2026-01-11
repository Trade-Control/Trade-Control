import { createClient } from '@/lib/supabase/server';

/**
 * Check if an organization is in read-only mode due to subscription expiry
 */
export async function isOrganizationReadOnly(orgId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('read_only_mode, grace_period_ends, status')
      .eq('organization_id', orgId)
      .single();

    if (!subscription) return false;

    // Organization is in read-only mode if:
    // 1. read_only_mode is explicitly set to true
    // 2. Subscription is cancelled/expired and within 30-day grace period
    if (subscription.read_only_mode) {
      // Check if grace period has ended
      if (subscription.grace_period_ends) {
        const gracePeriodEnds = new Date(subscription.grace_period_ends);
        if (gracePeriodEnds < new Date()) {
          // Grace period ended, should be fully locked out
          return true;
        }
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking read-only mode:', error);
    return false;
  }
}

/**
 * Get subscription status for an organization
 */
export async function getSubscriptionStatus(orgId: string) {
  try {
    const supabase = await createClient();
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', orgId)
      .single();

    if (!subscription) {
      return {
        hasActiveSubscription: false,
        isReadOnly: false,
        gracePeriodEnds: null,
        daysRemaining: 0,
      };
    }

    const isReadOnly = await isOrganizationReadOnly(orgId);
    let daysRemaining = 0;

    if (subscription.grace_period_ends) {
      const gracePeriodEnds = new Date(subscription.grace_period_ends);
      const today = new Date();
      daysRemaining = Math.max(0, Math.ceil((gracePeriodEnds.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return {
      hasActiveSubscription: subscription.status === 'active',
      isReadOnly,
      gracePeriodEnds: subscription.grace_period_ends,
      daysRemaining,
      tier: subscription.tier,
      status: subscription.status,
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return {
      hasActiveSubscription: false,
      isReadOnly: false,
      gracePeriodEnds: null,
      daysRemaining: 0,
    };
  }
}

/**
 * Check if user's account is active
 */
export async function isUserAccountActive(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_status, role, organization_id')
      .eq('id', userId)
      .single();

    if (!profile) return false;

    // Check account status
    if (profile.account_status === 'deactivated' || profile.account_status === 'suspended') {
      return false;
    }

    // Field staff accounts are deactivated after grace period
    if (profile.role === 'field_staff' && profile.organization_id) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('grace_period_ends, read_only_mode')
        .eq('organization_id', profile.organization_id)
        .single();

      if (subscription?.grace_period_ends) {
        const gracePeriodEnds = new Date(subscription.grace_period_ends);
        if (gracePeriodEnds < new Date()) {
          return false; // Grace period ended
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking user account status:', error);
    return true; // Default to allowing access if check fails
  }
}

/**
 * Handle subscription expiry - called by cron or webhook
 */
export async function handleSubscriptionExpiry() {
  try {
    const supabase = await createClient();

    // Find expired subscriptions
    const { data: expiredSubs } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .lt('current_period_end', new Date().toISOString())
      .is('expired_at', null);

    if (!expiredSubs || expiredSubs.length === 0) return;

    // Set each to read-only mode with 30-day grace period
    for (const sub of expiredSubs) {
      const gracePeriodEnds = new Date();
      gracePeriodEnds.setDate(gracePeriodEnds.getDate() + 30);

      await supabase
        .from('subscriptions')
        .update({
          expired_at: new Date().toISOString(),
          grace_period_ends: gracePeriodEnds.toISOString(),
          read_only_mode: true,
          status: 'cancelled',
        })
        .eq('id', sub.id);
    }

    // Find subscriptions past grace period
    const { data: pastGrace } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('read_only_mode', true)
      .lt('grace_period_ends', new Date().toISOString());

    if (!pastGrace || pastGrace.length === 0) return;

    // Deactivate field staff for organizations past grace period
    for (const sub of pastGrace) {
      await supabase
        .from('profiles')
        .update({
          account_status: 'deactivated',
          deactivated_at: new Date().toISOString(),
        })
        .eq('organization_id', sub.organization_id)
        .eq('role', 'field_staff')
        .eq('account_status', 'active');
    }

    console.log(`Processed ${expiredSubs.length} expired subscriptions and ${pastGrace.length} past grace period`);
  } catch (error) {
    console.error('Error handling subscription expiry:', error);
    throw error;
  }
}
