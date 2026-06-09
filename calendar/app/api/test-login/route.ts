import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

/**
 * DEV-ONLY auto-login for local testing (`TESTING=true` in .env.local).
 *
 * Signs in a dedicated test user server-side so the session cookie is set and
 * `auth.uid()` is populated — without this the calendar loads empty because RLS
 * blocks anonymous reads/writes. Double-guarded so it can NEVER run in a
 * production build even if the env var leaks: NODE_ENV must not be 'production'
 * AND TESTING must be exactly 'true'. Defaults to off when TESTING is absent.
 */
function testModeEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.TESTING === 'true'
}

export async function GET(request: Request) {
  if (!testModeEnabled()) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next') ?? '/'
  // Same open-redirect guard as the OAuth callback: only same-origin absolute paths.
  const safePath = next.startsWith('/') && !next.startsWith('//') ? next : '/'

  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD
  if (!email || !password) {
    // Plain response (not a /login redirect) so we don't loop against the proxy.
    return new NextResponse(
      'TESTING is on but TEST_USER_EMAIL / TEST_USER_PASSWORD are not set in .env.local',
      { status: 500 },
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return new NextResponse(`Test login failed: ${error.message}`, { status: 401 })
  }

  return NextResponse.redirect(`${origin}${safePath}`)
}
