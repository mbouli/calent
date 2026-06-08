import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    // SYNC SEAM: when calendar scopes are requested, the exchanged session
    // carries provider_token / provider_refresh_token — persist them here.
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Only allow same-origin absolute paths; reject protocol-relative (//host) and non-/ values.
      const safePath = next.startsWith('/') && !next.startsWith('//') ? next : '/'
      return NextResponse.redirect(`${origin}${safePath}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
