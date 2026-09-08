import crypto from "crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { computeMatchScore } from "./matching";
import { encryptIdNumber } from "./security";
import type { FoundItem, LostItem } from "@/db/schema";

beforeAll(() => {
  // encryptIdNumber/decryptIdNumber read this lazily per call — see security.test.ts.
  process.env.RETRUV_ENC_KEY = crypto.randomBytes(32).toString("base64");
});

const CATEGORY_PASSEPORT = "11111111-1111-1111-1111-111111111111";
const CATEGORY_TELEPHONE = "22222222-2222-2222-2222-222222222222";

function makeLostItem(overrides: Partial<LostItem> = {}): LostItem {
  return {
    id: "lost-1",
    userId: "user-1",
    categoryId: CATEGORY_PASSEPORT,
    subcategoryId: null,
    title: "Passeport perdu",
    description: "Passeport bordeaux perdu au marché central",
    brand: null,
    model: null,
    color: "Bordeaux",
    distinctiveFeatures: "coin plié",
    serialPartial: null,
    idPartialMasked: "BF****84",
    idFullEncrypted: null,
    details: null,
    keywords: ["passeport", "bordeaux", "marche", "central"],
    lostDate: new Date("2026-08-20T10:00:00Z"),
    lostTimeApprox: null,
    city: "Bobo-Dioulasso",
    district: "Centre-ville",
    locationApprox: "Marché central",
    latitude: 11.1771,
    longitude: -4.2979,
    photoUrls: [],
    blurredPhotoUrls: [],
    rewardAmount: null,
    rewardCurrency: "XOF",
    status: "active",
    isSensitive: true,
    privateNotes: null,
    verificationHints: [],
    moderationStatus: "auto_approved",
    moderationNotes: null,
    moderatedBy: null,
    moderatedAt: null,
    expiresAt: null,
    country: "BF",
    viewCount: 0,
    createdAt: new Date("2026-08-20T10:00:00Z"),
    updatedAt: new Date("2026-08-20T10:00:00Z"),
    ...overrides,
  };
}

function makeFoundItem(overrides: Partial<FoundItem> = {}): FoundItem {
  return {
    id: "found-1",
    userId: "user-2",
    categoryId: CATEGORY_PASSEPORT,
    subcategoryId: null,
    title: "Passeport trouvé",
    description: "Passeport bordeaux trouvé au marché central",
    brand: null,
    model: null,
    color: "Bordeaux",
    distinctiveFeatures: "coin plié",
    serialPartial: null,
    idPartialMasked: "BF****84",
    idFullEncrypted: null,
    details: null,
    keywords: ["passeport", "bordeaux", "marche", "central"],
    foundDate: new Date("2026-08-20T14:00:00Z"),
    foundTimeApprox: null,
    city: "Bobo-Dioulasso",
    district: "Centre-ville",
    locationApprox: "Marché central",
    latitude: 11.1771,
    longitude: -4.2979,
    photoUrls: [],
    blurredPhotoUrls: [],
    condition: null,
    status: "active",
    isSensitive: true,
    privateDataEncrypted: null,
    recoveryPointId: null,
    moderationStatus: "auto_approved",
    moderationNotes: null,
    moderatedBy: null,
    moderatedAt: null,
    country: "BF",
    viewCount: 0,
    expiresAt: null,
    createdAt: new Date("2026-08-20T14:00:00Z"),
    updatedAt: new Date("2026-08-20T14:00:00Z"),
    ...overrides,
  };
}

describe("computeMatchScore", () => {
  it("scores a near-identical same-day, same-place declaration as very_probable", () => {
    const result = computeMatchScore(makeLostItem(), makeFoundItem());
    expect(result.level).toBe("very_probable");
    expect(result.score).toBeGreaterThanOrEqual(85);
  });

  it("heavily penalizes a category mismatch even with matching text", () => {
    const result = computeMatchScore(
      makeLostItem({ categoryId: CATEGORY_TELEPHONE }),
      makeFoundItem({ categoryId: CATEGORY_PASSEPORT })
    );
    expect(result.breakdown.category).toBe(0);
    // *0.35 hard penalty means this can never reach "probable" even if
    // every other signal is a perfect match.
    expect(result.score).toBeLessThan(70);
  });

  it("scores unrelated declarations (different city, no shared text) as weak", () => {
    const result = computeMatchScore(
      makeLostItem({
        city: "Ouagadougou",
        district: null,
        locationApprox: null,
        latitude: null,
        longitude: null,
        color: "Noir",
        distinctiveFeatures: null,
        keywords: ["velo", "rouge"],
        description: "Vélo rouge disparu",
        title: "Vélo perdu",
        idPartialMasked: null,
      }),
      makeFoundItem()
    );
    expect(result.level).toBe("weak");
  });

  it("boosts confidence when a strong partial serial/ID match exists", () => {
    const withoutSerial = computeMatchScore(
      makeLostItem({ idPartialMasked: null }),
      makeFoundItem({ idPartialMasked: null })
    );
    const withSerial = computeMatchScore(
      makeLostItem({ idPartialMasked: "BF998877" }),
      makeFoundItem({ idPartialMasked: "BF998877" })
    );
    expect(withSerial.score).toBeGreaterThan(withoutSerial.score);
  });

  it("boosts serial score to max when full encrypted ID numbers match", () => {
    const sameId = encryptIdNumber("AB1234567IT");
    const withoutFullId = computeMatchScore(
      makeLostItem({ idPartialMasked: null }),
      makeFoundItem({ idPartialMasked: null })
    );
    const withMatchingFullId = computeMatchScore(
      makeLostItem({ idPartialMasked: null, idFullEncrypted: sameId }),
      makeFoundItem({ idPartialMasked: null, idFullEncrypted: sameId })
    );
    expect(withMatchingFullId.breakdown.serial).toBe(1);
    expect(withMatchingFullId.score).toBeGreaterThan(withoutFullId.score);
  });

  it("does not boost when full encrypted ID numbers differ", () => {
    const result = computeMatchScore(
      makeLostItem({ idPartialMasked: null, idFullEncrypted: encryptIdNumber("AB1234567IT") }),
      makeFoundItem({ idPartialMasked: null, idFullEncrypted: encryptIdNumber("ZZ0000000FR") })
    );
    expect(result.breakdown.serial).toBe(0);
  });

  it("treats an implausible found-before-lost date as a red flag, not a bonus", () => {
    const plausible = computeMatchScore(makeLostItem(), makeFoundItem());
    const implausible = computeMatchScore(
      makeLostItem({ lostDate: new Date("2026-08-20T10:00:00Z") }),
      makeFoundItem({ foundDate: new Date("2026-08-10T10:00:00Z") })
    );
    expect(implausible.breakdown.date).toBeLessThan(plausible.breakdown.date);
  });

  it("never returns a score outside [0, 100]", () => {
    const result = computeMatchScore(makeLostItem(), makeFoundItem());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
