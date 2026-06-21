// Calent visual identity for React Native.
//
// The web app encodes event colors as Tailwind class names (e.g. `bg-indigo-50`);
// those don't exist in RN, so we resolve each EventColor to concrete hex values
// drawn from the same Tailwind palette the web UI uses (solid = -500, soft
// fill = -50 light / translucent dark, text = -800 light / -200 dark).

import { EventColor } from '../domain/types';

export interface EventColorSet {
  /** Strong accent — the -500 swatch. Used for left rails, dots, picker chips. */
  solid: string;
  /** Soft chip background in light mode (-50). */
  bgLight: string;
  /** Soft chip background in dark mode (translucent -500). */
  bgDark: string;
  /** Title text on a chip in light mode (-800). */
  textLight: string;
  /** Title text on a chip in dark mode (-200). */
  textDark: string;
}

export const EVENT_COLORS: EventColor[] = ['indigo', 'violet', 'rose', 'emerald', 'amber', 'sky'];

export const EVENT_PALETTE: Record<EventColor, EventColorSet> = {
  indigo: {
    solid: '#6366f1',
    bgLight: '#eef2ff',
    bgDark: 'rgba(99,102,241,0.20)',
    textLight: '#3730a3',
    textDark: '#c7d2fe',
  },
  violet: {
    solid: '#8b5cf6',
    bgLight: '#f5f3ff',
    bgDark: 'rgba(139,92,246,0.20)',
    textLight: '#5b21b6',
    textDark: '#ddd6fe',
  },
  rose: {
    solid: '#f43f5e',
    bgLight: '#fff1f2',
    bgDark: 'rgba(244,63,94,0.20)',
    textLight: '#9f1239',
    textDark: '#fecdd3',
  },
  emerald: {
    solid: '#10b981',
    bgLight: '#ecfdf5',
    bgDark: 'rgba(16,185,129,0.20)',
    textLight: '#065f46',
    textDark: '#a7f3d0',
  },
  amber: {
    solid: '#f59e0b',
    bgLight: '#fffbeb',
    bgDark: 'rgba(245,158,11,0.20)',
    textLight: '#92400e',
    textDark: '#fde68a',
  },
  sky: {
    solid: '#0ea5e9',
    bgLight: '#f0f9ff',
    bgDark: 'rgba(14,165,233,0.20)',
    textLight: '#075985',
    textDark: '#bae6fd',
  },
};

// Neutral app surface tokens (light theme — the Calent default canvas). Values
// are the web app's default `:root` oklch tokens converted to sRGB hex, so the
// mobile chrome matches the web pixel-for-pixel (pure grays, no blue tint).
export const Palette = {
  background: '#ffffff', // --background  oklch(1 0 0)
  surface: '#ffffff',
  surfaceMuted: '#f5f5f5', // --muted / --secondary  oklch(0.97 0 0)
  border: '#e5e5e5', // --border  oklch(0.922 0 0)
  borderStrong: '#d4d4d4',
  text: '#0a0a0a', // --foreground  oklch(0.145 0 0)
  textMuted: '#737373', // --muted-foreground  oklch(0.556 0 0)
  textFaint: '#a1a1a1', // --ring  oklch(0.708 0 0)
  primary: '#171717', // --primary  oklch(0.205 0 0) — the black "today" pill / avatar fill
  primaryText: '#ffffff', // --primary-foreground  oklch(0.985 0 0)
  accent: '#FF7264', // Calent brand salmon — the web's CTA/brand accent (lib/theme.ts)
  accentText: '#0d0d0d', // dark ink on salmon, matching the web's salmon buttons
  accentSoft: 'rgba(255,114,100,0.16)', // faint salmon fill for selected states
  danger: '#ef4444',
  today: '#FF7264', // today pill — brand salmon (matches the web's dark-theme accent)
} as const;

export const Radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;
