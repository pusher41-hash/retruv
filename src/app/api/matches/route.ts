import { desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  foundItems,
  lostItems,
  matches,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { sanitizePublicDescription } from "@/lib/security";

export async function GET() {
  try {
    const user = await requireUser();

    const myLost = await db
      .select({ id: lostItems.id })
      .from(lostItems)
      .where(eq(lostItems.userId, user.id));
    const myFound = await db
      .select({ id: foundItems.id })
      .from(foundItems)
      .where(eq(foundItems.userId, user.id));

    const lostIds = myLost.map((x) => x.id);
    const foundIds = myFound.map((x) => x.id);

    if (lostIds.length === 0 && foundIds.length === 0) {
      return jsonOk({ matches: [] });
    }

    const allMatches = await db
      .select({
        match: matches,
        lost: lostItems,
        found: foundItems,
        lostCat: categories,
      })
      .from(matches)
      .innerJoin(lostItems, eq(matches.lostItemId, lostItems.id))
      .innerJoin(foundItems, eq(matches.foundItemId, foundItems.id))
      .innerJoin(categories, eq(lostItems.categoryId, categories.id))
      .where(
        or(
          lostIds.length
            ? eq(lostItems.userId, user.id)
            : eq(lostItems.userId, "00000000-0000-0000-0000-000000000000"),
          foundIds.length
            ? eq(foundItems.userId, user.id)
            : eq(foundItems.userId, "00000000-0000-0000-0000-000000000000")
        )
      )
      .orderBy(desc(matches.score))
      .limit(50);

    const result = allMatches.map((r) => {
      const isOwner = r.lost.userId === user.id;
      return {
        id: r.match.id,
        score: r.match.score,
        level: r.match.level,
        status: r.match.status,
        scoreBreakdown: r.match.scoreBreakdown,
        createdAt: r.match.createdAt,
        role: isOwner ? "owner" : "finder",
        lostItem: {
          id: r.lost.id,
          title: r.lost.title,
          city: r.lost.city,
          status: r.lost.status,
          isSensitive: r.lost.isSensitive,
          category: r.lostCat,
        },
        foundItem: {
          id: r.found.id,
          title: r.found.title,
          city: r.found.city,
          status: r.found.status,
          isSensitive: r.found.isSensitive,
          description: sanitizePublicDescription(
            r.found.description,
            r.found.isSensitive
          ),
        },
      };
    });

    return jsonOk({ matches: result });
  } catch (err) {
    return handleApiError(err);
  }
}
