import { ensureOrganization } from '@/actions/organizations'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    console.log('Ensure organization API called')
    
    // Debug: Log cookie information
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    console.log('Available cookies:', allCookies.map(c => c.name))
    
    // Check for Supabase auth cookies
    const authCookies = allCookies.filter(c => 
      c.name.includes('supabase') || 
      c.name.includes('sb-') ||
      c.name.includes('auth')
    )
    console.log('Auth-related cookies found:', authCookies.length > 0 ? authCookies.map(c => c.name) : 'NONE')
    
    const result = await ensureOrganization()
    
    if (result.error) {
      console.error('Ensure organization returned error:', result.error)
      console.error('Full result:', JSON.stringify(result, null, 2))
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    console.log('Ensure organization success:', { 
      organization_id: result.organization_id,
      onboarding_completed: result.onboarding_completed 
    })
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Ensure organization exception:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Failed to ensure organization', details: error.toString() },
      { status: 500 }
    )
  }
}
