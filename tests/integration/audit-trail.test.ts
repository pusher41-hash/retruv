import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { del, get, list } from "@vercel/blob";
import { authedFetch, loginAs, registerUser } from "./helpers";
import { cleanupTestUsers } from "./cleanup";

const TEST_PRIVATE_STORE_ID = process.env.BLOB_PRIVATE_STORE_ID;

const createdPathnames: string[] = [];

/**
 * Every test run (local or CI — both point at the same dedicated test
 * store, see .env.test) leaves behind every audit-trail/ entry that
 * `findAuditEntry` never matched, since only matched entries get pushed to
 * `createdPathnames` for afterAll's cleanup. Across a session of repeated
 * runs that accumulates fast: found 270 stray objects under audit-trail/ on
 * 2026-08-29 (well past list()'s 200-item page size), which is *why*
 * findAuditEntry's read started timing out — not a Blob consistency issue,
 * a scan of an ever-growing pile via one GET per candidate object. Wiping
 * the whole prefix before this file's tests run keeps every run's pile
 * small and bounded regardless of past runs' leftovers, independent of
 * whether any single run's own afterAll cleanup succeeds.
 */
async function wipeAuditTrailPrefix(): Promise<void> {
  let cursor: string | undefined;
  let hasMore = true;
  while (hasMore) {
    const page = await list({
      prefix: "audit-trail/",
      storeId: TEST_PRIVATE_STORE_ID,
      limit: 1000,
      cursor,
    });
    if (page.blobs.length > 0) {
      await del(
        page.blobs.map((b) => b.pathname),
        { storeId: TEST_PRIVATE_STORE_ID }
      );
    }
    cursor = page.cursor;
    hasMore = page.hasMore;
  }
}

beforeAll(wipeAuditTrailPrefix);

afterAll(async () => {
  await cleanupTestUsers();
  await Promise.allSettled(
    createdPathnames.map((pathname) => del(pathname, { storeId: TEST_PRIVATE_STORE_ID }))
  );
});

/**
 * logAudit() (security.ts) awaits appendAuditTrail() before returning, and
 * every route that calls it awaits logAudit() before responding — so the
 * Blob *write* has already been attempted by the time an HTTP call above
 * resolves. `list()` is a separate read path and object stores commonly
 * have a short read-after-write gap for listing (as opposed to a direct
 * `get()` on a known key), so a short retry with backoff stays here as a
 * cheap safety net even though the real cause of the CI failures this was
 * first added for turned out to be `wipeAuditTrailPrefix` above, not this.
 * list() only guarantees prefix filtering, not exact match, so callers
 * still filter by userId themselves since other tests' audit events land in
 * the same audit-trail/ prefix.
 */
async function findAuditEntry(
  userId: string,
  action: string
): Promise<Record<string, unknown> | undefined> {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { blobs } = await list({
      prefix: "audit-trail/",
      storeId: TEST_PRIVATE_STORE_ID,
      limit: 200,
    });
    for (const blob of blobs.slice().reverse()) {
      const result = await get(blob.pathname, {
        access: "private",
        storeId: TEST_PRIVATE_STORE_ID,
      });
      if (!result || result.statusCode !== 200) continue;
      const chunks: Uint8Array[] = [];
      const reader = result.stream.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const entry = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (entry.userId === userId && entry.action === action) {
        createdPathnames.push(blob.pathname);
        return entry;
      }
    }
    if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 400 * attempt));
  }
  return undefined;
}

describe("audit trail backup (regression test for the local-disk prod outage)", () => {
  it("writes an independent Blob copy when a user registers", async () => {
    const session = await registerUser();
    const entry = await findAuditEntry(session.userId, "user.register");
    expect(entry).toBeDefined();
    expect(entry?.entityType).toBe("user");
    expect(entry?.entityId).toBe(session.userId);
    expect(typeof entry?.loggedAt).toBe("string");
  });

  it("writes an independent Blob copy when a user logs in", async () => {
    const password = "TestPass123!";
    const session = await registerUser({ password });
    // registerUser also logs in via /api/auth/register itself, so log out
    // and back in explicitly to get an unambiguous "user.login" event tied
    // to a phone/password this test controls.
    const meRes = await authedFetch(session, "/api/auth/me");
    const phone = (await meRes.json()).user.phoneFull as string;

    const loginRes = await loginAs(phone, password);
    expect(loginRes.status).toBe(200);
    const loggedInUserId = (await loginRes.json()).user.id;

    const entry = await findAuditEntry(loggedInUserId, "user.login");
    expect(entry).toBeDefined();
  });
});
