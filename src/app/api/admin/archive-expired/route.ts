import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { archiveExpiredDeclarations } from "@/lib/archive";

/**
 * Triggers archival of expired declarations. Callable three ways:
 * - An admin/moderator session (used by the "Archiver maintenant" button, POST).
 * - A bearer secret in `CRON_SECRET` — Vercel's reserved env var name: when
 *   present, Vercel Cron (see vercel.json) automatically sends it as
 *   `Authorization: Bearer $CRON_SECRET` on its scheduled GET request, no
 *   extra wiring needed.
 * - A bearer secret in `RETRUV_CRON_SECRET`, for any OTHER external
 *   scheduler (OS crontab, pg_cron via pg_net, a different host's cron).
 */
function isAuthorizedCron(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;
  const secrets = [process.env.CRON_SECRET, process.env.RETRUV_CRON_SECRET];
  return secrets.some((s) => !!s && authHeader === `Bearer ${s}`);
}

export async function GET(req: Request) {
  try {
    if (!isAuthorizedCron(req)) {
      await requireAdmin();
    }
    const result = await archiveExpiredDeclarations();
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    if (!isAuthorizedCron(req)) {
      await requireAdmin();
    }
    const result = await archiveExpiredDeclarations();
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
