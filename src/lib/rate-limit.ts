type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

function key(ip: string, scope: string) {
  return `${scope}:${ip}`;
}

export function checkIpRate(opts: {
  ip: string | null;
  scope: string;
  limit: number;
  windowMs: number;
}): { ok: boolean; retryAfterSec?: number; remaining?: number } {
  const ip = opts.ip ?? "unknown";
  const k = key(ip, opts.scope);
  const now = Date.now();
  const entry = store.get(k);

  if (!entry || now > entry.resetAt) {
    store.set(k, { count: 1, resetAt: now + opts.windowMs });
    // opportunistic cleanup to avoid unbounded growth (Vercel serverless isolates but still)
    if (store.size > 5000) {
      for (const [kk, v] of store.entries()) if (now > v.resetAt) store.delete(kk);
    }
    return { ok: true, remaining: opts.limit - 1 };
  }

  if (entry.count >= opts.limit) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { ok: false, retryAfterSec, remaining: 0 };
  }

  entry.count++;
  return { ok: true, remaining: opts.limit - entry.count };
}

export function getClientIpFromRequest(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}
