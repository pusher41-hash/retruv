import crypto, { randomUUID } from "crypto";
import { customAlphabet } from "nanoid";
import sharp from "sharp";
import { and, eq, gte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  fraudFlags,
  foundItems,
  lostItems,
  notifications,
  ratings,
  reports,
  uploads,
  userBlocks,
  users,
  verifications,
} from "@/db/schema";
import { appendAuditTrail, forwardAuditWebhook } from "./audit-trail";
import { maskSensitiveText } from "./utils";
import {
  CONVERSATION_AUTO_CLOSE_DAYS,
  LOGIN_LOCK_MAX_MINUTES,
  LOGIN_MAX_ATTEMPTS,
  MAX_RATINGS_RECEIVED_PER_DAY,
  RATING_TRUST_WEIGHT,
  SENSITIVE_DOC_SLUGS as SENSITIVE,
} from "./constants";
import { putPublicUpload, readPrivateUpload } from "./storage";

export { SENSITIVE };

export function sanitizePublicDescription(
  text: string,
  isSensitive: boolean
): string {
  if (!isSensitive) return maskSensitiveText(text);
  let result = maskSensitiveText(text);
  // Extra masking for names that look like full identity lines
  result = result.replace(
    /\b(né(?:e)?\s+le|date de naissance|n°|numero|numéro)\b[^.]{0,40}/gi,
    "[information masquée]"
  );
  return result;
}

export function isSensitiveCategory(slug: string): boolean {
  return SENSITIVE.includes(slug);
}

