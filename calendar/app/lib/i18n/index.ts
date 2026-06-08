import en from './locales/en.json'
import es from './locales/es.json'

// English is the source of truth for the key set. Other locales may translate a
// subset; anything missing falls back to English (see `translate`).
export type Messages = typeof en

// Add a locale here once its JSON file exists. The language codes match the
// values stored in settings.language / the SettingsModal language selector.
export const LOCALES: Record<string, Messages> = { en, es }

// App language code → BCP-47 locale used for Intl date/time formatting, so
// weekday and month names localize automatically alongside the UI strings.
const BCP47: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
}

export function bcp47(lang: string): string {
  return BCP47[lang] ?? 'en-US'
}

export type TParams = Record<string, string | number>

function lookup(messages: unknown, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, messages)
  return typeof value === 'string' ? value : undefined
}

/**
 * Resolve a dotted key (e.g. "settings.title") for the given language,
 * interpolating {placeholders}. Falls back to English, then to the raw key,
 * so a partially-translated locale never renders blank.
 */
export function translate(lang: string, key: string, params?: TParams): string {
  const messages = LOCALES[lang] ?? LOCALES.en
  const raw = lookup(messages, key) ?? lookup(LOCALES.en, key) ?? key
  if (!params) return raw
  return raw.replace(/\{(\w+)\}/g, (_, name) =>
    params[name] !== undefined ? String(params[name]) : `{${name}}`,
  )
}
