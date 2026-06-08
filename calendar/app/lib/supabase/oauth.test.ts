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
