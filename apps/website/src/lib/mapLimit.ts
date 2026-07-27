/**
 * Run `fn` over `items` with at most `limit` in flight, preserving input order
 * in the result.
 *
 * Promise.all over every notification at once would open hundreds of sockets to
 * FCM from one serverless invocation; a plain for-await would send them one at a
 * time and blow the function timeout.
 */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}
