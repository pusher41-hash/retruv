const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Best-effort client IP from standard proxy headers (improves Cloudflare's risk scoring). */
export function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

/**
 * Verifies a Cloudflare Turnstile token server-side before a sensitive
 * write (register, declare lost/found) is accepted.
 *
 * If `TURNSTILE_SECRET_KEY` isn't configured: fails open in development
 * (so local work doesn't require a Cloudflare account) and fails closed in
 * production (never silently skips the check on a real deployment).
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<{ ok: boolean; reason?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, reason: "Vérification anti-robot indisponible." };
    }
    return { ok: true };
  }

  if (!token || typeof token !== "string") {
    return { ok: false, reason: "Vérification anti-robot requise." };
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    if (!data.success) {
      return { ok: false, reason: "Vérification anti-robot échouée." };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "Vérification anti-robot indisponible." };
  }
}
