import { describe, expect, it } from "vitest";
import { computeWindow, METRIC_BY_KEY, rollingSeries, type LabMatch, type LabStatLine } from "@/lib/lab/metrics";
import { diagnose, peerComparison, priorities, trendOf } from "@/lib/lab/diagnostics";
import { generatePlan, parseBrief, compareBuilds, budget } from "@/lib/lab/builder";
import { achievements, comparePeriods, evaluateGoal, goalTarget, splitAt } from "@/lib/lab/progress";
import { TOPICS, TOPIC_KEYS, topicVariant } from "@/lib/lab/trainer";
import { ATTR_KEYS, COSTS_STATUS, PLAYSTYLE_BY_KEY } from "@/lib/lab/game-data";

const blank: LabStatLine = {
  goals: 0, assists: 0, shots: null, shotsOnTarget: null, passesAttempted: null, passesCompleted: null,
  tackles: null, tacklesAttempted: null, interceptions: null, clearances: null, saves: null, goalsConceded: null, cleanSheet: null, isMotm: null,
};
let day = 0;
function m(s: Partial<LabStatLine>, rating: number | null = 7, minutes: number | null = 90): LabMatch {
  day++;
  return { matchId: `m${day}`, kickoffAt: new Date(Date.UTC(2026, 9, day, 22)), opponent: `Rival ${day}`, result: "W", minutes, rating, s: { ...blank, ...s }, source: "ea_fc" };
}
/** Deterministic small wobble so σ > 0. */
const wob = (i: number, amp: number) => ((i * 7) % 5 - 2) * amp;

describe("Statistics Analyzer", () => {
  it("uses the sum of the window for ratios and reports the sample", () => {
    const w = [m({ passesAttempted: 10, passesCompleted: 9 }), m({ passesAttempted: 30, passesCompleted: 21 }), m({ passesAttempted: 20, passesCompleted: 16 })];
    const v = computeWindow(METRIC_BY_KEY.passAccuracy, w);
    expect(v.n).toBe(3);
    expect(v.value).toBeCloseTo((46 / 60) * 100, 5); // not the mean of 90/70/80
  });
  it("never turns missing data into zero", () => {
    const w = [m({}), m({}), m({})];
    expect(computeWindow(METRIC_BY_KEY.passAccuracy, w).value).toBeNull();
    expect(computeWindow(METRIC_BY_KEY.tackleSuccess, w).n).toBe(0);
  });
  it("needs the minimum sample for longer windows but shows a single last match", () => {
    const one = [m({ passesAttempted: 40, passesCompleted: 30 })];
    expect(computeWindow(METRIC_BY_KEY.passAccuracy, one).value).toBeCloseTo(75);
    const two = [m({ shots: 3, goals: 1 }), m({ shots: 2, goals: 0 })];
    expect(computeWindow(METRIC_BY_KEY.conversion, two).value).toBeNull(); // below 8 shots
  });
  it("rolling series has gaps where data is missing", () => {
    const s = rollingSeries(METRIC_BY_KEY.goals, [m({ goals: 1 }), m({ goals: 0 }), m({ goals: 2 })], 3);
    expect(s).toHaveLength(3);
    expect(s[2].value).toBeCloseTo(1);
  });
});

