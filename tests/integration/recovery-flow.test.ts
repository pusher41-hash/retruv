import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recoveries } from "@/db/schema";
import { authedFetch, findCategory, registerUser, type TestSession } from "./helpers";
import { cleanupTestUsers } from "./cleanup";

afterAll(cleanupTestUsers);

/** Test-only introspection: the app deliberately never returns the
 * restitution code via any API response (see recoveries/route.ts) — it only
 * reaches owner/finder as a private notification. Reading it straight from
 * the DB is the integration-test equivalent of "the tester already knows
 * their own code from the notification they received". */
async function readRestitutionCode(recoveryId: string): Promise<string> {
  const [rec] = await db
    .select({ code: recoveries.restitutionCode })
    .from(recoveries)
    .where(eq(recoveries.id, recoveryId))
    .limit(1);
  if (!rec?.code) throw new Error("restitution code was not issued");
  return rec.code;
}

async function declareMatchAndVerify(): Promise<{
  loser: TestSession;
  finder: TestSession;
  matchId: string;
  conversationId: string;
}> {
  const loser = await registerUser({ fullName: "Fatou Sawadogo" });
  const finder = await registerUser({ fullName: "Ibrahim Traoré" });
  const { categoryId } = await findCategory("objets", "cles");

  const lostRes = await authedFetch(loser, "/api/lost", {
    method: "POST",
    body: JSON.stringify({
      categoryId,
      title: "Trousseau de clés perdu",
      description: "Trousseau avec porte-clés en forme de ballon de foot",
      color: "Argenté",
      distinctiveFeatures: "porte-cles ballon de foot",
      district: "Gounghin",
      city: "Ouagadougou",
    }),
  });
  const lostBody = await lostRes.json();

  await authedFetch(finder, "/api/found", {
    method: "POST",
    body: JSON.stringify({
      categoryId,
      title: "Trousseau de clés trouvé",
      description: "Trousseau trouvé avec porte-clés ballon de foot",
      color: "Argenté",
      distinctiveFeatures: "porte-cles ballon de foot",
      district: "Gounghin",
      city: "Ouagadougou",
    }),
  });

  const matchesRes = await authedFetch(loser, "/api/matches");
  const match = (await matchesRes.json()).matches.find(
    (m: { lostItem: { id: string } }) => m.lostItem.id === lostBody.item.id
  );
  if (!match) throw new Error("setup failed: no match produced for recovery-flow test");

  await authedFetch(loser, `/api/matches/${match.id}/verify`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  const verifyRes = await authedFetch(loser, `/api/matches/${match.id}/verify`, {
    method: "POST",
    body: JSON.stringify({
      answers: {
        lost_place: "Gounghin",
        distinctive: "porte-cles ballon de foot",
        color: "Argenté",
      },
    }),
  });
  const verifyBody = await verifyRes.json();
  if (!verifyBody.verification.passed) {
    throw new Error(`setup failed: verification did not pass (${JSON.stringify(verifyBody)})`);
  }

  return { loser, finder, matchId: match.id, conversationId: verifyBody.conversationId };
}

describe("chat", () => {
  it("lets both matched participants exchange messages", async () => {
    const { loser, finder, conversationId } = await declareMatchAndVerify();

    const sendRes = await authedFetch(loser, `/api/messages/${conversationId}`, {
      method: "POST",
      body: JSON.stringify({ content: "Bonjour, où peut-on se retrouver ?" }),
    });
    expect(sendRes.status).toBe(200);

    const finderView = await authedFetch(finder, `/api/messages/${conversationId}`);
    const finderBody = await finderView.json();
    expect(
      finderBody.messages.some(
        (m: { content: string; isMine: boolean }) =>
          m.content === "Bonjour, où peut-on se retrouver ?" && m.isMine === false
      )
    ).toBe(true);
  });

  it("stops delivery once the recipient blocks the sender", async () => {
    const { loser, finder, conversationId } = await declareMatchAndVerify();

    const blockRes = await authedFetch(finder, `/api/messages/${conversationId}/block`, {
      method: "POST",
    });
    expect(blockRes.status).toBe(200);

    const blockedSend = await authedFetch(loser, `/api/messages/${conversationId}`, {
      method: "POST",
      body: JSON.stringify({ content: "Tu es toujours là ?" }),
    });
    expect(blockedSend.ok).toBe(false);

    const unblockRes = await authedFetch(finder, `/api/messages/${conversationId}/block`, {
      method: "DELETE",
    });
    expect(unblockRes.status).toBe(200);

    const afterUnblockSend = await authedFetch(loser, `/api/messages/${conversationId}`, {
      method: "POST",
      body: JSON.stringify({ content: "On peut se voir demain ?" }),
    });
    expect(afterUnblockSend.status).toBe(200);
  });
});

describe("recovery + restitution code + reputation", () => {
  it("runs the full handover: propose, confirm both sides, reject a wrong code, complete with the right one, and rate", async () => {
    const { loser, finder, matchId } = await declareMatchAndVerify();

    const proposeRes = await authedFetch(loser, "/api/recoveries", {
      method: "POST",
      body: JSON.stringify({
        matchId,
        method: "direct_meetup",
        meetupLocation: "Rond-point des Nations Unies",
      }),
    });
    expect(proposeRes.status).toBe(201);
    const recoveryId = (await proposeRes.json()).recovery.id;

    // Owner confirms first — this alone already flips status to "accepted"
    // and is what triggers the restitution code (see ensureRestitutionCode).
    const ownerConfirm = await authedFetch(loser, "/api/recoveries", {
      method: "PATCH",
      body: JSON.stringify({ recoveryId, action: "confirm" }),
    });
    expect(ownerConfirm.status).toBe(200);
    expect((await ownerConfirm.json()).recovery.status).toBe("accepted");

    const code = await readRestitutionCode(recoveryId);
    expect(code).toHaveLength(6);

    // Finder hasn't confirmed yet — completion must still be refused even
    // with a fully correct code, because finderConfirmed is still false.
    const tooEarly = await authedFetch(loser, "/api/recoveries", {
      method: "PATCH",
      body: JSON.stringify({ recoveryId, action: "complete", code }),
    });
    expect(tooEarly.status).toBe(200);
    expect((await tooEarly.json()).recovery.status).not.toBe("completed");

    const finderConfirm = await authedFetch(finder, "/api/recoveries", {
      method: "PATCH",
      body: JSON.stringify({ recoveryId, action: "confirm" }),
    });
    expect(finderConfirm.status).toBe(200);

    // Both sides confirmed now — a missing/wrong code must still be rejected.
    const wrongCode = await authedFetch(finder, "/api/recoveries", {
      method: "PATCH",
      body: JSON.stringify({ recoveryId, action: "complete", code: "ZZZZZZ" }),
    });
    expect(wrongCode.status).toBe(403);

    const meBeforeFinder = await authedFetch(finder, "/api/auth/me");
    const scoreBeforeFinder = (await meBeforeFinder.json()).user.reputationScore;
    const meBeforeOwner = await authedFetch(loser, "/api/auth/me");
    const scoreBeforeOwner = (await meBeforeOwner.json()).user.reputationScore;

    const completeRes = await authedFetch(finder, "/api/recoveries", {
      method: "PATCH",
      body: JSON.stringify({
        recoveryId,
        action: "complete",
        code,
        rating: { score: 5, comment: "Merci beaucoup !" },
      }),
    });
    expect(completeRes.status).toBe(200);
    const completeBody = await completeRes.json();
    expect(completeBody.recovery.status).toBe("completed");

    const matchDetail = await authedFetch(loser, `/api/matches/${matchId}`);
    const matchDetailBody = await matchDetail.json();
    expect(matchDetailBody.match.status).toBe("completed");
    expect(matchDetailBody.lostItem.status).toBe("recovered");
    expect(matchDetailBody.foundItem.status).toBe("recovered");

    // The flat recovery bonus always applies: finder +10, owner +5 (see the
    // two bumpReputation() calls right after `finalizing` in
    // recoveries/route.ts). The `rating` attached above was submitted by
    // the *finder* (this PATCH's caller) rating the *other* party — i.e.
    // the owner — so the extra rating-driven bump (round(score*2*weight),
    // "new"-level weight 0.5 → +5 for a 5-star rating) lands on the owner,
    // not the finder.
    const meAfterFinder = await authedFetch(finder, "/api/auth/me");
    const scoreAfterFinder = (await meAfterFinder.json()).user.reputationScore;
    expect(scoreAfterFinder).toBe(scoreBeforeFinder + 10);

    const meAfterOwner = await authedFetch(loser, "/api/auth/me");
    const scoreAfterOwner = (await meAfterOwner.json()).user.reputationScore;
    expect(scoreAfterOwner).toBe(scoreBeforeOwner + 10);
  });
});

describe("reports", () => {
  it("lets a user report a declaration and records it", async () => {
    const reporter = await registerUser();
    const declarer = await registerUser();
    const { categoryId } = await findCategory("objets", "sac");

    const lostRes = await authedFetch(declarer, "/api/lost", {
      method: "POST",
      body: JSON.stringify({
        categoryId,
        title: "Sac à dos suspect",
        description: "Déclaration utilisée uniquement pour tester /api/reports",
        city: "Ouagadougou",
      }),
    });
    const item = (await lostRes.json()).item;

    const reportRes = await authedFetch(reporter, "/api/reports", {
      method: "POST",
      body: JSON.stringify({
        targetType: "lost_item",
        targetId: item.id,
        reason: "Annonce suspecte",
        details: "Test d'intégration pour /api/reports",
      }),
    });
    expect(reportRes.status).toBe(201);
    const reportBody = await reportRes.json();
    expect(reportBody.report.status).toBe("open");
    expect(reportBody.report.reason).toBe("Annonce suspecte");
  });
});
