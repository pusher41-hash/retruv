import { destroySession, getSessionUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { logAudit } from "@/lib/security";

export async function POST() {
  try {
    const user = await getSessionUser();
    await destroySession();
    if (user) {
      await logAudit({
        userId: user.id,
        action: "user.logout",
        entityType: "user",
        entityId: user.id,
      });
    }
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
