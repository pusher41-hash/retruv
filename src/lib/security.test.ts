import crypto from "crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  decryptPrivatePayload,
  encryptPrivatePayload,
  generateRestitutionCode,
  isConversationStale,
  isLoginLocked,
  isSafeNotificationLink,
  isSensitiveCategory,
  ratingTrustWeight,
} from "./security";

beforeAll(() => {
  // encryptPrivatePayload/decryptPrivatePayload read this lazily per call,
  // so setting it here (rather than at import time) is enough.
  process.env.RETRUV_ENC_KEY = crypto.randomBytes(32).toString("base64");
});

describe("encryptPrivatePayload / decryptPrivatePayload", () => {
  it("round-trips arbitrary JSON through AES-256-GCM", () => {
    const data = { fullName: "Aïcha Ouédraogo", note: "coin plié, tampon 2019" };
    const ciphertext = encryptPrivatePayload(data);
    expect(ciphertext.startsWith("v2:")).toBe(true);
    expect(ciphertext).not.toContain("Aïcha");
    expect(decryptPrivatePayload(ciphertext)).toEqual(data);
  });

  it("still decrypts legacy plain-base64 payloads (RETRUV_LANDMINES.md #1 migration)", () => {
    const legacy = Buffer.from(JSON.stringify({ old: true }), "utf8").toString(
      "base64"
    );
    expect(decryptPrivatePayload(legacy)).toEqual({ old: true });
  });

  it("returns null for null/undefined/corrupted input instead of throwing", () => {
    expect(decryptPrivatePayload(null)).toBeNull();
    expect(decryptPrivatePayload(undefined)).toBeNull();
    expect(decryptPrivatePayload("not-valid-at-all")).toBeNull();
  });

  it("fails closed when the auth tag has been tampered with", () => {
    const ciphertext = encryptPrivatePayload({ secret: "value" });
    const [prefix, iv, tag, body] = ciphertext.split(":");
    const tamperedTag = Buffer.from(tag, "base64");
    tamperedTag[0] ^= 0xff;
    const tampered = [prefix, iv, tamperedTag.toString("base64"), body].join(
      ":"
    );
    expect(decryptPrivatePayload(tampered)).toBeNull();
  });
});

describe("isSafeNotificationLink", () => {
  it.each([
    "/matches/abc-123",
    "/messages/abc-123",
    "/lost/abc-123",
    "/found/abc-123",
    "/admin/moderation",
  ])("allows %s", (link) => {
    expect(isSafeNotificationLink(link)).toBe(true);
  });

  it.each([
    "https://evil.example.com",
    "//evil.example.com",
    "/matches/../../etc/passwd",
    "/admin",
    "/admin/moderation/extra",
    "javascript:alert(1)",
    "/messages/",
  ])("rejects %s", (link) => {
    expect(isSafeNotificationLink(link)).toBe(false);
  });
});

describe("isSensitiveCategory", () => {
  it("flags documents and vehicle-paper slugs", () => {
    expect(isSensitiveCategory("passeport")).toBe(true);
    expect(isSensitiveCategory("cni")).toBe(true);
  });

  it("does not flag ordinary object categories", () => {
    expect(isSensitiveCategory("telephone")).toBe(false);
  });
});

describe("isLoginLocked", () => {
  it("is locked while loginLockedUntil is in the future", () => {
    expect(
      isLoginLocked({ loginLockedUntil: new Date(Date.now() + 60_000) })
    ).toBe(true);
  });

  it("is not locked once the lock has expired or was never set", () => {
    expect(
      isLoginLocked({ loginLockedUntil: new Date(Date.now() - 60_000) })
    ).toBe(false);
    expect(isLoginLocked({ loginLockedUntil: null })).toBe(false);
  });
});

describe("ratingTrustWeight", () => {
  it("weighs a brand-new account below an established one (RETRUV_REDTEAM Scénario B)", () => {
    expect(ratingTrustWeight("new")).toBeLessThan(ratingTrustWeight("partner"));
  });
});

describe("generateRestitutionCode", () => {
  it("generates a 6-character code from the unambiguous alphabet only", () => {
    const code = generateRestitutionCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    // Visually ambiguous characters must never appear at physical handover.
    expect(code).not.toMatch(/[01OIL]/);
  });
});

describe("isConversationStale", () => {
  it("is never stale unless the match is completed", () => {
    expect(
      isConversationStale({
        status: "verified",
        updatedAt: new Date("2000-01-01"),
      })
    ).toBe(false);
  });

  it("goes stale after the auto-close window on a completed match", () => {
    const longAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const justNow = new Date();
    expect(isConversationStale({ status: "completed", updatedAt: longAgo })).toBe(
      true
    );
    expect(
      isConversationStale({ status: "completed", updatedAt: justNow })
    ).toBe(false);
  });
});
