# Sign in with Google (sync-ready) — Design

**Date:** 2026-06-03
**Status:** Approved design, ready for implementation plan

Wire the existing decorative "Continue with Google" button on `/login` to a real
Supabase Google OAuth sign-in flow. Scope is **sign-in only** for now, but the
code is structured so future Google Calendar syncing can be added without
rework.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Scope | Sign in with Google only. No Calendar API access yet. |
| OAuth flow | PKCE with a server-side `/auth/callback` Route Handler (`@supabase/ssr` standard). |
| Scopes requested now | Minimal only (email/profile). No calendar scopes. |
| Success redirect | `/` (the app's actual location; the old `/u` draft was never adopted). |
| Token storage | None now. Callback marks the seam where provider tokens will later be persisted. |
| Trigger changes | None — `handle_new_user()` already reads `raw_user_meta_data->>'full_name'`, which Google populates. |

## Context (current state)

- Auth is Supabase email/password via `@supabase/ssr`. Browser client in
  `app/lib/supabase/client.ts`, server client in `app/lib/supabase/server.ts`.
- `proxy.ts` (Next.js 16 renamed middleware → **proxy**) validates the session
  with `getUser()` and redirects: `!user && path === '/'` → `/login`;
  `user && path === '/login'` → `/`.
- `app/login/page.tsx` has the full Google button UI but **no `onClick`**.
- **No `/auth/callback` route exists** — this is the missing piece.
- The `handle_new_user()` trigger provisions profile + settings + sample data
  from `raw_user_meta_data->>'full_name'` on every new `auth.users` row. Google
  OAuth populates `full_name` / `name` / `avatar_url` / `email` in that metadata,
  so Google sign-ups auto-provision identically to email sign-ups with **no
  trigger change**.

## Why PKCE + server callback (not implicit/hash flow)

The rest of the app reads the session **server-side** in `proxy.ts` via
`getUser()` against cookie storage. The implicit/hash flow parses the session on
the client only, so `proxy.ts` would not see it and route protection would break.
PKCE exchanges the `code` in a Route Handler that writes the session cookies the
server proxy already reads. This is the documented `@supabase/ssr` pattern.

## Code changes

### 1. `app/lib/supabase/oauth.ts` (new) — the sync seam

A small helper that centralizes the OAuth invocation so future calendar scopes
are a one-line addition:

```ts
import { createClient } from './client'

export function signInWithGoogle(opts?: {
  scopes?: string
  queryParams?: Record<string, string>
}) {
  const supabase = createClient()
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: opts?.scopes,           // future: 'https://www.googleapis.com/auth/calendar.readonly'
      queryParams: opts?.queryParams, // future: { access_type: 'offline', prompt: 'consent' }
    },
  })
}
```

For now the login page calls `signInWithGoogle()` with no args → minimal scopes.

### 2. `app/auth/callback/route.ts` (new) — code exchange

`GET` handler:

- Read `code` (and optional `next`, default `/`) from the query string.
- If `code` present: `await supabase.auth.exchangeCodeForSession(code)` using the
  **server** client (writes session cookies in the Route Handler context).
- On success → `NextResponse.redirect(`${origin}${next}`)`.
- On missing code or error → `NextResponse.redirect(`${origin}/login?error=oauth`)`.
- Leave a clear comment at the exchange point marking where
  `provider_token` / `provider_refresh_token` will later be persisted for
  Calendar sync. **No persistence built now.**

### 3. `app/login/page.tsx` — wire the button

- Add an `onClick` to the existing Google button calling `signInWithGoogle()`.
- Add a `googleLoading` state; disable the button + show a "Please wait" style
  while the redirect is initiating.
- On error from `signInWithOAuth`, surface it through the existing inline `error`
  display.
- On mount, if `?error=oauth` is present in the URL (returned by a failed
  callback), show the existing generic auth-error message.
- Reuse existing i18n keys only — `login.continueWithGoogle` for the button and
  `login.somethingWrong` for any OAuth error. **No new locale strings** added in
  this scope (keeps `en.json`/`es.json` untouched).

### 4. `proxy.ts` — confirm passthrough

Current logic only redirects unauthenticated users on `path === '/'`, so
`/auth/callback` already passes through untouched and the matcher does not
exclude it. Verify during implementation; **change only if** the callback is
being intercepted (no change expected).

## Sync-readiness (designed in, not built)

- `signInWithGoogle` already accepts `scopes` + `queryParams` — adding
  `calendar.readonly` + `access_type=offline` later is a one-line call-site
  change.
- The callback route is the single place provider tokens will be captured;
  a comment marks the seam.
- **Not built now:** token storage table, Calendar API client, any sync logic.

## Manual configuration (operator steps — not code)

Documented here so implementation + verification can reference them. These are
done in external dashboards, not in the repo.

**Google Cloud Console**
1. Configure the OAuth consent screen (External; app name, support email,
   developer contact). Scopes: keep default (email, profile, openid) for now.
2. Create an OAuth 2.0 **Web application** Client ID.
3. Authorized redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`
   (the Supabase auth callback — NOT the app's `/auth/callback`).
4. Copy the Client ID and Client Secret.

**Supabase Dashboard**
1. Authentication → Providers → **Google**: enable, paste Client ID + Secret.
2. Authentication → URL Configuration → Redirect URLs: add
   `http://localhost:3000/auth/callback` and the production equivalent.
3. Site URL: ensure it points at the deployed app origin.

## Testing

**Unit (Vitest)** — `app/auth/callback/route.test.ts`:
- `code` present → calls `exchangeCodeForSession` and redirects to `/`.
- exchange returns error → redirects to `/login?error=oauth`.
- no `code` param → redirects to `/login?error=oauth`.
- (Mock the supabase server client.)

**Manual:**
1. `npm run dev`; on `/login` click "Continue with Google".
2. Complete Google consent → land on `/` with sample course/events/sticky
   present (trigger ran for the new user).
3. Reload → still signed in (cookie session survives).
4. Sign out → `/login`. Sign in with a second Google account → sees only its own
   data (RLS proof).
5. Existing email/password sign-in still works unchanged.

## Out of scope (follow-ups)

- Google Calendar API calls / event import.
- Provider token storage + refresh.
- Two-way sync, conflict handling, webhooks/polling.
- Displaying the Google `avatar_url` in the UI.
- Account linking (same email via password + Google) beyond Supabase defaults.
