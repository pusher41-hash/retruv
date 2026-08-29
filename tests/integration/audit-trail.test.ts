import { afterAll, describe, expect, it } from "vitest";
import { del, get, list } from "@vercel/blob";
import { authedFetch, loginAs, registerUser } from "./helpers";
import { cleanupTestUsers } from "./cleanup";

const TEST_PRIVATE_STORE_ID = process.env.BLOB_PRIVATE_STORE_ID;

const createdPathnames: string[] = [];

afterAll(async () => {
  await cleanupTestUsers();
  await Promise.allSettled(
    createdPathnames.map((pathname) => del(pathname, { storeId: TEST_PRIVATE_STORE_ID }))
  );
});

/**
 * logAudit() (security.ts) awaits appendAuditTrail() before returning, and
 * every route that calls it awaits logAudit() before responding — so by the
 * time an HTTP call above has resolved, the Blob write has already been
 * attempted. No polling/retry needed, but list() only guarantees prefix
 * filtering, not exact match, so callers still filter by userId themselves
 * since other tests' audit events land in the same audit-trail/ prefix.
 */
async function findAuditEntry(
  userId: string,
  action: string
): Promise<Record<string, unknown> | undefined> {
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
