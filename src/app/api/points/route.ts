import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { recoveryPoints } from "@/db/schema";
import { jsonOk, handleApiError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");

    const rows = city
      ? await db
          .select()
          .from(recoveryPoints)
          .where(eq(recoveryPoints.city, city))
          .orderBy(asc(recoveryPoints.name))
      : await db
          .select()
          .from(recoveryPoints)
          .where(eq(recoveryPoints.isActive, true))
          .orderBy(asc(recoveryPoints.city), asc(recoveryPoints.name));

    return jsonOk({ points: rows });
  } catch (err) {
    return handleApiError(err);
  }
}
