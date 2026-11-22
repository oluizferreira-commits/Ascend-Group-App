import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS, summarizeSeason, type MatchStatLine } from "@/lib/rating";
import { cardOverall, cardTier, rawAttributes, squadAttributes } from "@/lib/attributes";

const l = (o: Partial<MatchStatLine> = {}): MatchStatLine => ({ goals: 0, assists: 0, result: "W", ...o });
const sum = (id: string, lines: MatchStatLine[]) => summarizeSeason({ playerId: id, group: "MID", lines }, DEFAULT_WEIGHTS);

describe("card attributes", () => {
  const a = sum("a", [l({ goals: 2, passesAttempted: 30, passesCompleted: 27 }), l({ goals: 1 }), l()]);
  const b = sum("b", [l({ assists: 2, tackles: 4 }), l({ assists: 1, tackles: 2 })]);
  const c = sum("c", []);

  it("never invents missing metrics", () => {
    const rb = rawAttributes(b);
    expect(rb.PAS).toBeNull();
    expect(rb.DEF).toBe(3);
    expect(rawAttributes(c)).toEqual({ FIN: null, CRI: null, DEC: null, PAS: null, DEF: null, REG: null });
    expect(rawAttributes(a).PAS).toBeCloseTo(0.9);
  });

  it("scores relative to the squad on 30–99", () => {
    const m = squadAttributes([a, b, c]);
    expect(m.get("a")!.FIN).toBe(99);
    expect(m.get("b")!.FIN).toBe(30);
    expect(m.get("b")!.CRI).toBe(99);
    expect(m.get("a")!.PAS).toBe(65); // only one player with passes → middle of the scale
    expect(m.get("c")!.FIN).toBeNull();
  });

  it("headline overall prefers the in-game value", () => {
    expect(cardOverall(87, 7.2)).toEqual({ value: 87, source: "ea" });
    expect(cardOverall(null, 7.26)).toEqual({ value: 73, source: "rating" });
    expect(cardOverall(null, null).value).toBeNull();
    expect(cardTier(90)).toBe("lenda");
    expect(cardTier(78)).toBe("ascend");
    expect(cardTier(null)).toBe("base");
  });
});

import { compareSummaries } from "@/lib/compare";

describe("compareSummaries", () => {
  const a = summarizeSeason({ playerId: "a", group: "ATT", lines: [l({ goals: 2 }), l({ goals: 1, redCards: 1 })] }, DEFAULT_WEIGHTS);
  const b = summarizeSeason({ playerId: "b", group: "MID", lines: [l({ assists: 2, redCards: 0 }), l({ assists: 1 }), l({ result: "L" })] }, DEFAULT_WEIGHTS);
  it("picks a winner per category and ignores rows without data on both sides", () => {
    const { rows, score } = compareSummaries(a, b);
    const goals = rows.find((r) => r.row.key === "goals")!;
    expect(goals.winner).toBe("a");
    const reds = rows.find((r) => r.row.key === "reds")!;
    expect(reds.winner).toBe("b"); // fewer is better
    expect(rows.some((r) => r.row.key === "passAcc")).toBe(false); // nobody has passes
    expect(score.a + score.b + score.ties).toBe(rows.filter((r) => r.winner).length);
  });
});
