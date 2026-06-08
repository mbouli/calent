import { createClient } from './client'

/**
 * Start a Google OAuth sign-in (PKCE). Defaults to minimal scopes (email/profile).
 *
 * SYNC SEAM: to add Google Calendar later, call with
 *   scopes: 'https://www.googleapis.com/auth/calendar.readonly'
 *   queryParams: { access_type: 'offline', prompt: 'consent' }
 * which makes Google return a refresh token captured in app/auth/callback/route.ts.
 */
export function signInWithGoogle(opts?: {
  scopes?: string
  queryParams?: Record<string, string>
}) {
  const supabase = createClient()
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: opts?.scopes,
      queryParams: opts?.queryParams,
    },
  })
}
