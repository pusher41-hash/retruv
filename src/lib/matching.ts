import { and, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  foundItems,
  lostItems,
  matches,
  type FoundItem,
  type LostItem,
} from "@/db/schema";
import {
  MATCH_CROSS_CITY_LIMIT,
  MATCH_SAME_CITY_LIMIT,
  MATCH_THRESHOLD,
} from "./constants";
import { createNotifications } from "./security";
import {
  daysBetween,
  extractKeywords,
  getMatchLevel,
  haversineKm,
} from "./utils";

export type ScoreBreakdown = Record<string, number>;

export interface MatchResult {
  score: number;
  level: "weak" | "possible" | "probable" | "very_probable";
  breakdown: ScoreBreakdown;
}

function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function tokenSet(text: string): Set<string> {
  return new Set(extractKeywords(text));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function partialIdScore(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0;
  const na = normalize(a).replace(/[^a-z0-9]/g, "");
  const nb = normalize(b).replace(/[^a-z0-9]/g, "");
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  // Compare visible parts (e.g. last 4 digits)
  if (na.length >= 2 && nb.length >= 2) {
    if (na.slice(-2) === nb.slice(-2)) return 0.6;
    if (na.slice(0, 2) === nb.slice(0, 2)) return 0.4;
  }
  if (na.includes(nb) || nb.includes(na)) return 0.7;
  return 0;
}

function colorScore(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0;
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.7;
  return 0;
}

function brandModelScore(
  brandA?: string | null,
  modelA?: string | null,
  brandB?: string | null,
  modelB?: string | null
): number {
  let score = 0;
  let parts = 0;
  if (brandA || brandB) {
    parts++;
    const ba = normalize(brandA);
    const bb = normalize(brandB);
    if (ba && bb) {
      if (ba === bb) score += 1;
      else if (ba.includes(bb) || bb.includes(ba)) score += 0.6;
    }
  }
  if (modelA || modelB) {
    parts++;
    const ma = normalize(modelA);
    const mb = normalize(modelB);
    if (ma && mb) {
      if (ma === mb) score += 1;
      else if (ma.includes(mb) || mb.includes(ma)) score += 0.6;
    }
  }
  return parts === 0 ? 0 : score / parts;
}

function locationScore(
  lost: Pick<
    LostItem,
    "city" | "district" | "latitude" | "longitude" | "locationApprox"
  >,
  found: Pick<
    FoundItem,
    "city" | "district" | "latitude" | "longitude" | "locationApprox"
  >
): number {
  const cityA = normalize(lost.city);
  const cityB = normalize(found.city);
  if (!cityA || !cityB) return 0.2;
  if (cityA !== cityB) {
    // Different cities — still possible if nearby travel, low score
    return 0.05;
  }
  let score = 0.55;
  const distA = normalize(lost.district);
  const distB = normalize(found.district);
  if (distA && distB) {
    if (distA === distB) score = 0.9;
    else if (distA.includes(distB) || distB.includes(distA)) score = 0.75;
    else score = 0.5;
  }
  if (
    lost.latitude != null &&
    lost.longitude != null &&
    found.latitude != null &&
    found.longitude != null
  ) {
    const km = haversineKm(
      lost.latitude,
      lost.longitude,
      found.latitude,
      found.longitude
    );
    if (km <= 1) score = Math.max(score, 0.95);
    else if (km <= 3) score = Math.max(score, 0.85);
    else if (km <= 10) score = Math.max(score, 0.7);
    else if (km <= 30) score = Math.max(score, 0.5);
  }
  const locA = normalize(lost.locationApprox);
  const locB = normalize(found.locationApprox);
  if (locA && locB) {
    const sim = jaccard(tokenSet(locA), tokenSet(locB));
    score = Math.max(score, 0.4 + sim * 0.5);
  }
  return Math.min(score, 1);
}

function dateScore(
  lostDate: Date | null,
  foundDate: Date | null
): number {
  if (!lostDate || !foundDate) return 0.3;
  const days = daysBetween(lostDate, foundDate);
  if (days == null) return 0.3;
  // Found before lost is suspicious but allow small clock skew
  if (foundDate.getTime() < lostDate.getTime() - 12 * 60 * 60 * 1000) {
    return 0.1;
  }
  if (days <= 1) return 1;
  if (days <= 3) return 0.9;
  if (days <= 7) return 0.75;
  if (days <= 14) return 0.55;
  if (days <= 30) return 0.35;
  if (days <= 60) return 0.2;
  return 0.1;
}

function descriptionScore(
  lost: Pick<LostItem, "title" | "description" | "distinctiveFeatures" | "keywords">,
  found: Pick<FoundItem, "title" | "description" | "distinctiveFeatures" | "keywords">
): number {
  const lostText = [
    lost.title,
    lost.description,
    lost.distinctiveFeatures ?? "",
  ].join(" ");
  const foundText = [
    found.title,
    found.description,
    found.distinctiveFeatures ?? "",
  ].join(" ");

  const setA = tokenSet(lostText);
  const setB = tokenSet(foundText);
  (lost.keywords ?? []).forEach((k) => setA.add(normalize(k)));
  (found.keywords ?? []).forEach((k) => setB.add(normalize(k)));

  const jac = jaccard(setA, setB);

  // Bonus for distinctive feature overlap
  const featA = tokenSet(lost.distinctiveFeatures ?? "");
  const featB = tokenSet(found.distinctiveFeatures ?? "");
  const featSim = jaccard(featA, featB);

  return Math.min(1, jac * 0.7 + featSim * 0.3 + (featSim > 0.5 ? 0.15 : 0));
}

/**
 * Core matching algorithm — weighted multi-signal scoring.
 * Never treats score as absolute proof of ownership.
 */
export function computeMatchScore(
  lost: LostItem,
  found: FoundItem
): MatchResult {
  // Candidates are already filtered to matching categoryId upstream (see
  // fetchFoundCandidates/fetchLostCandidates), and a mismatch is scored —
  // not excluded — via breakdown.category below plus the hard multiplier
  // near the end of this function. There is no separate hard filter here.

  const weights = {
    category: 18,
    subcategory: 10,
    brandModel: 14,
    color: 10,
    description: 18,
    location: 14,
    date: 10,
    serial: 16,
  };

  const breakdown: ScoreBreakdown = {};

  // Category
  breakdown.category = lost.categoryId === found.categoryId ? 1 : 0;

  // Subcategory
  if (lost.subcategoryId && found.subcategoryId) {
    breakdown.subcategory =
      lost.subcategoryId === found.subcategoryId ? 1 : 0.15;
  } else {
    breakdown.subcategory = 0.4;
  }

  breakdown.brandModel = brandModelScore(
    lost.brand,
    lost.model,
    found.brand,
    found.model
  );
  breakdown.color = colorScore(lost.color, found.color);
  breakdown.description = descriptionScore(lost, found);
  breakdown.location = locationScore(lost, found);
  breakdown.date = dateScore(lost.lostDate, found.foundDate);

  const serialA = lost.serialPartial || lost.idPartialMasked;
  const serialB = found.serialPartial || found.idPartialMasked;
  breakdown.serial = partialIdScore(serialA, serialB);

  // If serial strongly matches, boost confidence
  let totalWeight = 0;
  let weighted = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const s = breakdown[key] ?? 0;
    // Skip zero-info signals with reduced weight impact
    if (
      s === 0 &&
      (key === "serial" || key === "brandModel" || key === "color")
    ) {
      // Don't fully count empty optional signals
      const reduced = weight * 0.35;
      totalWeight += reduced;
      weighted += 0;
      continue;
    }
    totalWeight += weight;
    weighted += s * weight;
  }

  let score = totalWeight > 0 ? (weighted / totalWeight) * 100 : 0;

  // Strong serial match boost
  if (breakdown.serial >= 0.9) score = Math.min(100, score + 12);
  else if (breakdown.serial >= 0.6) score = Math.min(100, score + 6);

  // Category mismatch hard penalty
  if (breakdown.category < 1) score *= 0.35;

  // Subcategory mismatch penalty: previously a mismatch only cost 8.5 of the
  // ~110 total weighted points (0.15 vs 1, weight 10) — a same-city,
  // similarly-worded declaration in a different subcategory of the same
  // category (e.g. Transport→Moto vs Transport→Voiture) could still reach
  // "probable" purely on the other signals. Only applies to a confirmed
  // mismatch (both sides had a subcategory and they differ) — not to the
  // neutral 0.4 case where one or both sides left it unset.
  if (breakdown.subcategory === 0.15) score *= 0.6;

  score = Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;

  return {
    score,
    level: getMatchLevel(score),
    breakdown,
  };
}