export async function logAudit(params: {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const row = {
    userId: params.userId ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    metadata: params.metadata,
  };
  await db.insert(auditLogs).values(row);
  // Independent trails — see src/lib/audit-trail.ts. Best-effort: never let
  // either one fail or slow down the action being audited.
  await Promise.allSettled([
    appendAuditTrail(row),
    forwardAuditWebhook(row),
  ]);
}

export async function flagFraud(params: {
  userId: string;
  flagType: string;
  severity?: number;
  details?: string;
}) {
  await db.insert(fraudFlags).values({
    userId: params.userId,
    flagType: params.flagType,
    severity: params.severity ?? 1,
    details: params.details,
  });

  // Auto-limit on repeated severe flags
  const recent = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(fraudFlags)
    .where(
      and(
        eq(fraudFlags.userId, params.userId),
        eq(fraudFlags.isResolved, false),
        gte(fraudFlags.severity, 2)
      )
    );

  const count = recent[0]?.count ?? 0;
  if (count >= 5 || (params.severity ?? 1) >= 5) {
    await db
      .update(users)
      .set({
        isBlocked: true,
        blockReason: "Activité suspecte détectée automatiquement",
        updatedAt: new Date(),
      })
      .where(eq(users.id, params.userId));
  } else if (count >= 3) {
    await db
      .update(users)
      .set({
        failedVerifyAttempts: sql`${users.failedVerifyAttempts} + 2`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, params.userId));
  }
}

/** True while the account is under an active brute-force lockout. */
export function isLoginLocked(user: {
  loginLockedUntil: Date | null;
}): boolean {
  return !!user.loginLockedUntil && user.loginLockedUntil.getTime() > Date.now();
}

function loginLockMinutes(attempts: number): number {
  const extra = Math.max(0, attempts - LOGIN_MAX_ATTEMPTS);
  return Math.min(LOGIN_LOCK_MAX_MINUTES, 2 ** extra);
}

/**
 * Records a failed login attempt. Once `LOGIN_MAX_ATTEMPTS` is reached the
 * account is locked for a duration that doubles with each further failure
 * (capped at `LOGIN_LOCK_MAX_MINUTES`), blocking brute-force password guessing.
 */
export async function registerFailedLogin(user: {
  id: string;
  failedLoginAttempts: number;
}): Promise<{ locked: boolean; retryAfterSeconds?: number }> {
  const attempts = user.failedLoginAttempts + 1;
  const lockedUntil =
    attempts >= LOGIN_MAX_ATTEMPTS
      ? new Date(Date.now() + loginLockMinutes(attempts) * 60 * 1000)
      : null;

  await db
    .update(users)
    .set({
      failedLoginAttempts: attempts,
      loginLockedUntil: lockedUntil,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  if (lockedUntil) {
    await logAudit({
      userId: user.id,
      action: "user.login_locked",
      entityType: "user",
      entityId: user.id,
      metadata: { attempts },
    });
  }

  return {
    locked: !!lockedUntil,
    retryAfterSeconds: lockedUntil
      ? Math.ceil((lockedUntil.getTime() - Date.now()) / 1000)
      : undefined,
  };
}

/** Clears brute-force counters after a successful login. */
export async function registerSuccessfulLogin(userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      failedLoginAttempts: 0,
      loginLockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/** Caps photo uploads per user to bound disk usage / processing cost. */
export async function checkUploadRate(userId: string): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(uploads)
    .where(and(eq(uploads.userId, userId), gte(uploads.createdAt, since)));

  if ((row?.count ?? 0) >= 20) {
    return {
      ok: false,
      reason: "Trop de photos envoyées récemment. Réessayez plus tard.",
    };
  }
  return { ok: true };
}

/**
 * Caps how many ratings a single user can receive within 24h — bounds how
 * fast reputation can be pumped even by distinct (if coordinated) accounts.
 */
export async function checkRatingRate(toUserId: string): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ratings)
    .where(and(eq(ratings.toUserId, toUserId), gte(ratings.createdAt, since)));

  if ((row?.count ?? 0) >= MAX_RATINGS_RECEIVED_PER_DAY) {
    await flagFraud({
      userId: toUserId,
      flagType: "rating_velocity",
      severity: 2,
      details: `${row?.count} notations reçues en 24h`,
    });
    return {
      ok: false,
      reason: "Limite de notations quotidienne atteinte pour ce compte.",
    };
  }
  return { ok: true };
}

/** Weight of a rating on its recipient's reputation, based on the rater's own standing. */
export function ratingTrustWeight(
  raterLevel: keyof typeof RATING_TRUST_WEIGHT
): number {
  return RATING_TRUST_WEIGHT[raterLevel] ?? 1;
}

/**
 * Rejects an obvious duplicate: the same user submitting a declaration with
 * the same title and city within the last 15 seconds. The declare form only
 * disables its submit button client-side (`disabled={loading}`) — a fast
 * double-click before the first render, or a resubmit after a request that
 * timed out client-side but actually succeeded server-side, previously had
 * no server-side guard against creating two identical declarations.
 */
export async function checkDuplicateDeclaration(
  table: typeof lostItems | typeof foundItems,
  userId: string,
  title: string,
  city: string
): Promise<{ ok: boolean; reason?: string }> {
  const since = new Date(Date.now() - 15 * 1000);
  const [dup] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(table)
    .where(
      and(
        eq(table.userId, userId),
        eq(table.title, title),
        eq(table.city, city),
        gte(table.createdAt, since)
      )
    );
  if ((dup?.count ?? 0) > 0) {
    return {
      ok: false,
      reason: "Cette déclaration vient déjà d'être envoyée. Vérifiez vos déclarations avant de renvoyer.",
    };
  }
  return { ok: true };
}

async function countRecentDeclarations(userId: string): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [lostCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lostItems)
    .where(and(eq(lostItems.userId, userId), gte(lostItems.createdAt, since)));

  const [foundCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(foundItems)
    .where(
      and(eq(foundItems.userId, userId), gte(foundItems.createdAt, since))
    );

  return (lostCount?.count ?? 0) + (foundCount?.count ?? 0);
}

/**
 * Rate-limit style check for suspicious declaration spam. `count` is
 * returned so callers can also decide whether to require a CAPTCHA past a
 * lower threshold (see CAPTCHA_DECLARATION_THRESHOLD) without a second query.
 */
export async function checkDeclarationRate(userId: string): Promise<{
  ok: boolean;
  reason?: string;
  count: number;
}> {
  const total = await countRecentDeclarations(userId);
  if (total >= 10) {
    await flagFraud({
      userId,
      flagType: "mass_declarations",
      severity: 3,
      details: `${total} déclarations en 1h`,
    });
    return {
      ok: false,
      reason: "Trop de déclarations en peu de temps. Réessayez plus tard.",
      count: total,
    };
  }
  return { ok: true, count: total };
}

/**
 * Caps how many reports a single user can file per hour, and blocks a
 * repeat report from the same reporter against the same target within 24h.
 * Without this, `flagFraud`'s auto-block threshold (5 unresolved
 * severity>=2 flags, see below) can be triggered single-handedly: nothing
 * previously stopped one attacker from filing 5 "user" reports against the
 * same person in a few seconds and getting them auto-blocked.
 */
export async function checkReportRate(
  reporterId: string,
  targetType: (typeof reports.$inferSelect)["targetType"],
  targetId: string
): Promise<{ ok: boolean; reason?: string }> {
  const sinceHour = new Date(Date.now() - 60 * 60 * 1000);
  const [hourly] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reports)
    .where(and(eq(reports.reporterId, reporterId), gte(reports.createdAt, sinceHour)));
  if ((hourly?.count ?? 0) >= 5) {
    return {
      ok: false,
      reason: "Trop de signalements envoyés récemment. Réessayez plus tard.",
    };
  }

  const sinceDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [dup] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reports)
    .where(
      and(
        eq(reports.reporterId, reporterId),
        eq(reports.targetType, targetType),
        eq(reports.targetId, targetId),
        gte(reports.createdAt, sinceDay)
      )
    );
  if ((dup?.count ?? 0) > 0) {
    return {
      ok: false,
      reason: "Vous avez déjà signalé cet élément récemment.",
    };
  }

  return { ok: true };
}

