import { ensureOrganization } from '@/actions/organizations'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const result = await ensureOrganization()
    
    if (result.error) {
      console.error('Ensure organization returned error:', result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

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
