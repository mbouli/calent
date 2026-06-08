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

  it('honours a safe ?next path on success', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })
    const res = await GET(new Request('https://app.test/auth/callback?code=abc&next=/settings'))
    expect(res.headers.get('location')).toBe('https://app.test/settings')
  })

  it('ignores an unsafe protocol-relative ?next (open-redirect guard)', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })
    const res = await GET(new Request('https://app.test/auth/callback?code=abc&next=//evil.com'))
    expect(res.headers.get('location')).toBe('https://app.test/')
  })
})
