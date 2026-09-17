import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';

import { supabase } from './supabase';
import { BOOKING_SELECT, type AdminBooking } from './dispatch';

// How the board stays current, cheapest thing that works first:
//   • a 30s poll while the app is foregrounded — no DB configuration, no
//     publication to enable, works on day one;
//   • an immediate refetch when the app comes back to the foreground;
//   • an immediate refetch when a dispatch push lands, so tapping the alert
//     never shows a stale card.
// Supabase Realtime would remove the poll, but it needs `bookings` added to the
// supabase_realtime publication; not worth a migration for a desk that turns
// over a handful of rows an hour.
// ponytail: 30s poll, switch to Realtime if the row count or battery cost bites.
const POLL_MS = 30_000;

export function useBookings(enabled: boolean) {
  const [bookings, setBookings] = useState<AdminBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (!enabled || inFlight.current) return;
    inFlight.current = true;
    const { data, error: err } = await supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .order('created_at', { ascending: false })
      .limit(200);
    inFlight.current = false;
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    // Supabase types a to-one join as an array; cast once, here at the query
    // boundary, and never deeper.
    setBookings((data ?? []) as unknown as AdminBooking[]);
  }, [enabled]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    if (!enabled) return;
    load();
    const timer = setInterval(load, POLL_MS);
    const appSub = AppState.addEventListener('change', (s) => { if (s === 'active') load(); });
    const pushSub = Notifications.addNotificationReceivedListener(() => { load(); });
    return () => {
      clearInterval(timer);
      appSub.remove();
      pushSub.remove();
    };
  }, [enabled, load]);

  return { bookings, error, refreshing, refresh, reload: load };
}

export interface ApprovedCompanion {
  id: string;
  full_name: string;
  photo_url: string | null;
  rating: number | null;
  total_jobs: number;
  can_drive: boolean;
  specialties: string[] | null;
  languages: string[] | null;
}

export function useCompanions(enabled: boolean) {
  const [companions, setCompanions] = useState<ApprovedCompanion[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let stale = false;
    (async () => {
      const { data } = await supabase
        .from('companions')
        .select('id, full_name, photo_url, rating, total_jobs, can_drive, specialties, languages')
        .eq('approval_status', 'APPROVED')
        .is('deleted_at', null)
        .order('full_name');
      if (!stale) setCompanions((data ?? []) as ApprovedCompanion[]);
    })();
    return () => { stale = true; };
  }, [enabled]);

  return companions;
}
