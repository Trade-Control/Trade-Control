import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import fixOrphanedSubscriptions from '@/scripts/fix-orphaned-subscriptions'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Admin endpoint to repair orphaned subscriptions
 * 
 * Query params:
 * - dryRun: 'true' | 'false' (default: true)
 * - adminKey: Admin secret key for authorization
 * 
 * Usage:
 * GET /api/admin/repair-subscriptions?adminKey=YOUR_SECRET&dryRun=false
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const dryRun = searchParams.get('dryRun') !== 'false'
    const adminKey = searchParams.get('adminKey')

    // Basic auth check - verify admin key from environment
    const expectedAdminKey = process.env.ADMIN_REPAIR_KEY
    if (!expectedAdminKey) {
      return NextResponse.json(
        { error: 'Admin repair endpoint not configured. Set ADMIN_REPAIR_KEY in environment.' },
        { status: 500 }
      )
    }

    if (!adminKey || adminKey !== expectedAdminKey) {
      return NextResponse.json(
        { error: 'Unauthorized. Valid adminKey required.' },
        { status: 401 }
      )
    }

    // Additional check: verify the requester is authenticated as an owner
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: profile } = await (supabase
        .from('profiles') as any)
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (profile?.role !== 'owner') {
        return NextResponse.json(
          { error: 'Forbidden. Owner role required.' },
          { status: 403 }
        )
      }
    }

    // Run the repair script
    console.log(`Running repair script (dryRun: ${dryRun})`)
    const results = await fixOrphanedSubscriptions(dryRun)

    // Return results
    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        total: results.length,
        linked: results.filter(r => r.action === 'linked' || r.action === 'deleted_empty_org').length,
        deletedEmptyOrgs: results.filter(r => r.action === 'deleted_empty_org').length,
        noAction: results.filter(r => r.action === 'no_action').length,
        errors: results.filter(r => r.action === 'error').length,
      },
      results,
    })
  } catch (error: any) {
    console.error('Repair script error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to run repair script',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}
