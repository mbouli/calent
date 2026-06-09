'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '../lib/supabase/client'
import { applyThemeToDocument } from '../lib/themes'

// A theme is a preset id ("light", "dark", "mint", …) or an encoded custom
// theme ("custom:<accent>:<base>"). See lib/themes.ts.
export type Theme = string

export interface Settings {
  theme: Theme
  language: string
  timezone: string
  startWeekMonday: boolean
  hour24: boolean
  onboarded: boolean
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  language: 'en',
  timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  startWeekMonday: true,
  hour24: true,
  // Default true so the tour never shows unless the DB row explicitly says false.
  onboarded: true,
}

export function useSettingsStore() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  // Cache the user id so settings UPDATEs carry an explicit WHERE clause.
  // (Supabase's safeupdate guard rejects UPDATE without one, even though RLS
  // would scope it to this user's single row.)
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id ?? null
    })
    supabase
      .from('settings')
      .select('theme, language, timezone, start_week_monday, hour_24, onboarded')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSettings({
            theme: data.theme,
            language: data.language,
            timezone: data.timezone,
            startWeekMonday: data.start_week_monday,
            hour24: data.hour_24,
            onboarded: data.onboarded ?? true,
          })
        }
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    applyThemeToDocument(settings.theme)
  }, [settings.theme])

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }))

    const row: Record<string, unknown> = {}
    if (updates.theme !== undefined) row.theme = updates.theme
    if (updates.language !== undefined) row.language = updates.language
    if (updates.timezone !== undefined) row.timezone = updates.timezone
    if (updates.startWeekMonday !== undefined) row.start_week_monday = updates.startWeekMonday
    if (updates.hour24 !== undefined) row.hour_24 = updates.hour24
    if (updates.onboarded !== undefined) row.onboarded = updates.onboarded
    if (Object.keys(row).length === 0) return

    const persist = async () => {
      const supabase = createClient()
      let uid = userIdRef.current
      if (!uid) {
        const { data } = await supabase.auth.getUser()
        uid = data.user?.id ?? null
        userIdRef.current = uid
      }
      if (!uid) return
      const { error } = await supabase.from('settings').update(row).eq('user_id', uid)
      if (error) console.error('Failed to save settings', error)
    }
    persist()
  }, [])

  return { settings, loading, updateSettings }
}
