import { useCallback, useState } from 'react';
import { Linking } from 'react-native';

import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };

// Shared "share my current location" flow for booking.tsx + quick-help.tsx.
// Only ever fires from an explicit user tap (never on mount/screen-open) —
// requestForegroundPermissionsAsync() shows the OS dialog, so triggering it
// automatically reads as the app grabbing location it hasn't earned yet.
export function useCurrentLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // canAskAgain === false means iOS/Android will never show the permission
  // dialog again — the only way forward is the Settings app.
  const [blocked, setBlocked] = useState(false);

  const request = useCallback(async (): Promise<Coords | null> => {
    setLoading(true);
    setError(null);
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setBlocked(!canAskAgain);
        setError(canAskAgain ? 'Location permission denied.' : 'Location is off for Caresy.');
        return null;
      }
      setBlocked(false);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setCoords(c);
      return c;
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Could not get your location.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => { setCoords(null); setError(null); setBlocked(false); }, []);

  return { coords, loading, error, blocked, request, reset, openSettings: Linking.openSettings };
}
