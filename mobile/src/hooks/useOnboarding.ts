import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * First-run onboarding gate, mirroring the web app. The tour shows once per
 * account: we read `settings.onboarded` after auth and only open when it is
 * explicitly `false`. If no settings row exists we default to "already
 * onboarded" (don't show) — the same fallback the web's useSettingsStore uses
 * (`data.onboarded ?? true`).
 */
export function useOnboarding() {
  const [showTour, setShowTour] = useState(false);
  // Cache the user id so the completion UPDATE can carry an explicit WHERE
  // clause — Supabase's safeupdate guard rejects UPDATE without one.
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      userIdRef.current = userData.user?.id ?? null;

      const { data } = await supabase
        .from('settings')
        .select('onboarded')
        .maybeSingle();

      if (!mounted) return;
      // Only open when a row exists and onboarded is explicitly false.
      if (data && data.onboarded === false) setShowTour(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const completeTour = useCallback(() => {
    // Optimistically close; persist in the background.
    setShowTour(false);

    (async () => {
      let uid = userIdRef.current;
      if (!uid) {
        const { data } = await supabase.auth.getUser();
        uid = data.user?.id ?? null;
        userIdRef.current = uid;
      }
      if (!uid) return;
      const { error } = await supabase
        .from('settings')
        .update({ onboarded: true })
        .eq('user_id', uid);
      if (error) console.error('Failed to save onboarded flag', error);
    })();
  }, []);

  return { showTour, completeTour };
}
