/**
 * One-time repair script to fix users with orphaned subscriptions
 * 
 * Problem: Due to race conditions between Stripe webhooks and organization creation,
 * some users have subscriptions in one organization but their profile is linked to 
 * a different (empty) organization.
 * 
 * Solution: This script finds affected users and links them to the correct organization
 * that has their subscription.
 * 
 * Usage: Run this via a server-side API endpoint or command-line tool
 */

import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { Database } from '@/types/database'

// Initialize clients
function getClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase configuration missing')
  }

  if (!stripeSecretKey) {
    throw new Error('Stripe configuration missing')
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey)
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-12-18.acacia' as any,
    typescript: true,
  })

  return { supabase, stripe }
}

interface RepairResult {
  userId: string
  email: string
  action: 'linked' | 'deleted_empty_org' | 'no_action' | 'error'
  oldOrgId?: string
  newOrgId?: string
  error?: string
}

/**
 * Find and fix orphaned subscriptions
 */
export async function fixOrphanedSubscriptions(dryRun: boolean = true): Promise<RepairResult[]> {
  const { supabase, stripe } = getClients()
  const results: RepairResult[] = []

  console.log(`Starting orphaned subscription repair (DRY RUN: ${dryRun})...`)

  // Step 1: Find all profiles
  const { data: profiles, error: profilesError } = await (supabase
    .from('profiles') as any)
    .select('id, email, organization_id')
    .order('created_at', { ascending: true })

  if (profilesError) {
    throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
  }

  console.log(`Found ${profiles.length} profiles to check`)

  // Step 2: Check each profile
  for (const profile of profiles) {
    try {
      console.log(`\nChecking profile: ${profile.email} (${profile.id})`)

      // Check if profile has an organization
      if (!profile.organization_id) {
        console.log('  ⚠️  Profile has no organization_id')
        
        // Look for Stripe customer by email
        const customers = await stripe.customers.list({
          email: profile.email,
          limit: 1,
        })

        if (customers.data.length === 0) {
          console.log('  ℹ️  No Stripe customer found - no action needed')
          results.push({
            userId: profile.id,
            email: profile.email,
            action: 'no_action',
          })
          continue
        }

        const stripeCustomerId = customers.data[0].id
        console.log(`  ✓ Found Stripe customer: ${stripeCustomerId}`)

        // Find organization with this subscription
        const { data: subscription } = await (supabase
          .from('subscriptions') as any)
          .select('organization_id, id, status')
          .eq('stripe_customer_id', stripeCustomerId)
          .maybeSingle()

        if (!subscription) {
          console.log('  ℹ️  No subscription found in database')
          results.push({
            userId: profile.id,
            email: profile.email,
            action: 'no_action',
          })
          continue
        }

        console.log(`  ✓ Found subscription in org: ${subscription.organization_id}`)

        // Link profile to correct organization
        if (!dryRun) {
          const { error: updateError } = await (supabase
            .from('profiles') as any)
            .update({ organization_id: subscription.organization_id })
            .eq('id', profile.id)

          if (updateError) {
            throw new Error(`Failed to update profile: ${updateError.message}`)
          }
          console.log(`  ✅ Linked profile to organization ${subscription.organization_id}`)
        } else {
          console.log(`  [DRY RUN] Would link profile to organization ${subscription.organization_id}`)
        }

        results.push({
          userId: profile.id,
          email: profile.email,
          action: 'linked',
          newOrgId: subscription.organization_id,
        })
        continue
      }

      // Profile has organization - check if it has a subscription
      const { data: subscription } = await (supabase
        .from('subscriptions') as any)
        .select('id, status, stripe_customer_id')
        .eq('organization_id', profile.organization_id)
        .maybeSingle()

      if (subscription) {
        console.log('  ✓ Profile organization has subscription - OK')
        results.push({
          userId: profile.id,
          email: profile.email,
          action: 'no_action',
        })
        continue
      }

      console.log('  ⚠️  Profile organization has NO subscription')

      // Look for Stripe customer
      const customers = await stripe.customers.list({
        email: profile.email,
        limit: 1,
      })

      if (customers.data.length === 0) {
        console.log('  ℹ️  No Stripe customer found - user may not have paid')
        results.push({
          userId: profile.id,
          email: profile.email,
          action: 'no_action',
        })
        continue
      }

      const stripeCustomerId = customers.data[0].id
      console.log(`  ✓ Found Stripe customer: ${stripeCustomerId}`)

      // Find the correct organization with subscription
      const { data: correctSubscription } = await (supabase
        .from('subscriptions') as any)
        .select('organization_id, id, status')
        .eq('stripe_customer_id', stripeCustomerId)
        .maybeSingle()

      if (!correctSubscription) {
        console.log('  ℹ️  No subscription found in database for this Stripe customer')
        results.push({
          userId: profile.id,
          email: profile.email,
          action: 'no_action',
        })
        continue
      }

      if (correctSubscription.organization_id === profile.organization_id) {
        console.log('  ℹ️  Already linked to correct organization')
        results.push({
          userId: profile.id,
          email: profile.email,
          action: 'no_action',
        })
        continue
      }

      console.log(`  🔧 Need to relink from ${profile.organization_id} to ${correctSubscription.organization_id}`)
      const oldOrgId = profile.organization_id

      // Check if old org has any other users or data
      const { data: otherProfiles } = await (supabase
        .from('profiles') as any)
        .select('id')
        .eq('organization_id', oldOrgId)
        .neq('id', profile.id)

      const shouldDeleteOldOrg = !otherProfiles || otherProfiles.length === 0

      // Update profile to correct organization
      if (!dryRun) {
        const { error: updateError } = await (supabase
          .from('profiles') as any)
          .update({ organization_id: correctSubscription.organization_id })
          .eq('id', profile.id)

        if (updateError) {
          throw new Error(`Failed to update profile: ${updateError.message}`)
        }
        console.log(`  ✅ Relinked profile to organization ${correctSubscription.organization_id}`)

        // Delete empty old organization if it has no other users
        if (shouldDeleteOldOrg) {
          const { error: deleteError } = await (supabase
            .from('organizations') as any)
            .delete()
            .eq('id', oldOrgId)

          if (deleteError) {
            console.log(`  ⚠️  Failed to delete empty org: ${deleteError.message}`)
          } else {
            console.log(`  ✅ Deleted empty organization ${oldOrgId}`)
          }
        }
      } else {
        console.log(`  [DRY RUN] Would relink profile to organization ${correctSubscription.organization_id}`)
        if (shouldDeleteOldOrg) {
          console.log(`  [DRY RUN] Would delete empty organization ${oldOrgId}`)
        }
      }

      results.push({
        userId: profile.id,
        email: profile.email,
        action: shouldDeleteOldOrg ? 'deleted_empty_org' : 'linked',
        oldOrgId,
        newOrgId: correctSubscription.organization_id,
      })
    } catch (error: any) {
      console.error(`  ❌ Error processing profile ${profile.email}:`, error.message)
      results.push({
        userId: profile.id,
        email: profile.email,
        action: 'error',
        error: error.message,
      })
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('REPAIR SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total profiles checked: ${profiles.length}`)
  console.log(`Profiles linked/relinked: ${results.filter(r => r.action === 'linked' || r.action === 'deleted_empty_org').length}`)
  console.log(`Empty orgs deleted: ${results.filter(r => r.action === 'deleted_empty_org').length}`)
  console.log(`No action needed: ${results.filter(r => r.action === 'no_action').length}`)
  console.log(`Errors: ${results.filter(r => r.action === 'error').length}`)

  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes were made to the database')
    console.log('Run with dryRun=false to apply changes')
  }

  return results
}

// Export for use in API route or CLI
export default fixOrphanedSubscriptions
