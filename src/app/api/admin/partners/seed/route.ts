import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { partners } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { WORLD_PARTNERS } from "@/lib/world-partners";
import { logAudit } from "@/lib/security";

export const dynamic = "force-dynamic";

async function ensurePartnersTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "partners" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "title" text NOT NULL,
      "description" text NOT NULL,
      "icon" text NOT NULL DEFAULT 'Building2',
      "website" text,
      "logo_url" text,
      "city" text,
      "country" text DEFAULT 'IT',
      "is_active" boolean NOT NULL DEFAULT true,
      "sort_order" integer NOT NULL DEFAULT 0,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "partners_active_idx" ON "partners" ("is_active")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "partners_sort_idx" ON "partners" ("sort_order")`);
}

export async function POST() {
  try {
    const admin = await requireAdmin();
    await ensurePartnersTable();

    let inserted = 0;
    let skipped = 0;

    for (const p of WORLD_PARTNERS) {
      // Check if already exists by title
      const existing = await db.execute(sql`SELECT id FROM partners WHERE title = ${p.title} LIMIT 1`);
      const rows = (existing as unknown as { rows?: unknown[] })?.rows ?? [];
      // Fallback check via select if execute returns differently
      if (rows.length > 0) {
        skipped++;
        continue;
      }
      // Alternative safe check via drizzle select (more reliable)
      try {
        const check = await db.execute(sql`SELECT 1 as ok FROM partners WHERE title = ${p.title} LIMIT 1`);
        const checkRows = (check as unknown as { rows?: { ok?: number }[] })?.rows;
        if (checkRows && checkRows.length > 0) {
          skipped++;
          continue;
        }
      } catch {}

      await db.insert(partners).values({
        title: p.title,
        description: p.description,
        icon: p.icon,
        website: p.website,
        city: p.city,
        country: p.country,
        sortOrder: p.sortOrder,
        isActive: true,
      });
      inserted++;
    }

    await logAudit({
      userId: admin.id,
      action: "partner.seed_world",
      entityType: "partner",
      entityId: `${inserted} inserted`,
      metadata: { inserted, skipped, total: WORLD_PARTNERS.length },
    });

    const [countRow] = await db.execute(sql`SELECT count(*)::int as c FROM partners`) as unknown as [{ c: number }];
    // fallback if above cast fails
    let total = 0;
    try {
      const res: unknown = await db.execute(sql`SELECT count(*)::int as c FROM partners`);
      const r = (res as { rows?: { c?: number }[] })?.rows?.[0]?.c;
      total = r ?? inserted;
    } catch {
      total = inserted;
    }

    return jsonOk({ inserted, skipped, total, message: `${inserted} partenaires ajoutés, ${skipped} déjà existants — ${total} au total` });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET() {
  try {
    await requireAdmin();
    return jsonOk({ partners: WORLD_PARTNERS.length, preview: WORLD_PARTNERS.slice(0, 3) });
  } catch (err) {
    return handleApiError(err);
  }
}