describe("Diagnostic Engine", () => {
  const history = (n: number, f: (i: number) => Partial<LabStatLine>, rating = (i: number) => 7 + wob(i, 0.1)) =>
    Array.from({ length: n }, (_, i) => m(f(i), rating(i)));

  it("says there is not enough data instead of guessing", () => {
    const ins = diagnose(history(6, () => ({ goals: 1 })), "ATT");
    expect(ins).toHaveLength(1);
    expect(ins[0].id).toBe("insufficient");
  });
  it("detects a real drop in pass accuracy and explains it", () => {
    const base = history(12, (i) => ({ passesAttempted: 30, passesCompleted: 26 + Math.round(wob(i, 0.5)) }));
    const recent = history(5, (i) => ({ passesAttempted: 30, passesCompleted: 21 + Math.round(wob(i, 0.5)) }));
    const ins = diagnose([...base, ...recent], "MID");
    const p = ins.find((i) => i.id === "pass-down")!;
    expect(p).toBeTruthy();
    expect(p.evidence[0]).toMatch(/Precisão de passes/);
    expect(p.topic).toBe("passes");
    expect(p.recommendations.length).toBeGreaterThan(0);
    expect(["alta", "média"]).toContain(p.confidence);
  });
  it("reads a pass-accuracy drop with more attempts as riskier passing", () => {
    const base = history(12, (i) => ({ passesAttempted: 20 + Math.round(wob(i, 1)), passesCompleted: 17 + Math.round(wob(i, 0.5)) }));
    const recent = history(5, (i) => ({ passesAttempted: 34 + Math.round(wob(i, 1)), passesCompleted: 25 + Math.round(wob(i, 0.5)) }));
    const p = diagnose([...base, ...recent], "MID").find((i) => i.id === "pass-down")!;
    expect(p.interpretation).toMatch(/mais arriscados/);
    expect(p.tone).toBe("attention"); // not red: more attempts may explain the drop
    expect(p.variant).toBe("through");
  });
  it("stays silent on noise", () => {
    const all = history(17, (i) => ({ passesAttempted: 30, passesCompleted: 25 + Math.round(wob(i, 1)) }));
    expect(diagnose(all, "MID").map((i) => i.id)).toEqual(["stable"]);
  });
  it("detects 'more shots, fewer goals' for attackers only", () => {
    const base = history(12, (i) => ({ shots: 3 + (i % 2), goals: i % 2 === 0 ? 1 : 2 }));
    const recent = history(5, (i) => ({ shots: 6 + (i % 2), goals: i % 3 === 0 ? 1 : 0 }));
    const att = diagnose([...base, ...recent], "ATT").map((i) => i.id);
    expect(att).toContain("shots-up-conv-down");
    const gk = diagnose([...base, ...recent], "GK").map((i) => i.id);
    expect(gk).not.toContain("shots-up-conv-down");
  });
  it("trend requires a baseline that does not overlap the recent window", () => {
    expect(trendOf(METRIC_BY_KEY.goals, history(9, () => ({ goals: 1 })))).toBeNull();
  });
  it("priorities come from attention insights first and are capped at 3", () => {
    const pr = priorities(
      [{ id: "x", tone: "attention", title: "A", evidence: ["e"], interpretation: "", causes: [], recommendations: [], confidence: "alta", weight: 9, topic: "passes" }],
      [{ topic: "finishing", text: "B", weight: 1 }, { topic: "defending", text: "C", weight: 2 }, { topic: "goals", text: "D", weight: 0.5 }],
    );
    expect(pr.map((p) => p.topic)).toEqual(["passes", "defending", "finishing"]);
  });
  it("peer comparison needs at least 3 teammates", () => {
    const me = history(5, () => ({ goals: 1 }));
    const peer = () => history(5, () => ({ goals: 0 }));
    expect(peerComparison([METRIC_BY_KEY.goals], me, [peer(), peer()])[0].avg).toBeNull();
    expect(peerComparison([METRIC_BY_KEY.goals], me, [peer(), peer(), peer()])[0].position).toBe("acima");
  });
});

describe("Trainer library", () => {
  it("covers the 12 topics, each with valid attributes and playstyles", () => {
    expect(TOPIC_KEYS).toHaveLength(12);
    for (const k of TOPIC_KEYS) {
      for (const v of Object.values(TOPICS[k].variants)) {
        for (const a of [...v.primary, ...v.complementary]) expect(ATTR_KEYS).toContain(a);
        for (const p of v.playstyles) expect(PLAYSTYLE_BY_KEY[p]).toBeTruthy();
        for (const g of v.goals) if (g.metric) expect(METRIC_BY_KEY[g.metric]).toBeTruthy();
      }
    }
  });
  it("does not recommend Finishing first for long shots", () => {
    const { variant } = topicVariant("longShots", "finesse");
    expect(variant.primary[0]).toBe("longShots");
    expect(variant.primary).not.toContain("finishing");
  });
  it("through balls prioritise Vision over Short Passing", () => {
    expect(topicVariant("passes", "through").variant.primary[0]).toBe("vision");
  });
});

