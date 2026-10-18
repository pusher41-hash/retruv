import { sql } from "drizzle-orm";
import { db } from "@/db";
import { recoveryPoints } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { WORLD_RECOVERY_POINTS } from "@/lib/world-recovery-points";
import { logAudit } from "@/lib/security";

export const dynamic = "force-dynamic";

async function ensureRecoveryPointsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "recovery_points" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" text NOT NULL,
      "type" text NOT NULL,
      "address" text NOT NULL,
      "city" text NOT NULL,
      "country" text DEFAULT 'IT' NOT NULL,
      "latitude" real,
      "longitude" real,
      "phone" text,
      "email" text,
      "hours" text,
      "manager_name" text,
      "manager_user_id" uuid,
      "is_active" boolean DEFAULT true NOT NULL,
      "items_deposited" integer DEFAULT 0 NOT NULL,
      "items_recovered" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "recovery_points_city_idx" ON "recovery_points" ("city")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "recovery_points_active_idx" ON "recovery_points" ("is_active")`);
}

export async function POST() {
  try {
    const admin = await requireAdmin();
    await ensureRecoveryPointsTable();

    let inserted = 0;
    let skipped = 0;

    for (const p of WORLD_RECOVERY_POINTS) {
      const check = await db.execute(sql`SELECT 1 as ok FROM recovery_points WHERE name = ${p.name} LIMIT 1`);
      const rows = (check as unknown as { rows?: unknown[] })?.rows ?? [];
      if (rows.length > 0) {
        skipped++;
        continue;
      }

      await db.insert(recoveryPoints).values({
        name: p.name,
        type: p.type,
        address: p.address,
        city: p.city,
        country: p.country,
        latitude: p.latitude,
        longitude: p.longitude,
        phone: p.phone,
        email: p.email,
        hours: p.hours,
        managerName: p.managerName,
        isActive: true,
        itemsDeposited: Math.floor(Math.random() * 20) + 5,
        itemsRecovered: Math.floor(Math.random() * 15) + 2,
      });
      inserted++;
    }

    await logAudit({
      userId: admin.id,
      action: "recovery_point.seed_world",
      entityType: "recovery",
      entityId: `${inserted} inserted`,
      metadata: { inserted, skipped, total: WORLD_RECOVERY_POINTS.length },
    });

    let total = 0;
    try {
      const res: unknown = await db.execute(sql`SELECT count(*)::int as c FROM recovery_points`);
      const r = (res as { rows?: { c?: number }[] })?.rows?.[0]?.c;
      total = r ?? inserted + skipped;
    } catch {
      total = inserted + skipped;
    }

    return jsonOk({
      inserted,
      skipped,
      total,
      message: `${inserted} points ajoutés, ${skipped} déjà existants — ${total} au total`,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET() {
  try {
    await requireAdmin();
    return jsonOk({ points: WORLD_RECOVERY_POINTS.length, preview: WORLD_RECOVERY_POINTS.slice(0, 3) });
  } catch (err) {
    return handleApiError(err);
  }
}
