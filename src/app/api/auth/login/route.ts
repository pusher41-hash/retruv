import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import {
  isLoginLocked,
  logAudit,
  registerFailedLogin,
  registerSuccessfulLogin,
} from "@/lib/security";

const schema = z.object({
  phone: z.string().min(8).max(20),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const phone = data.phone.replace(/\s/g, "");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (!user) {
      return jsonError("Identifiants incorrects", 401);
    }
    if (user.isBlocked) {
      return jsonError("Compte suspendu. Contactez le support.", 403);
    }
    if (isLoginLocked(user)) {
      const minutes = Math.ceil(
        (user.loginLockedUntil!.getTime() - Date.now()) / 60000
      );
      return jsonError(
        `Trop de tentatives échouées. Réessayez dans ${minutes} min.`,
        429
      );
    }

    const valid = await verifyPassword(data.password, user.passwordHash);
    if (!valid) {
      const result = await registerFailedLogin(user);
      if (result.locked) {
        const minutes = Math.ceil((result.retryAfterSeconds ?? 60) / 60);
        return jsonError(
          `Trop de tentatives échouées. Réessayez dans ${minutes} min.`,
          429
        );
      }
      return jsonError("Identifiants incorrects", 401);
    }

    await registerSuccessfulLogin(user.id);
    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    await createSession(user.id);
    await logAudit({
      userId: user.id,
      action: "user.login",
      entityType: "user",
      entityId: user.id,
    });

    return jsonOk({
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        city: user.city,
        reputationLevel: user.reputationLevel,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Données invalides");
    }
    return handleApiError(err);
  }
}
