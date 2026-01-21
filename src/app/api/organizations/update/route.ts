import { updateOrganization } from '@/actions/organizations'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const data = await req.json()
    
    // Validate required fields
    if (!data || !data.name) {
      console.error('Update organization: Missing required field "name"', data)
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      )
    }
    
    const result = await updateOrganization(data)
    
    if (result.error) {
      console.error('Update organization returned error:', result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Update organization exception:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Failed to update organization', details: error.toString() },
      { status: 500 }
    )
  }
}
