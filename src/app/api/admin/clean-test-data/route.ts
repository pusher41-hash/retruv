import { ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { foundItems, lostItems } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { logAudit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const admin = await requireAdmin();
    const testPattern = "%test%";
    const webhookPattern = "%webhook%";
    const [lostHidden, foundHidden] = await Promise.all([
      db.update(lostItems)
        .set({ moderationStatus: "rejected", moderationNotes: "Masqué automatiquement : déclaration de test", moderatedBy: admin.id, moderatedAt: new Date() })
        .where(or(ilike(lostItems.title, testPattern), ilike(lostItems.title, webhookPattern), ilike(lostItems.description, testPattern), ilike(lostItems.description, webhookPattern)))
        .returning({ id: lostItems.id }),
      db.update(foundItems)
        .set({ moderationStatus: "rejected", moderationNotes: "Masqué automatiquement : déclaration de test", moderatedBy: admin.id, moderatedAt: new Date() })
        .where(or(ilike(foundItems.title, testPattern), ilike(foundItems.title, webhookPattern), ilike(foundItems.description, testPattern), ilike(foundItems.description, webhookPattern)))
        .returning({ id: foundItems.id }),
    ]);
    await logAudit({
      userId: admin.id,
      action: "moderation.clean_test_data",
      entityType: "lost_item",
      entityId: `lost:${lostHidden.length} found:${foundHidden.length}`,
    });
    return jsonOk({
      lostHidden: lostHidden.length,
      foundHidden: foundHidden.length,
      message: `${lostHidden.length} déclarations perdues et ${foundHidden.length} trouvées de test masquées — elles n'apparaissent plus publiquement`,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET() {
  try {
    await requireAdmin();
    const lostTest = await db.select({ id: lostItems.id, title: lostItems.title, city: lostItems.city, status: lostItems.moderationStatus }).from(lostItems).where(or(ilike(lostItems.title, "%test%"), ilike(lostItems.title, "%webhook%")));
    const foundTest = await db.select({ id: foundItems.id, title: foundItems.title, city: foundItems.city, status: foundItems.moderationStatus }).from(foundItems).where(or(ilike(foundItems.title, "%test%"), ilike(foundItems.title, "%webhook%")));
    return jsonOk({ lostTest, foundTest });
  } catch (err) {
    return handleApiError(err);
  }
}
