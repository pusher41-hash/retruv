import { asc, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { partners } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { logAudit } from "@/lib/security";

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
  // Seed if empty
  const existing: unknown = await db.execute(sql`SELECT count(*)::int as c FROM "partners"`);
  const rows = (existing as { rows?: { c?: number }[] })?.rows;
  const count = rows?.[0]?.c ?? 0;
  if (count === 0) {
    await db.execute(sql`
      INSERT INTO "partners" ("title", "description", "icon", "sort_order") VALUES
        ('Gares & Transport', 'Gares, aéroports, réseaux de bus, partout dans le monde. Dépôt d''objets, récupération, visibilité. Le point devient un service public utile.', 'Train', 0),
        ('Universités & Campus', 'Établissements d''enseignement, quel que soit le pays. Déclarations de documents étudiants, récupération au secrétariat, confiance institutionnelle.', 'GraduationCap', 1),
        ('Entreprises & Commerces', 'Hôtels, centres commerciaux, entreprises. Intégration du moteur de matching via API. Réputation et service client.', 'Building2', 2)
    `);
  }
}

export const dynamic = "force-dynamic";

const ALLOWED_ICONS = [
  "Train",
  "GraduationCap",
  "Building2",
  "Building",
  "Hotel",
  "Store",
  "Landmark",
  "Plane",
  "Bus",
  "ShieldCheck",
  "Handshake",
  "Briefcase",
  "MapPin",
  "University",
  "Warehouse",
  "ShoppingBag",
] as const;

const createSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(10).max(600),
  icon: z.enum(ALLOWED_ICONS).default("Building2"),
  website: z.string().max(300).optional().nullable().refine(
    (v) => !v || v.startsWith("http://") || v.startsWith("https://"),
    "L'URL doit commencer par http:// ou https://"
  ),
  logoUrl: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().length(2).optional().nullable(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    try {
      const rows = await db
        .select()
        .from(partners)
        .orderBy(asc(partners.sortOrder), desc(partners.createdAt));
      return jsonOk({ partners: rows });
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string; cause?: { code?: string } };
      const msg = err?.message ?? "";
      const code = err?.code ?? err?.cause?.code;
      const isMissing = code === "42P01" || msg.includes("does not exist") || msg.includes("relation") || msg.includes("Failed query") || msg.includes("partners");
      if (isMissing) {
        try {
          await ensurePartnersTable();
          const rows = await db.select().from(partners).orderBy(asc(partners.sortOrder), desc(partners.createdAt));
          return jsonOk({ partners: rows });
        } catch {
          return jsonOk({ partners: [], fallback: true, warning: "Table partners manquante — exécutez la migration 002-partners.sql" });
        }
      }
      throw e;
    }
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const data = createSchema.parse(await req.json());

    try {
      const [row] = await db
        .insert(partners)
        .values({
          title: data.title.trim(),
          description: data.description.trim(),
          icon: data.icon,
          website: data.website || null,
          logoUrl: data.logoUrl || null,
          city: data.city || null,
          country: data.country || null,
          sortOrder: data.sortOrder ?? 0,
          isActive: data.isActive ?? true,
        })
        .returning();

      await logAudit({
        userId: admin.id,
        action: "partner.create",
        entityType: "partner",
        entityId: row.id,
      });

      return jsonOk({ partner: row }, 201);
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string; cause?: { code?: string } };
      const msg = err?.message ?? "";
      const code = err?.code ?? err?.cause?.code;
      const isMissing = code === "42P01" || msg.includes("does not exist") || msg.includes("relation") || msg.includes("Failed query") || msg.includes("partners");
      if (isMissing) {
        await ensurePartnersTable();
        const [row] = await db
          .insert(partners)
          .values({
            title: data.title.trim(),
            description: data.description.trim(),
            icon: data.icon,
            website: data.website || null,
            logoUrl: data.logoUrl || null,
            city: data.city || null,
            country: data.country || null,
            sortOrder: data.sortOrder ?? 0,
            isActive: data.isActive ?? true,
          })
          .returning();
        await logAudit({ userId: admin.id, action: "partner.create", entityType: "partner", entityId: row.id });
        return jsonOk({ partner: row }, 201);
      }
      throw e;
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Données invalides");
    }
    return handleApiError(err);
  }
}

export { ALLOWED_ICONS };
