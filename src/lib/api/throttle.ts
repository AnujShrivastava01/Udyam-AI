/**
 * A small per-instance request throttle.
 *
 * Two routes bill a third party per call — /api/narrate spends Gemini tokens, /api/voice/speak
 * spends Sarvam credit — and both must be callable from the browser, so neither can carry the
 * shared secret the webhook uses. This is what stands in for that.
 *
 * It is deliberately modest and says so: the map is per process, and a serverless deployment runs
 * many processes, so this is not a rate limit in the security sense. It stops one open tab from
 * looping an endpoint, which is the failure mode a demo actually hits. A real deployment puts a
 * limiter at the edge, where it can see every instance.
 */

const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

/** Returns true when this caller has exceeded `max` requests in the last minute. */
export function throttled(key: string, max: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);

  // Keep the map from growing without bound across many distinct callers.
  if (hits.size > 1000) {
    for (const [k, v] of hits) {
      if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length > max;
}

/** Best-effort caller identity. Behind a proxy this is the client; locally it is "local". */
export function callerKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
