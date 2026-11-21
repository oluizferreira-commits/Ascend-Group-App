import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEIGHTS, buildRankings, computeMatchRating, eligibilityThreshold, metricValues, summarizeSeason,
  type MatchStatLine,
} from "@/lib/rating";

const line = (o: Partial<MatchStatLine> = {}): MatchStatLine => ({ goals: 0, assists: 0, result: "D", ...o });

describe("metricValues", () => {
  it("treats unrecorded metrics as null, not zero", () => {
    const v = metricValues(line());
    expect(v.tackles).toBeNull();
    expect(v.passAccuracy).toBeNull();
    expect(v.cleanSheet).toBeNull();
    expect(v.goals).toBe(0);
  });
  it("needs at least 5 passes for pass accuracy", () => {
    expect(metricValues(line({ passesAttempted: 4, passesCompleted: 4 })).passAccuracy).toBeNull();
    expect(metricValues(line({ passesAttempted: 20, passesCompleted: 17 })).passAccuracy).toBeCloseTo(1);
  });
});

describe("computeMatchRating", () => {
  it("starts from the base rating for a neutral line", () => {
    expect(computeMatchRating(line(), DEFAULT_WEIGHTS.ATT).computed).toBe(6);
  });
  it("weights the same stats differently per position group", () => {
    const l = line({ tackles: 8, interceptions: 5, goals: 0 });
    const def = computeMatchRating(l, DEFAULT_WEIGHTS.DEF).computed;
    const att = computeMatchRating(l, DEFAULT_WEIGHTS.ATT).computed;
    expect(def).toBeGreaterThan(att);
  });
  it("clamps between 0 and 10", () => {
    expect(computeMatchRating(line({ goals: 9, result: "W" }), DEFAULT_WEIGHTS.ATT).computed).toBe(10);
    expect(computeMatchRating(line({ redCards: 5, result: "L" }), DEFAULT_WEIGHTS.ATT).computed).toBe(0);
  });
  it("blends the external rating when present", () => {
    const r = computeMatchRating(line({ externalRating: 9 }), DEFAULT_WEIGHTS.MID, 0.5);
    expect(r.computed).toBe(6);
    expect(r.final).toBe(7.5);
  });
});

describe("season summary and rankings", () => {
  const a = summarizeSeason(
    { playerId: "a", group: "ATT", lines: [line({ goals: 2, result: "W" }), line({ goals: 1, assists: 1, result: "W" }), line({ result: "L" })] },
    DEFAULT_WEIGHTS,
  );
  const b = summarizeSeason({ playerId: "b", group: "MID", lines: [line({ assists: 3, result: "W" })] }, DEFAULT_WEIGHTS);
  const c = summarizeSeason({ playerId: "c", group: "DEF", lines: [] }, DEFAULT_WEIGHTS);

  it("aggregates totals and per-match averages", () => {
    expect(a.matches).toBe(3);
    expect(a.goals).toBe(3);
    expect(a.goalInvolvements).toBe(4);
    expect(a.goalsPerMatch).toBe(1);
    expect(a.wins).toBe(2);
    expect(a.losses).toBe(1);
    expect(a.consistency).not.toBeNull();
    expect(b.consistency).toBeNull();
  });

  it("keeps optional totals with recorded-in counts", () => {
    expect(a.optional.tackles).toEqual({ total: 0, recordedIn: 0 });
  });

  it("applies the eligibility threshold to rating-based awards only", () => {
    expect(eligibilityThreshold(10, 30)).toBe(3);
    expect(eligibilityThreshold(0, 30)).toBe(1);
    const r = buildRankings([a, b, c], 3, 50); // threshold = 2
    expect(r.best.map((s) => s.playerId)).toEqual(["a"]);
    expect(r.assisters[0].playerId).toBe("b");
    expect(r.scorers.map((s) => s.playerId)).toEqual(["a"]);
    expect(r.decisive[0].playerId).toBe("a");
    expect(r.scorers.some((s) => s.playerId === "c")).toBe(false);
  });
});
