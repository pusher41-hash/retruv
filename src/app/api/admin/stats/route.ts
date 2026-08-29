import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  foundItems,
  fraudFlags,
  lostItems,
  matches,
  recoveries,
  recoveryPoints,
  reports,
  users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();

    const [userCount] = await db.select({ c: count() }).from(users);
    const [lostCount] = await db.select({ c: count() }).from(lostItems);
    const [foundCount] = await db.select({ c: count() }).from(foundItems);
    const [matchCount] = await db.select({ c: count() }).from(matches);
    const [recoveryCount] = await db.select({ c: count() }).from(recoveries);
    const [completedRec] = await db
      .select({ c: count() })
      .from(recoveries)
      .where(eq(recoveries.status, "completed"));
    const [openReports] = await db
      .select({ c: count() })
      .from(reports)
      .where(eq(reports.status, "open"));
    const [fraudCount] = await db
      .select({ c: count() })
      .from(fraudFlags)
      .where(eq(fraudFlags.isResolved, false));
    const [pointsCount] = await db.select({ c: count() }).from(recoveryPoints);

    const recentUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        phone: users.phone,
        city: users.city,
        role: users.role,
        createdAt: users.createdAt,
        isBlocked: users.isBlocked,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(10);

    const recentMatches = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(10);

    const recentLogs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(20);

    const byCity = await db
      .select({
        city: lostItems.city,
        count: sql<number>`count(*)::int`,
      })
      .from(lostItems)
      .groupBy(lostItems.city)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    const matchLevels = await db
      .select({
        level: matches.level,
        count: sql<number>`count(*)::int`,
      })
      .from(matches)
      .groupBy(matches.level);

    const avgScore = await db
      .select({ avg: sql<number>`coalesce(avg(score),0)` })
      .from(matches);

    return jsonOk({
      stats: {
        users: userCount.c,
        lostItems: lostCount.c,
        foundItems: foundCount.c,
        matches: matchCount.c,
        recoveries: recoveryCount.c,
        completedRecoveries: completedRec.c,
        openReports: openReports.c,
        fraudFlags: fraudCount.c,
        recoveryPoints: pointsCount.c,
        recoveryRate:
          matchCount.c > 0
            ? Math.round((completedRec.c / matchCount.c) * 100)
            : 0,
        avgMatchScore: Math.round(Number(avgScore[0]?.avg ?? 0)),
      },
      byCity,
      matchLevels,
      recentUsers,
      recentMatches,
      recentLogs,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
