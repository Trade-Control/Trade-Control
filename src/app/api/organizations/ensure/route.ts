import { ensureOrganization } from '@/actions/organizations'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    console.log('Ensure organization API called')
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
