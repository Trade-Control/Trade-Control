import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=verification_failed`)
    }

    if (user) {
      // Get pending signup data from the user's metadata
      const firstName = user.user_metadata?.first_name
      const lastName = user.user_metadata?.last_name

      // Create profile if it doesn't exist
      const { data: existingProfile } = await (supabase
        .from('profiles') as any)
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingProfile) {
        const { error: profileError } = await (supabase.from('profiles') as any).insert({
          id: user.id,
          email: user.email,
          first_name: firstName,
          last_name: lastName,
          role: 'owner',
        })

        if (profileError) {
          console.error('Profile creation error:', profileError)
        }
      }

      // Check if user already has an organization/subscription
      const { data: profile } = await (supabase
        .from('profiles') as any)
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (profile?.organization_id) {
        // User already has organization, check onboarding status
        const { data: org } = await (supabase
          .from('organizations') as any)
          .select('onboarding_completed')
          .eq('id', profile.organization_id)
          .single()

        if (org?.onboarding_completed) {
          return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
        } else {
          return NextResponse.redirect(`${requestUrl.origin}/onboarding`)
        }
      }

      // New user - redirect to checkout
      return NextResponse.redirect(`${requestUrl.origin}/auth/checkout`)
    }
  }

  // No code or error, redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/login`)
}
