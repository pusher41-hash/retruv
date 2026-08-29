import { describe, expect, it } from "vitest";
import { isPubliclyVisible } from "./moderation";

describe("isPubliclyVisible", () => {
  it.each(["auto_approved", "approved"])(
    "treats %s as publicly visible",
    (status) => {
      expect(isPubliclyVisible(status)).toBe(true);
    }
  );

  it.each(["pending_review", "rejected", "something_unknown"])(
    "keeps %s hidden from the public",
    (status) => {
      expect(isPubliclyVisible(status)).toBe(false);
    }
  );
});
