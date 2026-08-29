import { eq } from "drizzle-orm";
import { db } from "@/db";
import { foundItems, lostItems, recoveryPoints } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { approximateLocation } from "@/lib/utils";
import { MapPin, Search, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const lost = await db
    .select()
    .from(lostItems)
    .where(eq(lostItems.status, "active"))
    .limit(50);
  const found = await db
    .select()
    .from(foundItems)
    .where(eq(foundItems.status, "active"))
    .limit(50);
  const points = await db
    .select()
    .from(recoveryPoints)
    .where(eq(recoveryPoints.isActive, true));

  // Approximate city clusters for privacy (no exact pins for sensitive items)
  const cityStats: Record<
    string,
    { lost: number; found: number; points: number }
  > = {};

  for (const i of lost) {
    cityStats[i.city] ??= { lost: 0, found: 0, points: 0 };
    cityStats[i.city].lost++;
  }
  for (const i of found) {
    cityStats[i.city] ??= { lost: 0, found: 0, points: 0 };
    cityStats[i.city].found++;
  }
  for (const p of points) {
    cityStats[p.city] ??= { lost: 0, found: 0, points: 0 };
    cityStats[p.city].points++;
  }

  const markers = [
    ...lost
      .filter((i) => !i.isSensitive)
      .map((i) => ({
        type: "lost" as const,
        title: i.title,
        city: i.city,
        loc: approximateLocation(i.latitude, i.longitude),
      })),
    ...found
      .filter((i) => !i.isSensitive)
      .map((i) => ({
        type: "found" as const,
        title: i.title,
        city: i.city,
        loc: approximateLocation(i.latitude, i.longitude),
      })),
    ...points.map((p) => ({
      type: "point" as const,
      title: p.name,
      city: p.city,
      loc: approximateLocation(p.latitude, p.longitude),
    })),
  ];

  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="Cartographie"
        title="Carte approximative"
        description="Localisations volontairement imprécises. Jamais de position exacte pour un document sensible ou un utilisateur."
      />

      <div className="card relative overflow-hidden p-0">
        <div className="relative min-h-[420px] bg-[radial-gradient(circle_at_30%_20%,#dbeafe,transparent_35%),radial-gradient(circle_at_70%_60%,#ccfbf1,transparent_30%),linear-gradient(160deg,#0b1f3a,#0e4d92_45%,#0f766e)]">
          <div className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(cityStats).map(([city, s]) => (
              <div
                key={city}
                className="rounded-2xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur"
              >
                <div className="flex items-center gap-2">
                  <span className="map-dot bg-sky-300" />
                  <h3 className="font-bold">{city}</h3>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-black/20 p-2">
                    <div className="text-lg font-black">{s.lost}</div>
                    <div className="text-sky-100">perdus</div>
                  </div>
                  <div className="rounded-xl bg-black/20 p-2">
                    <div className="text-lg font-black">{s.found}</div>
                    <div className="text-sky-100">trouvés</div>
                  </div>
                  <div className="rounded-xl bg-black/20 p-2">
                    <div className="text-lg font-black">{s.points}</div>
                    <div className="text-sky-100">points</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold text-retruv-navy">Légende</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-sky-500" /> Objets perdus
              (zone approx.)
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-teal-500" /> Objets trouvés
              non sensibles
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-400" /> Points RETRUV
            </li>
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="font-bold text-retruv-navy">Marqueurs visibles</h2>
          <div className="mt-3 max-h-56 space-y-2 overflow-y-auto text-sm">
            {markers.map((m, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate font-medium text-slate-800">
                  {m.type === "lost" ? (
                    <Search className="h-3.5 w-3.5 shrink-0 text-retruv-blue" />
                  ) : m.type === "found" ? (
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-retruv-teal" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  )}
                  <span className="truncate">{m.title}</span>
                </span>
                <span className="text-xs text-slate-500">{m.city}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
