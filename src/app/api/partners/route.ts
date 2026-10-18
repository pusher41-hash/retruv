import { asc } from "drizzle-orm";
import { db } from "@/db";
import { partners } from "@/db/schema";
import { jsonOk, handleApiError } from "@/lib/api";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    try {
      const rows = await db
        .select()
        .from(partners)
        .where(eq(partners.isActive, true))
        .orderBy(asc(partners.sortOrder), asc(partners.createdAt));
      return jsonOk({ partners: rows });
    } catch (e: unknown) {
      // Table may not exist yet if migration hasn't run — return empty list
      const msg = (e as Error)?.message ?? "";
      if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("partners")) {
        return jsonOk({ partners: [], fallback: true });
      }
      throw e;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
