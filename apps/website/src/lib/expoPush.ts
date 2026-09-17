// Expo push sender.
//
// The native apps mint **Expo** push tokens (`Notifications.getExpoPushTokenAsync`),
// not raw FCM/APNs tokens — an `ExponentPushToken[...]` string. Handing one of
// those to FCM v1 is an INVALID_ARGUMENT every time, which `shouldRetireToken`
// then reads as a dead token and deletes. So every device the apps registered
// was quietly retired on its first notification.
//
// Expo's own service takes those tokens, holds the APNs/FCM credentials EAS
// already manages, and needs no service-account secret here. Routing is by
// token shape (see `isExpoToken`) so a future raw-FCM token still takes the FCM
// path — there is one send site, and it decides per token.
//
// No auth header: a push token is the capability. EXPO_ACCESS_TOKEN can be set
// to additionally require an account-scoped token, and is sent when present.

const ENDPOINT = 'https://exp.host/--/api/v2/push/send';

// Expo caps a single request at 100 messages.
const BATCH = 100;

export interface ExpoMessage {
  token: string;
  title: string;
  body?: string | null;
  data?: Record<string, string>;
}

export type ExpoResult =
  | { ok: true }
  | { ok: false; error: string; retire: boolean };

/** Both shapes Expo issues. Anything else is a raw FCM/APNs token. */
export function isExpoToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}

/**
 * `DeviceNotRegistered` is the only receipt that means "this token is dead" —
 * the app was uninstalled or the token was replaced. `MessageTooBig`,
 * `MessageRateExceeded` and `MismatchSenderId` are all our problem or a
 * transient one, and retiring the token would lose a live device for good.
 */
export function shouldRetireExpoToken(errorCode: string | undefined, message: string): boolean {
  if (errorCode === 'DeviceNotRegistered') return true;
  return !errorCode && /not a registered push notification recipient/i.test(message);
}

interface Ticket {
  status?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Sends one batch and returns a result per message, in the order given — the
 * caller pairs results back to tokens positionally, same as the FCM path.
 */
export async function sendExpoPush(messages: ExpoMessage[]): Promise<ExpoResult[]> {
  if (!messages.length) return [];

  const out: ExpoResult[] = [];
  for (let i = 0; i < messages.length; i += BATCH) {
    const slice = messages.slice(i, i + BATCH);
    const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(
          slice.map((m) => ({
            to: m.token,
            title: m.title,
            body: m.body ?? undefined,
            data: m.data,
            sound: 'default',
            priority: 'high',
            channelId: 'dispatch',
          })),
        ),
      });
    } catch (e) {
      // A network failure is transient for every message in the batch.
      slice.forEach(() => out.push({ ok: false, error: (e as Error).message, retire: false }));
      continue;
    }

    if (!res.ok) {
      const text = (await res.text().catch(() => '')).slice(0, 200);
      slice.forEach(() => out.push({ ok: false, error: `HTTP ${res.status}: ${text}`, retire: false }));
      continue;
    }

    const payload = (await res.json().catch(() => ({}))) as { data?: Ticket[] };
    const tickets = payload.data ?? [];
    slice.forEach((_, j) => {
      const t = tickets[j];
      // A missing ticket is not a dead token — treat it as retryable.
      if (!t) { out.push({ ok: false, error: 'no ticket returned', retire: false }); return; }
      if (t.status === 'ok') { out.push({ ok: true }); return; }
      const code = t.details?.error;
      const message = t.message ?? 'unknown Expo push error';
      out.push({ ok: false, error: `${code ?? 'error'}: ${message}`, retire: shouldRetireExpoToken(code, message) });
    });
  }

  return out;
}
