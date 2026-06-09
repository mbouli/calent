import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const signInWithPassword = vi.fn()

vi.mock('@/app/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { signInWithPassword } })),
}))

import { GET } from './route'

const req = (url: string) => GET(new Request(url))

describe('GET /api/test-login', () => {
  beforeEach(() => {
    signInWithPassword.mockReset()
    // vitest runs with NODE_ENV='test', so the production guard is open by default.
    vi.stubEnv('TESTING', 'true')
    vi.stubEnv('TEST_USER_EMAIL', 'test@example.com')
    vi.stubEnv('TEST_USER_PASSWORD', 'secret')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('is a no-op (404) when TESTING is not enabled', async () => {
    vi.stubEnv('TESTING', '')
    const res = await req('https://app.test/api/test-login')
    expect(res.status).toBe(404)
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('is a no-op (404) in production even when TESTING is true', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const res = await req('https://app.test/api/test-login')
    expect(res.status).toBe(404)
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('signs in the test user and redirects home on success', async () => {
    signInWithPassword.mockResolvedValue({ error: null })
    const res = await req('https://app.test/api/test-login')
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'secret',
    })
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://app.test/')
  })

  it('honours a safe ?next path', async () => {
    signInWithPassword.mockResolvedValue({ error: null })
    const res = await req('https://app.test/api/test-login?next=/settings')
    expect(res.headers.get('location')).toBe('https://app.test/settings')
  })

  it('ignores an unsafe protocol-relative ?next (open-redirect guard)', async () => {
    signInWithPassword.mockResolvedValue({ error: null })
    const res = await req('https://app.test/api/test-login?next=//evil.com')
    expect(res.headers.get('location')).toBe('https://app.test/')
  })

  it('returns an error (no redirect loop) when credentials are missing', async () => {
    vi.stubEnv('TEST_USER_EMAIL', '')
    const res = await req('https://app.test/api/test-login')
    expect(res.status).toBe(500)
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('returns an error (no redirect loop) when sign-in fails', async () => {
    signInWithPassword.mockResolvedValue({ error: new Error('Invalid login credentials') })
    const res = await req('https://app.test/api/test-login')
    expect(res.status).toBe(401)
    expect(res.headers.get('location')).toBeNull()
  })
})