/**
 * City is a free-text field (see declare-form.tsx), not a controlled list —
 * "Rome", "ROME", "Roma" and "Rome " (trailing space) are all the same real
 * city to a human but wouldn't satisfy a strict `eq()`. A lost item and the
 * found item sitting right next to it in the same city could otherwise
 * never see each other purely because of capitalization/whitespace, which
 * matters more now that RETRUV explicitly spans multiple countries where a
 * city might be typed in a local vs. anglicized spelling.
 */
function sameCity(col: typeof foundItems.city | typeof lostItems.city, city: string) {
  return sql`lower(trim(${col})) = lower(trim(${city}))`;
}
function differentCity(col: typeof foundItems.city | typeof lostItems.city, city: string) {
  return sql`lower(trim(${col})) != lower(trim(${city}))`;
}

/**
 * Same-city candidates are fetched first (and exclusively, if there are
 * enough of them) so the row cap is spent on the dominant real-world case
 * instead of being filled by unrelated cities in arbitrary DB order.
 * Cross-city candidates still get a small budget — locationScore() gives a
 * low-but-nonzero score to a different city, so those matches must remain
 * reachable (e.g. an item lost while traveling).
 */
async function fetchFoundCandidates(lost: LostItem): Promise<FoundItem[]> {
  const candidatesSameCity = await db
    .select()
    .from(foundItems)
    .where(
      and(
        eq(foundItems.categoryId, lost.categoryId),
        eq(foundItems.status, "active"),
        inArray(foundItems.moderationStatus, ["auto_approved", "approved"]),
        ne(foundItems.userId, lost.userId),
        eq(foundItems.country, lost.country),
        sameCity(foundItems.city, lost.city)
      )
    )
    .orderBy(desc(foundItems.createdAt))
    .limit(MATCH_SAME_CITY_LIMIT);

  if (candidatesSameCity.length >= MATCH_SAME_CITY_LIMIT) return candidatesSameCity;

  const crossCity = await db
    .select()
    .from(foundItems)
    .where(
      and(
        eq(foundItems.categoryId, lost.categoryId),
        eq(foundItems.status, "active"),
        inArray(foundItems.moderationStatus, ["auto_approved", "approved"]),
        ne(foundItems.userId, lost.userId),
        eq(foundItems.country, lost.country),
        differentCity(foundItems.city, lost.city)
      )
    )
    .orderBy(desc(foundItems.createdAt))
    .limit(MATCH_CROSS_CITY_LIMIT);

  return [...candidatesSameCity, ...crossCity];
}

