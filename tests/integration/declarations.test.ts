import { afterAll, describe, expect, it } from "vitest";
import {
  anonFetch,
  authedFetch,
  findCategory,
  loginAsAdmin,
  registerUser,
} from "./helpers";
import { cleanupTestUsers } from "./cleanup";

afterAll(cleanupTestUsers);

describe("lost/found declarations + matching engine", () => {
  it("an auto-approved category is published immediately and matched against a similar found item", async () => {
    const loser = await registerUser({ fullName: "Fatou Sawadogo" });
    const finder = await registerUser({ fullName: "Ibrahim Traoré" });
    const { categoryId } = await findCategory("objets", "telephone");

    const lostRes = await authedFetch(loser, "/api/lost", {
      method: "POST",
      body: JSON.stringify({
        categoryId,
        title: "Samsung Galaxy A54 perdu",
        description: "Téléphone Samsung Galaxy A54 noir avec coque fissurée",
        brand: "Samsung",
        model: "Galaxy A54",
        color: "Noir",
        distinctiveFeatures: "coque fissurée",
        city: "Ouagadougou",
      }),
    });
    expect(lostRes.status).toBe(201);
    const lostBody = await lostRes.json();
    expect(lostBody.item.moderationStatus).toBe("auto_approved");
    expect(lostBody.pendingModeration).toBeUndefined();

    // Published immediately: visible in the public, unauthenticated listing.
    const publicList = await anonFetch("/api/lost");
    const publicBody = await publicList.json();
    expect(publicBody.items.some((i: { id: string }) => i.id === lostBody.item.id)).toBe(
      true
    );

    const foundRes = await authedFetch(finder, "/api/found", {
      method: "POST",
      body: JSON.stringify({
        categoryId,
        title: "Samsung Galaxy A54 trouvé",
        description: "Téléphone Samsung Galaxy A54 noir, coque fissurée trouvé au marché",
        brand: "Samsung",
        model: "Galaxy A54",
        color: "Noir",
        distinctiveFeatures: "coque fissurée",
        city: "Ouagadougou",
      }),
    });
    expect(foundRes.status).toBe(201);
    const foundBody = await foundRes.json();
    expect(foundBody.matchesFound).toBeGreaterThan(0);

    const matchesRes = await authedFetch(loser, "/api/matches");
    const matchesBody = await matchesRes.json();
    const match = matchesBody.matches.find(
      (m: { lostItem: { id: string } }) => m.lostItem.id === lostBody.item.id
    );
    expect(match).toBeDefined();
    expect(match.foundItem.id).toBe(foundBody.item.id);
    expect(["probable", "very_probable"]).toContain(match.level);

    // Same match must also show up for the finder, on the other side.
    const finderMatchesRes = await authedFetch(finder, "/api/matches");
    const finderMatchesBody = await finderMatchesRes.json();
    expect(
      finderMatchesBody.matches.some((m: { id: string }) => m.id === match.id)
    ).toBe(true);
  });

  it("declarations in unrelated categories/cities are never paired with each other", async () => {
    // Not "the lost item has zero matches at all" — other tests in this
    // file (and the seeded demo data) create their own phone/bike items
    // that could legitimately produce unrelated low-score matches of their
    // own. What must hold is that THESE two specific declarations, which
    // share no category, city, brand, or description text, never get
    // matched to each other.
    const loser = await registerUser();
    const finder = await registerUser();
    const { categoryId: phoneId } = await findCategory("objets", "telephone");
    const { categoryId: bikeId } = await findCategory("transport", "velo");

    const lostRes = await authedFetch(loser, "/api/lost", {
      method: "POST",
      body: JSON.stringify({
        categoryId: phoneId,
        title: "iPhone perdu",
        description: "iPhone 13 blanc perdu en centre-ville",
        city: "Bobo-Dioulasso",
      }),
    });
    const lostBody = await lostRes.json();

    const foundRes = await authedFetch(finder, "/api/found", {
      method: "POST",
      body: JSON.stringify({
        categoryId: bikeId,
        title: "Vélo trouvé",
        description: "Vélo rouge trouvé près de la gare",
        city: "Ouagadougou",
      }),
    });
    const foundBody = await foundRes.json();
    // Different category from the lost item above — the found-side matching
    // run only ever considers same-category candidates, so it must find none.
    expect(foundBody.matchesFound).toBe(0);

    const matchesRes = await authedFetch(loser, "/api/matches");
    const matchesBody = await matchesRes.json();
    expect(
      matchesBody.matches.some(
        (m: { lostItem: { id: string }; foundItem: { id: string } }) =>
          m.lostItem.id === lostBody.item.id && m.foundItem.id === foundBody.item.id
      )
    ).toBe(false);
  });
});

