import { cookies } from "next/headers";
import { eq, and, gt, desc, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { MAX_SESSIONS_PER_USER, SESSION_COOKIE, SESSION_DAYS } from "./constants";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const token = nanoid(48);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });

  await enforceSessionLimit(userId);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

/**
 * Keeps at most `MAX_SESSIONS_PER_USER` active sessions: a stolen cookie
 * can no longer be used to accumulate unlimited valid sessions, since the
 * oldest ones get evicted as new ones are created.
 */
async function enforceSessionLimit(userId: string): Promise<void> {
  const active = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
    .orderBy(desc(sessions.createdAt));

  if (active.length > MAX_SESSIONS_PER_USER) {
    const staleIds = active.slice(MAX_SESSIONS_PER_USER).map((s) => s.id);
    await db.delete(sessions).where(inArray(sessions.id, staleIds));
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
    cookieStore.delete(SESSION_COOKIE);
  }
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const result = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!result[0]) return null;
  if (result[0].user.isBlocked) return null;
  return result[0].user;
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "moderator") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export function publicUser(user: User) {
  return {
    id: user.id,
    fullName: user.fullName,
    phone: user.phone.slice(0, 4) + "****" + user.phone.slice(-2),
    city: user.city,
    country: user.country,
    role: user.role,
    reputationScore: user.reputationScore,
    reputationLevel: user.reputationLevel,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
}
