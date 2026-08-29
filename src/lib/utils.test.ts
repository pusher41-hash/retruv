import { describe, expect, it } from "vitest";
import {
  approximateLocation,
  daysBetween,
  extractKeywords,
  getMatchLevel,
  haversineKm,
  maskId,
  maskPhone,
  maskSensitiveText,
  slugify,
} from "./utils";

describe("extractKeywords", () => {
  it("lowercases, strips accents and drops stop words", () => {
    expect(extractKeywords("Le Passeport Bordeaux perdu à Bobo")).toEqual([
      "passeport",
      "bordeaux",
      "bobo",
    ]);
  });

  it("drops short tokens and caps at 30 keywords", () => {
    const words = Array.from({ length: 40 }, (_, i) => `motclef${i}`);
    const result = extractKeywords(words.join(" "));
    expect(result.length).toBe(30);
  });

  it("neutralizes HTML-looking input instead of preserving tags", () => {
    // RETRUV_REDTEAM.md landmine #7: keywords must never carry raw markup.
    const result = extractKeywords("<script>alert(1)</script>");
    expect(result.join(" ")).not.toContain("<");
    expect(result.join(" ")).not.toContain(">");
  });
});

describe("maskSensitiveText", () => {
  it("masks long digit sequences (IDs, phone numbers)", () => {
    const result = maskSensitiveText("Mon numero est 70112233 merci");
    expect(result).not.toContain("70112233");
    expect(result).toContain("70****33");
  });

  it("masks email addresses", () => {
    const result = maskSensitiveText("Contactez aicha@example.com vite");
    expect(result).toBe("Contactez ***@***.*** vite");
  });

  it("leaves short numbers untouched", () => {
    expect(maskSensitiveText("J'ai 42 ans")).toBe("J'ai 42 ans");
  });
});

describe("maskId / maskPhone", () => {
  it("keeps only the edges of a long id visible", () => {
    expect(maskId("BF12345684", 2, 2)).toBe("BF******84");
  });

  it("fully masks an id too short to have a hidden middle", () => {
    expect(maskId("AB", 2, 2)).toBe("****");
  });

  it("masks the middle of a phone number", () => {
    expect(maskPhone("+22670111111")).toBe("+226****11");
  });
});

describe("getMatchLevel", () => {
  it.each([
    [10, "weak"],
    [40, "weak"],
    [50, "possible"],
    [70, "probable"],
    [85, "very_probable"],
    [100, "very_probable"],
  ] as const)("classifies score %i as %s", (score, level) => {
    expect(getMatchLevel(score)).toBe(level);
  });
});

describe("haversineKm", () => {
  it("returns ~0 for the same point", () => {
    expect(haversineKm(11.1771, -4.2979, 11.1771, -4.2979)).toBeCloseTo(0, 5);
  });

  it("returns the real-world distance between Bobo-Dioulasso and Ouagadougou", () => {
    // ~330km as the crow flies — sanity bound, not pinned to a fragile exact value.
    const km = haversineKm(11.1771, -4.2979, 12.3714, -1.5197);
    expect(km).toBeGreaterThan(300);
    expect(km).toBeLessThan(360);
  });
});

describe("daysBetween", () => {
  it("returns null when either date is missing", () => {
    expect(daysBetween(null, new Date())).toBeNull();
    expect(daysBetween(new Date(), null)).toBeNull();
  });

  it("is symmetric and counts whole days", () => {
    const a = new Date("2026-01-01T00:00:00Z");
    const b = new Date("2026-01-04T00:00:00Z");
    expect(daysBetween(a, b)).toBe(3);
    expect(daysBetween(b, a)).toBe(3);
  });
});

describe("slugify", () => {
  it("strips accents and punctuation into dash-separated lowercase", () => {
    expect(slugify("Carte d'électeur")).toBe("carte-d-electeur");
  });
});

describe("approximateLocation", () => {
  it("rounds coordinates to ~1km precision", () => {
    expect(approximateLocation(11.17712345, -4.29789999)).toEqual({
      lat: 11.18,
      lng: -4.3,
    });
  });

  it("returns null when a coordinate is missing", () => {
    expect(approximateLocation(null, -4.3)).toBeNull();
    expect(approximateLocation(11.18, undefined)).toBeNull();
  });
});
