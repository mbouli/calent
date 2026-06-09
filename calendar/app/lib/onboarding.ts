/**
 * The first-run tour shows only once settings have loaded AND the account has
 * not been onboarded yet. Gating on `loading` prevents a flash before the real
 * `onboarded` value arrives from Supabase.
 */
export function shouldShowTour(loading: boolean, onboarded: boolean): boolean {
  return !loading && !onboarded
}
