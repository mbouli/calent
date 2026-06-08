# Google OAuth Sign-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing "Continue with Google" button to a real Supabase Google OAuth sign-in flow, structured so Google Calendar sync can be added later without rework.

**Architecture:** PKCE flow with a server-side `/auth/callback` Route Handler (the `@supabase/ssr` standard). A thin `signInWithGoogle` helper centralizes the OAuth call and is the seam for future calendar scopes. The login button calls the helper; Google bounces back through Supabase to `/auth/callback`, which exchanges the `code` for the cookie session that `proxy.ts` already reads via `getUser()`.

**Tech Stack:** Next.js 16.2.6 (Proxy, not middleware), React 19, `@supabase/ssr`, Vitest (node env), TypeScript.

**Spec:** `docs/superpowers/specs/2026-06-03-google-oauth-signin-design.md`

---

## File structure

- **Create** `app/lib/supabase/oauth.ts` — `signInWithGoogle()` helper (the sync seam). Browser-side.
- **Create** `app/lib/supabase/oauth.test.ts` — unit tests for the helper's call contract.
- **Create** `app/auth/callback/route.ts` — `GET` handler that exchanges the OAuth `code` for a session.
- **Create** `app/auth/callback/route.test.ts` — unit tests for the callback's redirect behavior.
- **Modify** `app/login/page.tsx` — wire the Google button + surface `?error=oauth`.
- **Modify** `calendar/README.md` — short "Google sign-in setup" pointer to the spec's manual steps.
- **Verify (no change expected)** `proxy.ts` — confirm `/auth/callback` passes through.

Notes for the implementer:
- Path alias: `@/*` → repo root (`calendar/`), so the server client is `@/app/lib/supabase/server`.
- Tests run under **node** env (`vitest.config.ts`), pattern `app/**/*.test.ts`. There is **no** jsdom / React component test setup — the login page is verified manually.
- Run all commands from the `calendar/` directory.

---

### Task 1: `signInWithGoogle` helper (the sync seam)

**Files:**
- Create: `app/lib/supabase/oauth.ts`
- Test: `app/lib/supabase/oauth.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/lib/supabase/oauth.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const signInWithOAuth = vi.fn()

vi.mock('./client', () => ({
  createClient: () => ({ auth: { signInWithOAuth } }),
}))

import { signInWithGoogle } from './oauth'

describe('signInWithGoogle', () => {
  beforeEach(() => {
    signInWithOAuth.mockReset()
    vi.stubGlobal('window', { location: { origin: 'https://app.test' } })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests the google provider + app callback with no scopes by default', () => {
    signInWithGoogle()
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://app.test/auth/callback',
        scopes: undefined,
        queryParams: undefined,
      },
    })
  })

  it('forwards scopes and queryParams for future calendar sync', () => {
    signInWithGoogle({
      scopes: 'https://www.googleapis.com/auth/calendar.readonly',
      queryParams: { access_type: 'offline', prompt: 'consent' },
    })
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://app.test/auth/callback',
        scopes: 'https://www.googleapis.com/auth/calendar.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- oauth`
Expected: FAIL — cannot resolve `./oauth` (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `app/lib/supabase/oauth.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- oauth`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/supabase/oauth.ts app/lib/supabase/oauth.test.ts
git commit -m "feat(auth): add signInWithGoogle helper (calendar-sync seam)"
```

---

### Task 2: `/auth/callback` Route Handler

**Files:**
- Create: `app/auth/callback/route.ts`
- Test: `app/auth/callback/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/auth/callback/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const exchangeCodeForSession = vi.fn()

vi.mock('@/app/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { exchangeCodeForSession } })),
}))

import { GET } from './route'

