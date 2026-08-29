import { afterAll, describe, expect, it } from "vitest";
import { LOGIN_MAX_ATTEMPTS } from "@/lib/constants";
import { anonFetch, authedFetch, loginAs, randomPhone, registerUser } from "./helpers";
import { cleanupTestUsers } from "./cleanup";

afterAll(cleanupTestUsers);

describe("register + session", () => {
  it("registering sets a working session cookie", async () => {
    const session = await registerUser({ fullName: "Awa Kaboré" });
    const me = await authedFetch(session, "/api/auth/me");
    expect(me.status).toBe(200);
    const body = await me.json();
    expect(body.user.fullName).toBe("Awa Kaboré");
    expect(body.user.id).toBe(session.userId);
  });

  it("rejects a second registration on the same phone number", async () => {
    const phone = randomPhone();
    await registerUser({ phone });
    const res = await anonFetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Someone Else",
        phone,
        password: "AnotherPass123!",
        country: "BF",
      }),
    });
    expect(res.status).toBe(409);
  });

  it("/api/auth/me reports no user (not an HTTP error) without a session cookie", async () => {
    // This endpoint is polled for auth state — "not logged in" is a normal
    // 200 response with a null user, not a 401.
    const res = await anonFetch("/api/auth/me");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeNull();
  });
});

describe("login", () => {
  it("logs in with correct credentials", async () => {
    const phone = randomPhone();
    const password = "CorrectPass123!";
    await registerUser({ phone, password });
    const res = await loginAs(phone, password);
    expect(res.status).toBe(200);
  });

  it("rejects an incorrect password without revealing which field was wrong", async () => {
    const phone = randomPhone();
    await registerUser({ phone, password: "CorrectPass123!" });
    const res = await loginAs(phone, "WrongPassword!");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).not.toMatch(/password|phone/i);
  });

  it(
    `locks the account after ${LOGIN_MAX_ATTEMPTS} failed attempts (RETRUV_LANDMINES.md #3)`,
    async () => {
      const phone = randomPhone();
      const password = "CorrectPass123!";
      await registerUser({ phone, password });

      // The Nth attempt (matching LOGIN_MAX_ATTEMPTS) is the one that both
      // fails AND trips the lock, so it alone reports 429 instead of 401.
      for (let i = 1; i < LOGIN_MAX_ATTEMPTS; i++) {
        const res = await loginAs(phone, "WrongPassword!");
        expect(res.status).toBe(401);
      }
      const tippingPointRes = await loginAs(phone, "WrongPassword!");
      expect(tippingPointRes.status).toBe(429);

      // Even the *correct* password must now be rejected — that's the point
      // of a lockout, not just a failed-attempt counter.
      const lockedRes = await loginAs(phone, password);
      expect(lockedRes.status).toBe(429);
    }
  );
});

describe("logout", () => {
  it("destroys the session so subsequent requests are unauthenticated", async () => {
    const session = await registerUser();
    const before = await authedFetch(session, "/api/auth/me");
    expect(before.status).toBe(200);

    const logoutRes = await authedFetch(session, "/api/auth/logout", {
      method: "POST",
    });
    expect(logoutRes.status).toBe(200);

    const after = await authedFetch(session, "/api/auth/me");
    expect((await after.json()).user).toBeNull();
  });
});