describe("Build Builder", () => {
  it("reads the example brief: second striker, holds the ball, through balls", () => {
    const p = parseBrief("Sou segundo atacante. Quero atrair a marcação pelo meio e usar passes em profundidade para os pontas infiltrarem.");
    expect(p.roleHint?.group).toBe("ATT");
    const keys = p.intents.map((i) => i.key);
    expect(keys).toContain("hold");
    expect(keys).toContain("through");
    expect(keys).not.toContain("defend"); // "marcação" here is not about defending
  });
  it("ranks attributes with reasons and never claims exact points without costs", () => {
    const plan = generatePlan({ group: "ATT", brief: "Sou segundo atacante. Quero atrair a marcação pelo meio e usar passes em profundidade para os pontas infiltrarem." });
    const top = plan.ranked.filter((r) => r.tier === "max").map((r) => r.key);
    expect(top).toContain("vision");
    expect(plan.ranked.find((r) => r.key === "vision")!.reasons.join(" ")).toMatch(/profundidade/);
    expect(plan.ranked.some((r) => r.key === "gkDiving")).toBe(false);
    expect(plan.notes.join(" ")).toMatch(/não uma distribuição exata/);
    expect(plan.drawbacks.length).toBeGreaterThan(0);
  });
  it("follows the trainer's order: Vision leads for through balls, even for a striker", () => {
    const plan = generatePlan({ group: "ATT", brief: "", focus: { topic: "passes", variant: "through" } });
    const order = plan.ranked.map((r) => r.key);
    expect(order.indexOf("vision")).toBeLessThan(order.indexOf("shortPassing"));
  });
  it("a training focus moves its primary attributes to the top", () => {
    const plan = generatePlan({ group: "MID", brief: "", focus: { topic: "longShots", variant: "power" } });
    expect(plan.ranked.filter((r) => r.tier === "max").map((r) => r.key)).toContain("longShots");
  });
  it("budget is not computed without a verified cost table", () => {
    expect(COSTS_STATUS.verified).toBe(false);
    expect(budget({ name: "x", archetype: null, attributes: { vision: { initial: 60, planned: 80 } }, playstyles: [], pointsAvailable: 100 })).toMatchObject({ used: null, validated: false });
  });
  it("compares two builds attribute by attribute", () => {
    const c = compareBuilds(
      { name: "A", archetype: null, attributes: { vision: { initial: 60, planned: 70 }, finishing: { initial: 80, planned: null } }, playstyles: [{ key: "incisivePass", plus: false }], pointsAvailable: null },
      { name: "B", archetype: null, attributes: { vision: { initial: 60, planned: 85 } }, playstyles: [{ key: "finesseShot", plus: true }], pointsAvailable: null },
    );
    expect(c.rows.find((r) => r.key === "vision")!.diff).toBe(15);
    expect(c.rows.find((r) => r.key === "finishing")!.b).toBeNull();
    expect(c.onlyA).toEqual(["incisivePass"]);
    expect(c.onlyB).toEqual(["finesseShot"]);
  });
});

describe("Player Progress", () => {
  it("splits matches at a São Paulo calendar day and compares periods", () => {
    const ms = [m({ goals: 0 }), m({ goals: 0 }), m({ goals: 0 }), m({ goals: 1 }), m({ goals: 1 }), m({ goals: 2 })];
    const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(ms[3].kickoffAt);
    const { before, after } = splitAt(ms, iso);
    expect(before).toHaveLength(3);
    const [row] = comparePeriods([METRIC_BY_KEY.goals], before, after);
    expect(row.better).toBe(true);
  });
  it("goal targets and evaluation", () => {
    expect(goalTarget("passAccuracy", 80, "up", 3)).toBe(83);
    expect(goalTarget("assists", 0.5, "up", 0.2)).toBeCloseTo(0.6);
    const since = [m({ passesAttempted: 30, passesCompleted: 26 }), m({ passesAttempted: 30, passesCompleted: 26 }), m({ passesAttempted: 30, passesCompleted: 26 })];
    const r = evaluateGoal({ id: "g", text: "x", metric: "passAccuracy", target: 83, direction: "up", done: false }, { passAccuracy: 80 }, since)!;
    expect(r.status).toBe("atingido");
    expect(evaluateGoal({ id: "g", text: "autoavaliação", done: false }, {}, since)).toBeNull();
  });
  it("achievements only for real current records", () => {
    const ms = Array.from({ length: 14 }, (_, i) => m({ assists: i >= 9 ? 2 : 0, goals: 0 }));
    const a = achievements(ms).map((x) => x.id);
    expect(a).toContain("best10-assists");
    expect(a).toContain("ga-streak");
    expect(achievements([]).length).toBe(0);
  });
});

describe("EA mapper — fields used by the Lab", async () => {
  const { mapPlayer } = await import("@/integrations/ea-fc/mapper");
  it("reads tackle attempts, archetype id and goalkeeper save types (FC 27 payload)", () => {
    const l = mapPlayer("x", { playername: "orlandkc", goals: 1, tacklesmade: 2, tackleattempts: 5, archetypeid: 10, reflexSaves: 3, passattempts: 6, passesmade: 5 });
    expect(l.tackles).toBe(2);
    expect(l.tacklesAttempted).toBe(5);
    expect(l.extra).toEqual({ archetypeId: 10, reflexSaves: 3 });
  });
  it("drops inconsistent tackle attempts instead of storing a wrong number", () => {
    const l = mapPlayer("x", { tacklesmade: 4, tackleattempts: 2 });
    expect(l.tackles).toBe(4);
    expect(l.tacklesAttempted).toBeNull();
  });
});