async function fetchLostCandidates(found: FoundItem): Promise<LostItem[]> {
  const candidatesSameCity = await db
    .select()
    .from(lostItems)
    .where(
      and(
        eq(lostItems.categoryId, found.categoryId),
        eq(lostItems.status, "active"),
        inArray(lostItems.moderationStatus, ["auto_approved", "approved"]),
        ne(lostItems.userId, found.userId),
        eq(lostItems.country, found.country),
        sameCity(lostItems.city, found.city)
      )
    )
    .orderBy(desc(lostItems.createdAt))
    .limit(MATCH_SAME_CITY_LIMIT);

  if (candidatesSameCity.length >= MATCH_SAME_CITY_LIMIT) return candidatesSameCity;

  const crossCity = await db
    .select()
    .from(lostItems)
    .where(
      and(
        eq(lostItems.categoryId, found.categoryId),
        eq(lostItems.status, "active"),
        inArray(lostItems.moderationStatus, ["auto_approved", "approved"]),
        ne(lostItems.userId, found.userId),
        eq(lostItems.country, found.country),
        differentCity(lostItems.city, found.city)
      )
    )
    .orderBy(desc(lostItems.createdAt))
    .limit(MATCH_CROSS_CITY_LIMIT);

  return [...candidatesSameCity, ...crossCity];
}

export async function runMatchingForLostItem(lostItemId: string) {
  const [lost] = await db
    .select()
    .from(lostItems)
    .where(eq(lostItems.id, lostItemId))
    .limit(1);
  if (!lost || lost.status !== "active") return [];
  if (lost.moderationStatus === "pending_review" || lost.moderationStatus === "rejected")
    return [];

  const candidates = await fetchFoundCandidates(lost);
  return persistMatches(lost, candidates);
}

