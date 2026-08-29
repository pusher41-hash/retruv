import { afterAll, describe, expect, it } from "vitest";
import { MAX_VERIFY_ATTEMPTS } from "@/lib/constants";
import { authedFetch, findCategory, registerUser, type TestSession } from "./helpers";
import { cleanupTestUsers } from "./cleanup";

afterAll(cleanupTestUsers);

async function declareAndMatch(): Promise<{
  loser: TestSession;
  finder: TestSession;
  matchId: string;
}> {
  const loser = await registerUser();
  const finder = await registerUser();
  const { categoryId } = await findCategory("objets", "portefeuille");

  const lostRes = await authedFetch(loser, "/api/lost", {
    method: "POST",
    body: JSON.stringify({
      categoryId,
      title: "Portefeuille en cuir perdu",
      description: "Portefeuille en cuir marron perdu dans le bus",
      brand: "Aucune",
      color: "Marron",
      distinctiveFeatures: "initiales gravées AK",
      district: "Zone 1",
      city: "Ouagadougou",
    }),
  });
  const lostBody = await lostRes.json();

  await authedFetch(finder, "/api/found", {
    method: "POST",
    body: JSON.stringify({
      categoryId,
      title: "Portefeuille en cuir trouvé",
      description: "Portefeuille en cuir marron trouvé dans un bus",
      brand: "Aucune",
      color: "Marron",
      distinctiveFeatures: "initiales gravées AK",
      district: "Zone 1",
      city: "Ouagadougou",
    }),
  });

  const matchesRes = await authedFetch(loser, "/api/matches");
  const matchesBody = await matchesRes.json();
  const match = matchesBody.matches.find(
    (m: { lostItem: { id: string } }) => m.lostItem.id === lostBody.item.id
  );
  if (!match) throw new Error("setup failed: no match produced for verification test");
  return { loser, finder, matchId: match.id };
}

describe("ownership verification", () => {
  it("only the lost item's declarant can start a verification", async () => {
    const { finder, matchId } = await declareAndMatch();
    const res = await authedFetch(finder, `/api/matches/${matchId}/verify`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(403);
  });

  it("never leaks expectedHint to the client, even to the claimant", async () => {
    const { loser, matchId } = await declareAndMatch();
    const res = await authedFetch(loser, `/api/matches/${matchId}/verify`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verification.questions.length).toBeGreaterThan(0);
    for (const q of body.verification.questions) {
      expect(q).not.toHaveProperty("expectedHint");
    }
  });

  it("passes with correct answers, opens a conversation, and moves items to in_recovery", async () => {
    const { loser, finder, matchId } = await declareAndMatch();

    const startRes = await authedFetch(loser, `/api/matches/${matchId}/verify`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    const questions = (await startRes.json()).verification.questions as {
      id: string;
    }[];

    const answersById: Record<string, string> = {
      lost_place: "Zone 1",
      lost_date: "",
      distinctive: "initiales gravées AK",
      brand_model: "Aucune",
      color: "Marron",
    };
    const answers: Record<string, string> = {};
    for (const q of questions) {
      if (q.id in answersById && answersById[q.id]) answers[q.id] = answersById[q.id];
    }

    const answerRes = await authedFetch(loser, `/api/matches/${matchId}/verify`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
    expect(answerRes.status).toBe(200);
    const answerBody = await answerRes.json();
    expect(answerBody.verification.passed).toBe(true);
    expect(answerBody.verification.score).toBeGreaterThanOrEqual(70);
    expect(answerBody.conversationId).toBeTruthy();

    const matchDetailRes = await authedFetch(loser, `/api/matches/${matchId}`);
    const matchDetail = await matchDetailRes.json();
    expect(matchDetail.match.status).toBe("verified");
    expect(matchDetail.lostItem.status).toBe("in_recovery");
    expect(matchDetail.foundItem.status).toBe("in_recovery");

    // The finder must see the same conversation on their side too.
    const finderConvos = await authedFetch(finder, "/api/messages");
    const finderConvosBody = await finderConvos.json();
    expect(
      finderConvosBody.conversations.some(
        (c: { id: string }) => c.id === answerBody.conversationId
      )
    ).toBe(true);
  });

  it(
    `fails the match after ${MAX_VERIFY_ATTEMPTS} wrong attempts and then blocks further tries`,
    async () => {
      const { loser, matchId } = await declareAndMatch();

      await authedFetch(loser, `/api/matches/${matchId}/verify`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      let lastBody: { verification: { status: string } } | undefined;
      for (let i = 0; i < MAX_VERIFY_ATTEMPTS; i++) {
        const res = await authedFetch(loser, `/api/matches/${matchId}/verify`, {
          method: "POST",
          body: JSON.stringify({
            answers: { lost_place: "endroit totalement faux et sans rapport" },
          }),
        });
        expect(res.status).toBe(200);
        lastBody = await res.json();
      }
      expect(lastBody?.verification.status).toBe("failed");

      const afterRes = await authedFetch(loser, `/api/matches/${matchId}/verify`, {
        method: "POST",
        body: JSON.stringify({ answers: { lost_place: "Zone 1" } }),
      });
      expect(afterRes.status).toBe(429);
    }
  );
});