describe("missing-person moderation gate", () => {
  it("holds a missing-person declaration for review, hidden from the public and from matching", async () => {
    const declarant = await registerUser({ fullName: "Aïcha Ouédraogo" });
    const { categoryId, subcategoryId } = await findCategory("personnes", "femme");

    const res = await authedFetch(declarant, "/api/lost", {
      method: "POST",
      body: JSON.stringify({
        categoryId,
        subcategoryId,
        title: "Femme disparue près de la gare",
        description: "Disparition signalée hier soir près de la gare routière",
        city: "Bobo-Dioulasso",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.pendingModeration).toBe(true);
    expect(body.item.moderationStatus).toBe("pending_review");

    // Invisible to an anonymous visitor…
    const publicList = await anonFetch("/api/lost");
    const publicBody = await publicList.json();
    expect(publicBody.items.some((i: { id: string }) => i.id === body.item.id)).toBe(
      false
    );

    // …but the declarant can still see their own pending declaration.
    const mineRes = await authedFetch(declarant, "/api/lost?mine=1");
    const mineBody = await mineRes.json();
    expect(mineBody.items.some((i: { id: string }) => i.id === body.item.id)).toBe(
      true
    );
  });

  it("surfaces a pending declaration in the admin queue, and approving publishes it", async () => {
    const declarant = await registerUser();
    const { categoryId, subcategoryId } = await findCategory("personnes", "homme");
    const admin = await loginAsAdmin();

    const createRes = await authedFetch(declarant, "/api/lost", {
      method: "POST",
      body: JSON.stringify({
        categoryId,
        subcategoryId,
        title: "Homme disparu au marché",
        description: "Personne non revue depuis deux jours au marché central",
        city: "Ouagadougou",
      }),
    });
    const item = (await createRes.json()).item;

    const queueRes = await authedFetch(admin, "/api/admin/moderation");
    expect(queueRes.status).toBe(200);
    const queueBody = await queueRes.json();
    expect(
      queueBody.pendingLost.some((row: { item: { id: string } }) => row.item.id === item.id)
    ).toBe(true);

    const approveRes = await authedFetch(admin, "/api/admin/moderation", {
      method: "PATCH",
      body: JSON.stringify({ type: "lost", id: item.id, action: "approve" }),
    });
    expect(approveRes.status).toBe(200);

    const publicList = await anonFetch("/api/lost");
    const publicBody = await publicList.json();
    expect(publicBody.items.some((i: { id: string }) => i.id === item.id)).toBe(true);
  });

  it("rejecting a declaration keeps it hidden and records the reason for the declarant", async () => {
    const declarant = await registerUser();
    const { categoryId, subcategoryId } = await findCategory(
      "personnes",
      "personne-agee"
    );
    const admin = await loginAsAdmin();

    const createRes = await authedFetch(declarant, "/api/lost", {
      method: "POST",
      body: JSON.stringify({
        categoryId,
        subcategoryId,
        title: "Personne âgée disparue",
        description: "Non revue depuis ce matin près du quartier",
        city: "Ouagadougou",
      }),
    });
    const item = (await createRes.json()).item;

    const rejectRes = await authedFetch(admin, "/api/admin/moderation", {
      method: "PATCH",
      body: JSON.stringify({
        type: "lost",
        id: item.id,
        action: "reject",
        reason: "Description insuffisante pour publication",
      }),
    });
    expect(rejectRes.status).toBe(200);

    const publicList = await anonFetch("/api/lost");
    const publicBody = await publicList.json();
    expect(publicBody.items.some((i: { id: string }) => i.id === item.id)).toBe(false);

    const mineRes = await authedFetch(declarant, "/api/lost?mine=1");
    const mineBody = await mineRes.json();
    const mine = mineBody.items.find((i: { id: string }) => i.id === item.id);
    expect(mine.moderationStatus).toBe("rejected");
    expect(mine.moderationNotes).toBe("Description insuffisante pour publication");
  });
});
