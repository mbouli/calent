import { describe, it, expect } from 'vitest'
import { shouldShowTour } from './onboarding'

describe('shouldShowTour', () => {
  it('shows once settings are loaded and the account is not onboarded', () => {
    expect(shouldShowTour(false, false)).toBe(true)
  })
  it('stays hidden while settings are still loading', () => {
    expect(shouldShowTour(true, false)).toBe(false)
  })
  it('stays hidden when the account is already onboarded', () => {
    expect(shouldShowTour(false, true)).toBe(false)
  })
  it('stays hidden while loading even if onboarded', () => {
    expect(shouldShowTour(true, true)).toBe(false)
  })
})
