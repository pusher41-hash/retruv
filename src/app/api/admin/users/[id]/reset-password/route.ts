import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import { generateTemporaryPassword, logAudit } from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

/**
 * Admin-only: generates a temporary password for a locked-out or
 * password-less user and returns it in plaintext exactly once — RETRUV has
 * no SMS/email provider configured for a genuine self-service reset, so an
 * admin relaying this through a trusted channel is the realistic path today.
 * Also clears any login lockout, since a stuck admin/user is the usual
 * reason this gets used.
 */
export async function POST(_req: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) return jsonError("Utilisateur introuvable", 404);

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    await db
      .update(users)
      .set({
        passwordHash,
        failedLoginAttempts: 0,
        loginLockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    await logAudit({
      userId: admin.id,
      action: "user.reset_password",
      entityType: "user",
      entityId: id,
    });

    return jsonOk({ temporaryPassword });
  } catch (err) {
    return handleApiError(err);
  }
}
