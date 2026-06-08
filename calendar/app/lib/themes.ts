// Theme system.
//
// A theme value is either a preset id ("light", "dark", "mint", …) or a custom
// theme encoded as "custom:<accentHex>:<baseHex>" so the whole thing fits in the
// single existing `theme` text column (no DB migration needed).
//
// Presets get their CSS variables from globals.css via [data-theme="…"]. Custom
// themes derive a full variable set from two colors and apply them inline.

export const PRESET_THEMES = [
  'light',
  'dark',
  'mint',
  'lavender',
  'pink',
  'butter',
  'war-eagle',
] as const

export type PresetTheme = (typeof PRESET_THEMES)[number]

// Presets that render on a dark canvas — these toggle the `.dark` class so the
// dark-adapted event/sticky colors (and existing dark: utilities) kick in.
const DARK_PRESETS = new Set<string>(['dark', 'war-eagle'])

// Swatches for the theme picker previews: [canvas, accent, ink].
export const THEME_PREVIEW: Record<PresetTheme, { bg: string; accent: string; ink: string }> = {
  light:       { bg: '#ffffff', accent: '#0d0d0d', ink: '#0d0d0d' },
  dark:        { bg: '#2b2b30', accent: '#ff7264', ink: '#f4f4f5' },
  mint:        { bg: '#eaf8f1', accent: '#2fb783', ink: '#15171a' },
  lavender:    { bg: '#f1eefb', accent: '#7c6cf0', ink: '#15171a' },
  pink:        { bg: '#fceffd', accent: '#dd66c4', ink: '#15171a' },
  butter:      { bg: '#fffbe6', accent: '#e0a92e', ink: '#15171a' },
  'war-eagle': { bg: '#0c2340', accent: '#e87722', ink: '#eaf0f8' },
}

// ─── Custom theme ──────────────────────────────────────────────────────────────

export interface CustomTheme {
  accent: string
  base: string
}

export const DEFAULT_CUSTOM: CustomTheme = { accent: '#e87722', base: '#0c2340' }

export function isCustomTheme(value: string): boolean {
  return value.startsWith('custom:')
}

export function parseCustomTheme(value: string): CustomTheme {
  const [, accent, base] = value.split(':')
  return {
    accent: accent || DEFAULT_CUSTOM.accent,
    base: base || DEFAULT_CUSTOM.base,
  }
}

export function encodeCustomTheme({ accent, base }: CustomTheme): string {
  return `custom:${accent}:${base}`
}

// ─── Color math ──────────────────────────────────────────────────────────────

interface RGB { r: number; g: number; b: number }

function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function rgbToHex({ r, g, b }: RGB): string {
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

// Mix `t` (0..1) of color `b` into color `a`.
function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a)
  const y = hexToRgb(b)
  return rgbToHex({
    r: x.r + (y.r - x.r) * t,
    g: x.g + (y.g - x.g) * t,
    b: x.b + (y.b - x.b) * t,
  })
}

// Relative luminance (0 = black, 1 = white), used to decide light vs dark.
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function isDarkColor(hex: string): boolean {
  return luminance(hex) < 0.4
}

// Readable ink/paper color for text sitting on `bg`.
function readableOn(bg: string): string {
  return luminance(bg) > 0.5 ? '#15171a' : '#f6f8fc'
}

// Full CSS-variable set derived from an accent + base color.
function customVars(accent: string, base: string): Record<string, string> {
  const dark = isDarkColor(base)
  const fg = dark ? '#f4f6fa' : '#15171a'
  const card = dark ? mix(base, '#ffffff', 0.06) : '#ffffff'
  const popover = dark ? mix(base, '#ffffff', 0.08) : '#ffffff'
  const muted = mix(base, fg, 0.08)
  const accentSurface = mix(base, fg, 0.1)
  const border = mix(base, fg, dark ? 0.16 : 0.12)
  const mutedFg = mix(base, fg, dark ? 0.55 : 0.45)
  const onAccent = readableOn(accent)

  return {
    '--background': base,
    '--foreground': fg,
    '--card': card,
    '--card-foreground': fg,
    '--popover': popover,
    '--popover-foreground': fg,
    '--primary': accent,
    '--primary-foreground': onAccent,
    '--secondary': muted,
    '--secondary-foreground': fg,
    '--muted': muted,
    '--muted-foreground': mutedFg,
    '--accent': accentSurface,
    '--accent-foreground': fg,
    '--border': border,
    '--input': border,
    '--ring': accent,
    '--sidebar': dark ? mix(base, '#000000', 0.04) : mix(base, '#ffffff', 0.45),
    '--sidebar-foreground': fg,
    '--sidebar-primary': accent,
    '--sidebar-primary-foreground': onAccent,
    '--sidebar-accent': accentSurface,
    '--sidebar-accent-foreground': fg,
    '--sidebar-border': border,
    '--sidebar-ring': accent,
  }
}

const CUSTOM_VAR_NAMES = Object.keys(customVars('#000', '#fff'))

// ─── Apply to the document ─────────────────────────────────────────────────────

export function isDarkTheme(value: string): boolean {
  if (isCustomTheme(value)) return isDarkColor(parseCustomTheme(value).base)
  return DARK_PRESETS.has(value)
}

export function applyThemeToDocument(value: string) {
  if (typeof document === 'undefined') return
  const el = document.documentElement

  el.classList.toggle('dark', isDarkTheme(value))

  if (isCustomTheme(value)) {
    el.dataset.theme = 'custom'
    const { accent, base } = parseCustomTheme(value)
    const vars = customVars(accent, base)
    for (const [name, val] of Object.entries(vars)) el.style.setProperty(name, val)
  } else {
    el.dataset.theme = value
    // Clear any inline custom vars so the preset's CSS takes over.
    for (const name of CUSTOM_VAR_NAMES) el.style.removeProperty(name)
  }
}
