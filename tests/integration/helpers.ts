export const BASE_URL = "http://localhost:3100";

/**
 * `next dev` with Turbopack compiles each route on its first request rather
 * than up front — the global-setup health check can succeed while
 * `/api/auth/register` (or any other not-yet-hit route) still 404s for a
 * moment. That 404 is Next's own "page not found" HTML page, distinguishable
 * from a real API 404 (always JSON, via lib/api.ts's jsonError) by
 * content-type. Retrying only that specific case turned an intermittently
 * flaky suite (all tests failing on a cold server) fully deterministic.
 */
async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(`${BASE_URL}${path}`, init);
    const isColdCompile404 =
      res.status === 404 &&
      (res.headers.get("content-type") ?? "").includes("text/html");
    if (!isColdCompile404 || attempt === maxAttempts) return res;
    await new Promise((r) => setTimeout(r, 300 * attempt));
  }
  throw new Error("unreachable");
}

/**
 * `+22677xxxxxx` — a prefix not used by the seeded demo accounts (`+22670…`)
 * or anything else in seed.ts, so generated test users never collide with
 * fixture data that other tests (or a human) might rely on.
 */
export function randomPhone(): string {
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `+22677${suffix}`;
}

export interface TestSession {
  cookie: string;
  userId: string;
}

function extractCookie(res: Response): string {
  const raw = res.headers.get("set-cookie");
  if (!raw) throw new Error("Response carried no Set-Cookie header");
  return raw.split(";")[0];
}

export async function registerUser(
  overrides: Partial<{
    fullName: string;
    phone: string;
    password: string;
    city: string;
    country: string;
  }> = {}
): Promise<TestSession> {
  const phone = overrides.phone ?? randomPhone();
  const res = await apiFetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: overrides.fullName ?? "Test User",
      phone,
      password: overrides.password ?? "TestPass123!",
      city: overrides.city ?? "Ouagadougou",
      country: overrides.country ?? "BF",
    }),
  });
  if (!res.ok) {
    throw new Error(`register failed (${res.status}): ${await res.text()}`);
  }
  const body = await res.json();
  return { cookie: extractCookie(res), userId: body.user.id };
}

export async function loginAs(
  phone: string,
  password: string
): Promise<Response> {
  return apiFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
}

/** Seeded by /api/seed at global setup time — see seed.ts. */
export const DEMO_ADMIN = { phone: "+22670000000", password: "retruv2026" };

export async function loginAsAdmin(): Promise<TestSession> {
  const res = await loginAs(DEMO_ADMIN.phone, DEMO_ADMIN.password);
  if (!res.ok) {
    throw new Error(`admin login failed (${res.status}): ${await res.text()}`);
  }
  const body = await res.json();
  return { cookie: extractCookie(res), userId: body.user.id };
}

export function authedFetch(
  session: TestSession,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Cookie", session.cookie);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return apiFetch(path, { ...init, headers });
}

/** For requests that must be unauthenticated (public listings, anonymous checks). */
export function anonFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return apiFetch(path, init);
}

let categoryCache: Array<{
  id: string;
  slug: string;
  children: Array<{ id: string; slug: string }>;
}> | null = null;

/** Resolves a (parent, child) category slug pair to their live DB ids — the
 * test DB's category rows get fresh UUIDs every time drizzle-kit pushes the
 * schema, so tests must never hardcode a category id. */
export async function findCategory(
  parentSlug: string,
  childSlug?: string
): Promise<{ categoryId: string; subcategoryId: string | null }> {
  if (!categoryCache) {
    const res = await apiFetch("/api/categories");
    const body = await res.json();
    categoryCache = body.categories;
  }
  const parent = categoryCache!.find((c) => c.slug === parentSlug);
  if (!parent) throw new Error(`category slug not found: ${parentSlug}`);
  if (!childSlug) return { categoryId: parent.id, subcategoryId: null };
  const child = parent.children.find((c) => c.slug === childSlug);
  if (!child) throw new Error(`subcategory slug not found: ${childSlug}`);
  return { categoryId: parent.id, subcategoryId: child.id };
}