export async function runMatchingForFoundItem(foundItemId: string) {
  const [found] = await db
    .select()
    .from(foundItems)
    .where(eq(foundItems.id, foundItemId))
    .limit(1);
  if (!found || found.status !== "active") return [];
  if (found.moderationStatus === "pending_review" || found.moderationStatus === "rejected")
    return [];

  const candidates = await fetchLostCandidates(found);
  return persistMatches(candidates, found);
}

/**
 * Persists (or refreshes) a match for one lost/found pair — insert/update,
 * notify, and bump both items to "matched" past the confidence threshold.
 * Shared by both matching directions (previously duplicated near-verbatim
 * between runMatchingForFoundItem and this function, a real risk already
 * demonstrated in this project: a fix applied to one copy and not the
 * other).
 */
async function persistOneMatch(lost: LostItem, found: FoundItem) {
  const result = computeMatchScore(lost, found);
  if (result.score < MATCH_THRESHOLD) return null;

  const existing = await db
    .select()
    .from(matches)
    .where(
      and(eq(matches.lostItemId, lost.id), eq(matches.foundItemId, found.id))
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(matches)
      .set({
        score: result.score,
        level: result.level,
        scoreBreakdown: result.breakdown,
        updatedAt: new Date(),
      })
      .where(eq(matches.id, existing[0].id));
    return { ...existing[0], score: result.score, level: result.level };
  }

  const [row] = await db
    .insert(matches)
    .values({
      lostItemId: lost.id,
      foundItemId: found.id,
      score: result.score,
      level: result.level,
      scoreBreakdown: result.breakdown,
      status: "notified",
      lostOwnerNotified: true,
      finderNotified: true,
    })
    .returning();

  await notifyMatch(row.id, lost.userId, found.userId, result.score, result.level);

  if (result.score >= 70) {
    // Don't let a lower-confidence match contest an item already claimed
    // by a stronger one — same-run and prior-run alike. Without this, a
    // found item could accumulate several concurrent "matched" flips (one
    // per qualifying candidate), each notifying a different user that
    // *their* item was found, with nothing indicating which is actually
    // the most likely real match.
    const [betterOnLost] = await db
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.lostItemId, lost.id),
          gt(matches.score, result.score),
          ne(matches.status, "rejected")
        )
      )
      .limit(1);
    if (!betterOnLost) {
      await db
        .update(lostItems)
        .set({ status: "matched", updatedAt: new Date() })
        .where(eq(lostItems.id, lost.id));
    }

    const [betterOnFound] = await db
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.foundItemId, found.id),
          gt(matches.score, result.score),
          ne(matches.status, "rejected")
        )
      )
      .limit(1);
    if (!betterOnFound) {
      await db
        .update(foundItems)
        .set({ status: "matched", updatedAt: new Date() })
        .where(eq(foundItems.id, found.id));
    }
  }

  return row;
}

/**
 * Runs persistOneMatch for every candidate on the other side of `lost`/
 * `found` (exactly one of which is an array). Each candidate is isolated in
 * its own try/catch: previously, one candidate throwing (a transient DB
 * error, an unexpected null) aborted the whole `for` loop via the unhandled
 * rejection propagating up — silently skipping every remaining candidate in
 * the same batch, not just the failing one. A real match further down the
 * list could be dropped with no trace.
 */
async function persistMatches(
  lostOrCandidates: LostItem | LostItem[],
  foundOrCandidates: FoundItem | FoundItem[]
) {
  const created = [];
  if (Array.isArray(lostOrCandidates)) {
    const found = foundOrCandidates as FoundItem;
    for (const lost of lostOrCandidates) {
      try {
        const row = await persistOneMatch(lost, found);
        if (row) created.push(row);
      } catch (err) {
        console.error(`Matching failed for lostItem ${lost.id} × foundItem ${found.id}:`, err);
      }
    }
  } else {
    const lost = lostOrCandidates;
    for (const found of foundOrCandidates as FoundItem[]) {
      try {
        const row = await persistOneMatch(lost, found);
        if (row) created.push(row);
      } catch (err) {
        console.error(`Matching failed for lostItem ${lost.id} × foundItem ${found.id}:`, err);
      }
    }
  }
  return created;
}

