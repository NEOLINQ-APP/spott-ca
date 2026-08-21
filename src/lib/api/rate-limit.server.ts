// Best-effort in-memory rate limiter for public CRM integration endpoints
// (businesses.search, connections.exchange). Scoped to a single warm
// serverless instance — resets on cold start, doesn't share state across
// instances. That's a real, known limitation (see Phase E report), not a
// substitute for a durable limiter; it's here specifically to blunt naive
// scraping/guessing, not to be airtight.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-nf-client-connection-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}
