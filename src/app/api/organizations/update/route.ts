import { updateOrganization } from '@/actions/organizations'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const result = await updateOrganization(data)
    
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Update organization error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update organization' },
      { status: 500 }
    )
  }
}