export async function checkVerificationRate(userId: string): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return { ok: false, reason: "Utilisateur introuvable" };
  if (user.failedVerifyAttempts >= 8) {
    return {
      ok: false,
      reason:
        "Trop de tentatives de vérification échouées. Contactez le support.",
    };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [count] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(verifications)
    .where(
      and(
        eq(verifications.claimantId, userId),
        gte(verifications.createdAt, since)
      )
    );

  if ((count?.count ?? 0) >= 15) {
    await flagFraud({
      userId,
      flagType: "mass_verification",
      severity: 4,
      details: "Trop de tentatives de vérification en 24h",
    });
    return {
      ok: false,
      reason: "Limite de vérifications atteinte pour aujourd'hui.",
    };
  }
  return { ok: true };
}

// Excludes visually ambiguous characters (0/O, 1/I/L) for readability at handover.
const RESTITUTION_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const restitutionCodeId = customAlphabet(RESTITUTION_ALPHABET, 6);

/** One-time code presented at physical handover to prove authorization to collect. */
export function generateRestitutionCode(): string {
  return restitutionCodeId();
}

const TEMP_PASSWORD_ALPHABET =
  "23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
const tempPasswordId = customAlphabet(TEMP_PASSWORD_ALPHABET, 12);

/**
 * Admin-triggered password reset (see api/admin/users/[id]/reset-password) —
 * there is no SMS/email provider configured in this project (no Twilio/
 * Resend key in .env.example) for a genuine self-service "forgot password"
 * flow, so a temporary password an admin can hand to the user through a
 * trusted channel is the realistic option today. Returned in plaintext
 * exactly once by the route; never logged, never stored anywhere but the
 * (immediately bcrypt-hashed) users.password_hash column.
 */
export function generateTemporaryPassword(): string {
  return tempPasswordId();
}

export type PendingUpload = { id: string; privateFilename: string };

/**
 * Real server-side redaction pipeline. Reads each private original (never
 * publicly reachable) and writes a genuinely processed derivative under a
 * fresh random filename in the public uploads dir — the original filename
 * and, when blurred, the original pixels themselves are never exposed.
 * Replaces the old `?blur=sensitive` URL-flag placeholder.
 *
 * `blurPhotos` is deliberately a separate question from "is this category
 * sensitive": a lost passport photo should be blurred (protects the owner
 * from fraud), but a missing person's photo should not be — the whole point
 * of a public appeal is recognition, and blurring it would work against
 * the person it's meant to protect. Callers pass
 * `getCategoryFieldConfig(...).blurSensitivePhotos`, not the raw
 * `isSensitive` flag.
 */
export async function processSensitivePhotos(
  photos: PendingUpload[],
  blurPhotos: boolean
): Promise<{ publicUrls: string[]; blurredUrls: string[] }> {
  if (photos.length === 0) return { publicUrls: [], blurredUrls: [] };

  const publicUrls: string[] = [];
  const blurredUrls: string[] = [];

  for (const photo of photos) {
    const outFilename = `${randomUUID()}.jpg`;
    const original = await readPrivateUpload(photo.privateFilename);

    if (blurPhotos) {
      // Strong pixel-level Gaussian blur + downscale: real redaction, not a
      // client-removable query parameter. The unblurred original stays only
      // in the private store.
      const blurred = await sharp(original)
        .resize({ width: 900, withoutEnlargement: true })
        .blur(28)
        .jpeg({ quality: 60 })
        .toBuffer();
      blurredUrls.push(await putPublicUpload(outFilename, blurred));
    } else {
      const processed = await sharp(original).jpeg({ quality: 85 }).toBuffer();
      const url = await putPublicUpload(outFilename, processed);
      publicUrls.push(url);
      blurredUrls.push(url);
    }
  }

  return { publicUrls, blurredUrls };
}

/** True once a completed match's conversation has sat idle past the auto-close window. */
export function isConversationStale(match: {
  status: string;
  updatedAt: Date;
}): boolean {
  if (match.status !== "completed") return false;
  const staleSince =
    Date.now() - CONVERSATION_AUTO_CLOSE_DAYS * 24 * 60 * 60 * 1000;
  return match.updatedAt.getTime() < staleSince;
}

