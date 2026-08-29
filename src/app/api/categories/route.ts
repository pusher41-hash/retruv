import { asc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { jsonOk, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const all = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder));

    const parents = all.filter((c) => !c.parentId);
    const tree = parents.map((p) => ({
      ...p,
      children: all.filter((c) => c.parentId === p.id),
    }));

    return jsonOk({ categories: tree, flat: all });
  } catch (err) {
    return handleApiError(err);
  }
}
