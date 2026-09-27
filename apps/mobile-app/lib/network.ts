// Network status, derived rather than declared.
//
// There is no NetInfo in this app and adding a native module for a banner is
// not worth a rebuild. Instead we learn connectivity from the requests the app
// is already making: one wrapper around global `fetch` (installed once, from
// the root layout) reports every outcome and its round-trip time. supabase-js,
// expo-updates and image prefetches all route through global fetch, so this is
// a single hook point with zero call-site changes.
//
// Three states, because "offline" alone is a lie on Indian mobile data — the
// common failure is a connection that resolves in eight seconds, not one that
// fails. Telling someone "slow connection" is the difference between them
// waiting and them force-quitting.
import { useCallback, useSyncExternalStore } from 'react';

import { backoffMs } from './motionMath';

export type NetStatus = 'online' | 'slow' | 'offline';

const SLOW_MS = 2500;     // a request slower than this is a bad connection, not a bad server
const RECOVER_MS = 12000; // how long a 'slow' verdict sticks before we trust 'online' again

let status: NetStatus = 'online';
let slowUntil = 0;
const listeners = new Set<() => void>();

function set(next: NetStatus) {
  if (next === status) return;
  status = next;
  listeners.forEach((l) => l());
}

export function getNetStatus(): NetStatus { return status; }

// Reported by the fetch wrapper; exported so a non-fetch transport (a websocket,
// a native upload) can report too.
export function reportNetwork(ok: boolean, ms: number) {
  if (!ok) { set('offline'); startProbe(); return; }
  const now = Date.now();
  if (ms > SLOW_MS) slowUntil = now + RECOVER_MS;
  set(now < slowUntil ? 'slow' : 'online');
}

// Once offline, nothing sets us back to 'online' on its own — the app has
// stopped making requests precisely because they fail. So while offline we
// probe on a jittered backoff, and the banner clears itself the moment the
// link returns instead of waiting for the user to retry something.
let probing = false;
function startProbe() {
  if (probing) return;
  probing = true;
  let attempt = 0;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const tick = async () => {
    if (status !== 'offline') { probing = false; return; }
    try {
      if (!url) throw new Error('no supabase url configured');
      // HEAD on the REST root: cheapest reachable endpoint, no auth, no body.
      await originalFetch(`${url}/rest/v1/`, { method: 'HEAD' });
      set('online');
      probing = false;
      return;
    } catch {
      attempt += 1;
      setTimeout(tick, backoffMs(attempt));
    }
  };
  setTimeout(tick, backoffMs(0));
}

let originalFetch: typeof fetch = globalThis.fetch;
let installed = false;
export function installNetworkProbe() {
  if (installed) return;
  installed = true;
  originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const started = Date.now();
    try {
      const res = await originalFetch(input, init);
      // A 5xx is the server's problem, not the link's — only transport
      // failures (the throw below) mean offline.
      reportNetwork(true, Date.now() - started);
      return res;
    } catch (e) {
      reportNetwork(false, Date.now() - started);
      throw e;
    }
  };
}

// useSyncExternalStore is the purpose-built subscription primitive: no effect,
// no setState-on-mount, and it cannot tear during a concurrent render.
export function useNetStatus(): NetStatus {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);
  return useSyncExternalStore(subscribe, getNetStatus, getNetStatus);
}