/** Per-direction block status between two users. */
export async function getBlockStatus(
  viewerId: string,
  otherId: string
): Promise<{ blockedByViewer: boolean; blockedByOther: boolean }> {
  const rows = await db
    .select({ blockerId: userBlocks.blockerId })
    .from(userBlocks)
    .where(
      or(
        and(eq(userBlocks.blockerId, viewerId), eq(userBlocks.blockedId, otherId)),
        and(eq(userBlocks.blockerId, otherId), eq(userBlocks.blockedId, viewerId))
      )
    );
  return {
    blockedByViewer: rows.some((r) => r.blockerId === viewerId),
    blockedByOther: rows.some((r) => r.blockerId === otherId),
  };
}

// Internal app routes only — no scheme, no host, no protocol-relative `//`.
// Every route notifications currently link to (`/matches/:id`,
// `/messages/:id`, `/lost/:id`, `/found/:id`, `/admin/moderation`) must be
// listed here explicitly; add a segment only when a real call site needs it.
const NOTIFICATION_LINK_PATTERN =
  /^\/(matches|messages|lost|found)\/[a-zA-Z0-9-]+$|^\/admin\/moderation$/;

export function isSafeNotificationLink(link: string): boolean {
  return NOTIFICATION_LINK_PATTERN.test(link);
}

type NotificationInput = Omit<
  typeof notifications.$inferInsert,
  "id" | "createdAt" | "isRead"
>;

/**
 * Only path a notification's `link` can ever reach the client through.
 * Rejects anything not matching the internal-route whitelist — closes the
 * phishing vector where a future bug (corrupted metadata, a new call site)
 * could otherwise smuggle an external or scheme-based URL into a notification.
 */
export async function createNotifications(
  items: NotificationInput[]
): Promise<void> {
  for (const item of items) {
    if (item.link && !isSafeNotificationLink(item.link)) {
      throw new Error(`Unsafe notification link rejected: ${item.link}`);
    }
  }
  if (items.length === 0) return;
  await db.insert(notifications).values(items);
}

export async function createNotification(item: NotificationInput): Promise<void> {
  return createNotifications([item]);
}

const ENC_ALGO = "aes-256-gcm";
const ENC_PREFIX = "v2"; // AES-256-GCM. Legacy payloads (no prefix) were plain base64.

function getEncryptionKey(): Buffer {
  const raw = process.env.RETRUV_ENC_KEY;
  if (!raw) {
    throw new Error(
      "RETRUV_ENC_KEY manquant. Générez une clé avec `openssl rand -base64 32` " +
        "et ajoutez-la aux variables d'environnement (jamais dans la DB)."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "RETRUV_ENC_KEY invalide : attendu une clé base64 de 32 octets (256 bits)."
    );
  }
  return key;
}

export function encryptPrivatePayload(data: Record<string, unknown>): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENC_ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(data), "utf8")),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    ENC_PREFIX,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptPrivatePayload(
  payload: string | null | undefined
): Record<string, unknown> | null {
  if (!payload) return null;
  try {
    if (payload.startsWith(`${ENC_PREFIX}:`)) {
      const [, ivB64, tagB64, dataB64] = payload.split(":");
      const key = getEncryptionKey();
      const decipher = crypto.createDecipheriv(
        ENC_ALGO,
        key,
        Buffer.from(ivB64, "base64")
      );
      decipher.setAuthTag(Buffer.from(tagB64, "base64"));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(dataB64, "base64")),
        decipher.final(),
      ]);
      return JSON.parse(plaintext.toString("utf8"));
    }
    // Legacy payloads written before the AES-GCM migration (plain base64 JSON).
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/** Encrypts a full document/ID number for `lostItems.idFullEncrypted` / `foundItems.idFullEncrypted`. */
export function encryptIdNumber(idFull: string): string {
  return encryptPrivatePayload({ idFull });
}

/** Decrypts a stored full ID number — server-side use only (matching engine), never returned to a client. */
export function decryptIdNumber(encrypted: string | null | undefined): string | null {
  const payload = decryptPrivatePayload(encrypted);
  const value = payload?.idFull;
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Derives the publicly-visible masked form from a full number the user
 * typed once — replaces the old design where the user had to type the mask
 * themselves (e.g. "BF****84"), which was error-prone and inconsistent.
 * Keeps the first and last 2 characters; a short value (<=4 chars) is
 * masked entirely rather than revealing everything.
 */
export function maskIdNumber(idFull: string): string {
  const clean = idFull.trim();
  if (clean.length <= 4) return "*".repeat(clean.length);
  return `${clean.slice(0, 2)}****${clean.slice(-2)}`;
}
