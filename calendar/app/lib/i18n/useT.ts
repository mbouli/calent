'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAppSettings } from '../settings-context'
import { translate, bcp47, LOCALES, type TParams } from './index'

/**
 * Translation hook for components rendered inside <SettingsProvider>.
 * Reads the active language from settings and returns:
 *   - t(key, params?) → localized string
 *   - locale          → BCP-47 locale for Intl date/time formatting
 *   - lang            → the raw app language code (e.g. "es")
 */
export function useT() {
  const { language } = useAppSettings()
  const t = useCallback(
    (key: string, params?: TParams) => translate(language, key, params),
    [language],
  )
  return { t, lang: language, locale: bcp47(language) }
}

/**
 * Translation hook for pre-auth screens (login, loader) that render outside
 * <SettingsProvider>, before a saved language exists. Falls back to the
 * browser's language. Starts as English so server and first client render
 * match, then upgrades after mount.
 */
export function useBrowserT() {
  const [lang, setLang] = useState('en')
  useEffect(() => {
    const code = (navigator.language || 'en').split('-')[0]
    if (LOCALES[code]) setLang(code)
  }, [])
  const t = useCallback(
    (key: string, params?: TParams) => translate(lang, key, params),
    [lang],
  )
  return { t, lang, locale: bcp47(lang) }
}

// Standalone translator for plain functions (no React context available).
export { translate } from './index'
export type Translate = (key: string, params?: TParams) => string
