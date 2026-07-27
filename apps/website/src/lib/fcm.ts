// FCM HTTP v1 sender.
//
// v1 has no multicast endpoint — one HTTP call per device token — and it wants
// an OAuth2 bearer token rather than the old server key. That means signing a
// JWT with the service account's private key, which Web Crypto does natively;
// no googleapis SDK needed for two requests.
//
// Env (Vercel → website project → Settings → Environment Variables):
//   FIREBASE_SERVICE_ACCOUNT   the whole service-account JSON, pasted as one value.
//     Firebase console → Project settings → Service accounts → Generate new
//     private key. This grants send-as-your-project; it is a server secret and
//     must never reach NEXT_PUBLIC_* or the browser bundle.

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

export interface PushMessage {
  token: string;
  title: string;
  body?: string | null;
  data?: Record<string, string>;
}

export type PushResult =
  | { ok: true }
  // `retire` means FCM says this token is dead — delete it rather than retrying.
  | { ok: false; error: string; retire: boolean };

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

function serviceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');

  const parsed = JSON.parse(raw) as ServiceAccount;
  if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing client_email, private_key or project_id');
  }
  return parsed;
}

function b64url(bytes: Uint8Array | string): string {
  const bin = typeof bytes === 'string' ? bytes : String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Pasting JSON into a dashboard field usually turns the newlines into a
  // literal backslash-n, so restore them before stripping the PEM armour.
  const normalised = pem.replace(/\\n/g, '\n');
  const body = normalised
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

// Access tokens last an hour. Module scope survives across invocations on a warm
// serverless instance, so most runs skip the OAuth round trip entirely.
let cached: { token: string; expiresAt: number } | null = null;

export async function accessToken(now = Date.now()): Promise<string> {
  // 60s of slack so a token cannot expire mid-batch.
  if (cached && cached.expiresAt > now + 60_000) return cached.token;

  const sa = serviceAccount();
  const iat = Math.floor(now / 1000);
  const claims = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat,
    exp: iat + 3600,
  };

  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify(claims))}`;
  const key = await importPrivateKey(sa.private_key);
  const sig = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)),
  );
  const jwt = `${unsigned}.${b64url(sig)}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const payload = await res.json();
  if (!res.ok || !payload.access_token) {
    throw new Error(`FCM auth failed (${res.status}): ${payload.error_description || payload.error || 'no access_token'}`);
  }

  cached = { token: payload.access_token as string, expiresAt: now + (payload.expires_in ?? 3600) * 1000 };
  return cached.token;
}

/** Exported for the self-check; resets the module-level token cache. */
export function _resetTokenCache() {
  cached = null;
}

/**
 * Should this token be deleted rather than retried?
 *
 * UNREGISTERED: the app was uninstalled or the token was replaced.
 * INVALID_ARGUMENT on a send is almost always a malformed token — but the same
 * code covers a malformed *payload*, which is our bug and must stay retryable,
 * hence the mention-of-token check.
 * Everything else (auth, quota, FCM outage) is transient. Retrying is correct.
 *
 * Pure and exported so push.check.ts can cover it without a network call.
 */
export function shouldRetireToken(errorCode: string | undefined, httpStatus: number, message: string): boolean {
  if (errorCode === 'UNREGISTERED') return true;
  if (httpStatus === 404) return true;
  return errorCode === 'INVALID_ARGUMENT' && /token/i.test(message);
}

export async function sendPush(msg: PushMessage, bearer: string, projectId: string): Promise<PushResult> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token: msg.token,
        notification: { title: msg.title, body: msg.body ?? undefined },
        data: msg.data,
        android: { priority: 'HIGH', notification: { channel_id: 'caresy' } },
      },
    }),
  });

  if (res.ok) return { ok: true };

  const payload = await res.json().catch(() => ({}));
  const status = payload?.error?.details?.find(
    (d: { '@type'?: string }) => d['@type']?.includes('FcmError'),
  )?.errorCode as string | undefined;
  const message = payload?.error?.message || `HTTP ${res.status}`;

  return {
    ok: false,
    error: `${status ?? res.status}: ${message}`,
    retire: shouldRetireToken(status, res.status, message),
  };
}

export function projectId(): string {
  return serviceAccount().project_id;
}