describe('GET /auth/callback', () => {
  beforeEach(() => exchangeCodeForSession.mockReset())

  it('exchanges the code and redirects home on success', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })
    const res = await GET(new Request('https://app.test/auth/callback?code=abc'))
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc')
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://app.test/')
  })

  it('redirects to /login?error=oauth when the exchange fails', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error('bad') })
    const res = await GET(new Request('https://app.test/auth/callback?code=abc'))
    expect(res.headers.get('location')).toBe('https://app.test/login?error=oauth')
  })

  it('redirects to /login?error=oauth when no code is present', async () => {
    const res = await GET(new Request('https://app.test/auth/callback'))
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(res.headers.get('location')).toBe('https://app.test/login?error=oauth')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- callback`
Expected: FAIL — cannot resolve `./route` (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `app/auth/callback/route.ts`:

```ts
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
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- callback`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/auth/callback/route.ts app/auth/callback/route.test.ts
git commit -m "feat(auth): add /auth/callback route to exchange OAuth code"
```

---

### Task 3: Wire the login page Google button

**Files:**
- Modify: `app/login/page.tsx`

No automated test (no component-test infra; node env). Verified manually in Task 5.

- [ ] **Step 1: Add imports**

In `app/login/page.tsx`, change the React import to include `useEffect`:

```tsx
import { useState, useEffect } from 'react'
```

And add the helper import alongside the existing `createClient` import:

```tsx
import { signInWithGoogle } from '../lib/supabase/oauth'
```

- [ ] **Step 2: Add Google loading state + handlers**

Inside `LoginPage`, after the existing `const [error, setError] = useState<string | null>(null)` line, add:

```tsx
  const [googleLoading, setGoogleLoading] = useState(false)

  // Surface a failed OAuth callback (redirected back with ?error=oauth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'oauth') {
      setError(t('login.somethingWrong'))
    }
  }, [t])

  const handleGoogle = async () => {
    setError(null)
    setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    // On success the browser redirects to Google; only handle the error case.
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }
```

- [ ] **Step 3: Wire the button**

Replace the existing Google `<motion.button>` block:

```tsx
            <motion.button
              variants={item}
              type="button"
              className="w-full flex items-center justify-center gap-2.5 rounded-[10px] py-2.5 text-[12.5px] font-medium transition-colors hover:bg-gray-50"
              style={{
                border: '1px solid rgba(13,13,13,0.11)',
                color: '#0D0D0D',
              }}
            >
              <GoogleIcon />
              {t('login.continueWithGoogle')}
            </motion.button>
```

with:

```tsx
            <motion.button
              variants={item}
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2.5 rounded-[10px] py-2.5 text-[12.5px] font-medium transition-colors hover:bg-gray-50 disabled:opacity-50"
              style={{
                border: '1px solid rgba(13,13,13,0.11)',
                color: '#0D0D0D',
              }}
            >
              <GoogleIcon />
              {googleLoading ? t('login.pleaseWait') : t('login.continueWithGoogle')}
            </motion.button>
```

- [ ] **Step 4: Verify it compiles + lints**

Run: `npm run lint`
Expected: no errors for `app/login/page.tsx`.

- [ ] **Step 5: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat(auth): wire Continue with Google button to signInWithGoogle"
```

---

### Task 4: Confirm proxy passthrough + document setup

**Files:**
- Verify (no change expected): `proxy.ts`
- Modify: `calendar/README.md`

- [ ] **Step 1: Confirm `/auth/callback` is not intercepted**

Read `proxy.ts`. Confirm the only unauthenticated redirect is `!user && path === '/'`, so `/auth/callback` (no user yet) falls through to `return supabaseResponse`, and the `matcher` does not exclude it. **Make no change** unless the path is being redirected.

- [ ] **Step 2: Add a setup pointer to the README**

In `calendar/README.md`, under the `### Environment` section (after the Supabase env block), add:

```markdown
### Google sign-in

The "Continue with Google" button uses Supabase's Google OAuth provider. App
env vars are unchanged (still just the two Supabase keys) — the Google client is
configured in the Google Cloud Console + Supabase dashboard. See
`docs/superpowers/specs/2026-06-03-google-oauth-signin-design.md` →
"Manual configuration" for the exact steps (OAuth consent screen, Web client,
redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`, and adding
`http://localhost:3000/auth/callback` to the Supabase redirect allow-list).
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: note Google sign-in setup in calendar README"
```

---

### Task 5: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npm run test`
Expected: all tests pass, including the new `oauth` (2) and `callback` (3) tests.

- [ ] **Step 2: Lint + build**

Run: `npm run lint`
Then: `npm run build`
Expected: both succeed.

- [ ] **Step 3: Manual OAuth flow (requires dashboard config done)**

Pre-req: the spec's "Manual configuration" steps are complete (Google client + Supabase provider enabled, redirect URLs allow-listed).

1. `npm run dev`; open `http://localhost:3000/login`.
2. Click "Continue with Google" → Google consent screen appears (minimal email/profile scopes only — no calendar permission requested).
3. Approve → redirected back to `http://localhost:3000/` (the app), signed in, with sample course/events/sticky present (the `handle_new_user()` trigger ran).
4. Reload `/` → still signed in (cookie session persists).
5. Sign out (SettingsModal) → `/login`. Sign in with a second Google account → sees only its own data (RLS proof).
6. Existing email/password sign-in still works unchanged.
7. Negative check: visit `http://localhost:3000/login?error=oauth` → the generic "Something went wrong" error shows.

- [ ] **Step 4: Final commit (if any verification fixes were made)**

```bash
git add -A
git commit -m "chore(auth): verification fixes for Google sign-in"
```

---

## Self-review notes

- **Spec coverage:** helper (§Code 1) → Task 1; callback (§Code 2) → Task 2; login wiring + `?error=oauth` + reused i18n (§Code 3) → Task 3; proxy passthrough (§Code 4) → Task 4 Step 1; manual config doc (§Manual configuration) → Task 4 Step 2; unit + manual tests (§Testing) → Tasks 1, 2, 5. Minimal-scopes decision verified in Task 5 Step 3.2.
- **Out of scope** (token storage, Calendar API, two-way sync, avatar) is intentionally absent; the sync seam is comments only.
- **Type/name consistency:** `signInWithGoogle({ scopes?, queryParams? })` used identically in helper, its test, and the login call site (no args). Callback exports `GET`; its test imports `GET`. Redirect targets `/` and `/login?error=oauth` match between route and test.
