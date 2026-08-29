"use client";

import Script from "next/script";

/**
 * Cloudflare Turnstile, rendered implicitly: the script auto-detects this
 * `.cf-turnstile` div and, once solved, injects a hidden
 * `<input name="cf-turnstile-response">` into the enclosing <form> —
 * readable via `new FormData(formEl).get("cf-turnstile-response")` exactly
 * like every other field these forms already collect. No extra JS state.
 *
 * Renders nothing if NEXT_PUBLIC_TURNSTILE_SITE_KEY isn't configured; the
 * matching server-side check (see src/lib/turnstile.ts) handles that case.
 */
export function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        async
        defer
      />
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" />
    </>
  );
}
