'use client'

import { createContext, useContext } from 'react'
import type { Settings } from '../hooks/useSettingsStore'

// Sensible defaults so components reading the context never crash if they
// somehow render outside the provider (and match the store's defaults).
const DEFAULTS: Settings = {
  theme: 'light',
  language: 'en',
  timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  startWeekMonday: true,
  hour24: true,
  onboarded: true,
}

const SettingsContext = createContext<Settings>(DEFAULTS)

export function SettingsProvider({
  value,
  children,
}: {
  value: Settings
  children: React.ReactNode
}) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useAppSettings(): Settings {
  return useContext(SettingsContext)
}