async function notifyMatch(
  matchId: string,
  lostUserId: string,
  foundUserId: string,
  score: number,
  level: string
) {
  const levelLabels: Record<string, string> = {
    weak: "faible",
    possible: "possible",
    probable: "probable",
    very_probable: "très probable",
  };
  const label = levelLabels[level] ?? level;

  await createNotifications([
    {
      userId: lostUserId,
      type: "match_found",
      title: "Correspondance détectée",
      body: `Bonne nouvelle ! RETRUV a détecté une correspondance ${label} (${Math.round(score)}%) avec votre déclaration de perte.`,
      link: `/matches/${matchId}`,
      metadata: { matchId, score, level },
    },
    {
      userId: foundUserId,
      type: "match_found",
      title: "Quelqu'un recherche cet objet",
      body: `RETRUV a trouvé une correspondance ${label} (${Math.round(score)}%) avec un objet que vous avez signalé comme trouvé.`,
      link: `/matches/${matchId}`,
      metadata: { matchId, score, level },
    },
  ]);
}

export async function recomputeAllMatches() {
  const activeLost = await db
    .select({ id: lostItems.id })
    .from(lostItems)
    .where(inArray(lostItems.status, ["active", "matched"]));

  let total = 0;
  for (const item of activeLost) {
    const r = await runMatchingForLostItem(item.id);
    total += r.length;
  }
  return total;
}

export function buildVerificationQuestions(lost: LostItem): {
  id: string;
  question: string;
  type: string;
  expectedHint?: string;
}[] {
  const questions = [
    {
      id: "lost_place",
      question: "Où avez-vous approximativement perdu cet objet ? (quartier ou lieu)",
      type: "text",
      expectedHint: lost.district || lost.locationApprox || lost.city,
    },
    {
      id: "lost_date",
      question: "Quelle est la date approximative de la perte ?",
      type: "date",
      expectedHint: lost.lostDate?.toISOString().slice(0, 10),
    },
    {
      id: "distinctive",
      question:
        "Décrivez une caractéristique particulière non visible publiquement (rayure, inscription, contenu…)",
      type: "text",
      expectedHint: lost.distinctiveFeatures || lost.privateNotes || undefined,
    },
  ];

  if (lost.serialPartial || lost.idPartialMasked) {
    questions.push({
      id: "serial_end",
      question:
        "Quels sont les 2 derniers caractères / chiffres de l'identifiant ou numéro de série ?",
      type: "text",
      expectedHint: (lost.serialPartial || lost.idPartialMasked || "").slice(-2),
    });
  }

  if (lost.brand || lost.model) {
    questions.push({
      id: "brand_model",
      question: "Quelle est la marque et/ou le modèle exact ?",
      type: "text",
      expectedHint: [lost.brand, lost.model].filter(Boolean).join(" "),
    });
  }

  if (lost.color) {
    questions.push({
      id: "color",
      question: "Quelle est la couleur principale de l'objet ?",
      type: "text",
      expectedHint: lost.color,
    });
  }

  // Limit to 5 questions
  return questions.slice(0, 5);
}

export function scoreVerificationAnswers(
  questions: {
    id: string;
    question: string;
    type: string;
    expectedHint?: string;
  }[],
  answers: Record<string, string>
): number {
  if (questions.length === 0) return 0;
  let total = 0;
  let weight = 0;

  for (const q of questions) {
    const answer = normalize(answers[q.id] ?? "");
    const expected = normalize(q.expectedHint ?? "");
    weight += 1;
    if (!answer) continue;
    if (!expected) {
      // No ground truth — partial credit for providing answer
      total += 0.4;
      continue;
    }
    if (answer === expected) {
      total += 1;
      continue;
    }
    // Fuzzy
    const sim = jaccard(tokenSet(answer), tokenSet(expected));
    if (sim >= 0.6) total += 0.85;
    else if (sim >= 0.3) total += 0.5;
    else if (expected.includes(answer) || answer.includes(expected)) total += 0.7;
    else if (q.id === "serial_end" && answer.slice(-2) === expected.slice(-2))
      total += 1;
    else total += 0.1;
  }

  return Math.round((total / weight) * 1000) / 10;
}
