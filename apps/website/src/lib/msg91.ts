import { normalizeIndianMobile } from '@caresy/utils/phone';

/**
 * The verified number out of MSG91's verifyAccessToken response, or null if it
 * did not verify.
 *
 * On success MSG91 puts the identifier it verified in `message` —
 * "919876543210" for an Indian mobile. Anything else (type: "error", a request
 * id, an empty body) must fail closed: this function is the only thing standing
 * between an arbitrary token and a Supabase session, so it is deliberately
 * separate from the route and covered by msg91.check.ts.
 */
export function phoneFromVerifyResult(result: unknown): string | null {
  const r = result as { type?: string; message?: unknown } | null;
  if (!r || typeof r !== 'object' || r.type !== 'success') return null;
  const national = normalizeIndianMobile(String(r.message ?? ''));
  return national ? `+91${national}` : null;
}
