// Geist is the web app's typeface; we mirror it here. React Native can't
// synthesize weights from a single custom family, so each weight maps to the
// concrete static face shipped by @expo-google-fonts/geist. Use these instead
// of `fontWeight` so headings/body render in the right Geist cut.

export const Fonts = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
} as const;
