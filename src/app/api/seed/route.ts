import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { seedDemoData } from "@/lib/seed";

/**
 * Sole entry point for bootstrapping demo/seed data — idempotent (see
 * seedDemoData), safe to call repeatedly. Previously this also ran
 * automatically and unauthenticated from the homepage, GET /api/categories,
 * and GET /api/points on every hit; that made every real visitor pay for an
 * extra DB round-trip forever after the first successful seed, for a check
 * that's only ever needed once per environment (a fresh DB, or after
 * CATEGORY_TREE gains a new entry). Call this endpoint once instead — after
 * first deploy, or after a code change that adds categories.
 *
 * This endpoint reveals that the documented demo accounts (well-known
 * phone/password) exist, so on a real deployment it's restricted to admins
 * rather than left open to anyone on the internet.
 */
export async function POST() {
  try {
    if (process.env.NODE_ENV === "production") {
      await requireAdmin();
    }
    const result = await seedDemoData();
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET() {
  try {
    if (process.env.NODE_ENV === "production") {
      await requireAdmin();
    }
    const result = await seedDemoData();
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
