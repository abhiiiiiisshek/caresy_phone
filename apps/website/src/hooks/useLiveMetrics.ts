'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

// Static, honest fallback used until the real row loads (or if the
// `ops_metrics` table/row isn't reachable yet). No randomness — these
// are only ever shown until the real Supabase value arrives.
const FALLBACK_CALLBACK_MIN = 5;
const FALLBACK_DESK_COMPANIONS = 6;

// Cache the fetched values across route changes during the same session
// so the widget doesn't flash/refetch on every navigation.
let cachedCallbackMin: number | null = null;
let cachedDeskCompanions: number | null = null;

export function useLiveMetrics() {
  const [callbackMin, setCallbackMin] = useState<number>(cachedCallbackMin ?? FALLBACK_CALLBACK_MIN);
  const [deskCompanions, setDeskCompanions] = useState<number>(cachedDeskCompanions ?? FALLBACK_DESK_COMPANIONS);

  useEffect(() => {
    if (cachedCallbackMin !== null && cachedDeskCompanions !== null) {
      setCallbackMin(cachedCallbackMin);
      setDeskCompanions(cachedDeskCompanions);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    supabase
      .from('ops_metrics')
      .select('active_companions, avg_callback_minutes')
      .eq('id', 1)
      .single()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        cachedCallbackMin = data.avg_callback_minutes;
        cachedDeskCompanions = data.active_companions;
        setCallbackMin(data.avg_callback_minutes);
        setDeskCompanions(data.active_companions);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { callbackMin, deskCompanions };
}
