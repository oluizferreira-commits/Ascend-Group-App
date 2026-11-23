/**
 * AP engine tests. The tables below are SYNTHETIC fixtures that exist only to exercise the maths —
 * they are not game data and are never shipped to the app.
 */
import { describe, expect, it } from "vitest";
import {
  changeLevel, changeLevels, costBetween, evaluateBuild, levelBudget, modifiersFor, optimize, stepCost, tableTemplate, validateTable,
  EngineError, type CostTable, type CostTableData,
} from "@/lib/lab/ap-engine";
import { ATTR_KEYS, type AttrKey } from "@/lib/lab/game-data";

/** Full table: every attribute base 60, cap 90, progressive costs 1 per step up to 70, 2 up to 80, 3 up to 90. */
function fixture(over: Partial<Record<AttrKey, { base: number; max: number; costs: number[] }>> = {}, budget: Record<string, number> = { "10": 40, "20": 80, "30": 120 }): CostTableData {
  const prog = (base: number, max: number) => Array.from({ length: max - base }, (_, i) => (base + i < 70 ? 1 : base + i < 80 ? 2 : 3));
  return {
    attrs: Object.fromEntries(ATTR_KEYS.map((k) => [k, over[k] ?? { base: 60, max: 90, costs: prog(60, 90) }])) as CostTableData["attrs"],
    levelBudget: budget,
    modifiers: { heightCm: [{ min: 150, max: 175, deltas: { agility: 4, strength: -3 } }, { min: 176, max: 210, deltas: { strength: 3, agility: -2 } }], weightKg: [{ min: 85, max: 120, deltas: { sprintSpeed: -2 } }] },
  };
}
const table = (data: CostTableData, status: CostTable["status"] = "verified"): CostTable =>
  ({ id: "t", gameVersion: "TEST", season: "S1", archetype: "X", revision: 1, status, source: "fixture", verifiedOn: "2026-11-23", data });

describe("costs", () => {
  it("sums every increment from the table (Visão 80→83)", () => {
    const t = fixture({ vision: { base: 60, max: 90, costs: Array.from({ length: 30 }, (_, i) => i + 1) } });
    // costs[k] = k+1 for value 60+k → 80→81 is costs[20]=21, 81→82=22, 82→83=23
    expect(stepCost(t, "vision", 80)).toBe(21);
    expect(costBetween(t, "vision", 80, 83)).toBe(21 + 22 + 23);
  });
  it("progressive costs: later levels cost more", () => {
    const t = fixture();
    expect(costBetween(t, "finishing", 60, 70)).toBe(10);
    expect(costBetween(t, "finishing", 70, 80)).toBe(20);
    expect(costBetween(t, "finishing", 80, 90)).toBe(30);
  });
  it("different archetypes pay different costs for the same attribute", () => {
    const finisher = fixture({ finishing: { base: 70, max: 95, costs: Array(25).fill(1) } });
    const creator = fixture({ finishing: { base: 55, max: 85, costs: Array(30).fill(4) } });
    expect(costBetween(finisher, "finishing", 75, 80)).toBe(5);
    expect(costBetween(creator, "finishing", 75, 80)).toBe(20);
  });
  it("refund is exactly the cost of removed levels", () => {
    const t = fixture();
    expect(costBetween(t, "vision", 83, 66)).toBe(-costBetween(t, "vision", 66, 83));
  });
  it("never reads outside the table", () => {
    const t = fixture();
    expect(() => stepCost(t, "vision", 90)).toThrow(EngineError);
    expect(() => costBetween(t, "vision", 59, 61)).toThrow(/fora da faixa/);
  });
});

describe("buying and removing", () => {
  const T = table(fixture());
  const empty = { level: 10, purchases: {} };
  it("buys and refunds exactly", () => {
    const a = changeLevels(T, empty, "vision", 12); // 60→72: 10×1 + 2×2 = 14
    expect(a.apDelta).toBe(14);
    expect(evaluateBuild(T, a.build).spent).toBe(14);
    const b = changeLevels(T, a.build, "vision", -3); // 72→69: refund 2+2+1 = 5
    expect(b.apDelta).toBe(-5);
    expect(evaluateBuild(T, b.build).spent).toBe(9);
    const c = changeLevels(T, b.build, "vision", -9);
    expect(evaluateBuild(T, c.build).spent).toBe(0);
  });
  it("blocks the archetype cap and going below base", () => {
    const capped = { level: 30, purchases: { vision: 30 } };
    expect(() => changeLevels(T, capped, "vision", 1)).toThrow(/limite do arquétipo/);
    expect(() => changeLevels(T, empty, "vision", -1)).toThrow(/valor base/);
  });
  it("blocks purchases beyond the available points", () => {
    // level 10 budget 40: 60→80 costs 10 + 20 = 30; another 5 levels (80→85) cost 15 → 45 > 40
    const b = changeLevels(T, empty, "finishing", 20).build;
    expect(() => changeLevels(T, b, "finishing", 5)).toThrow(/faltam 5 AP/);
    expect(changeLevels(T, b, "finishing", 3).apDelta).toBe(9);
  });
});

describe("evaluation and validation", () => {
  it("reports insufficient budget and is not validated", () => {
    const ev = evaluateBuild(table(fixture()), { level: 10, purchases: { finishing: 30 } }); // 60 AP > 40
    expect(ev.spent).toBe(60);
    expect(ev.remaining).toBe(-20);
    expect(ev.issues.some((i) => i.code === "over_budget")).toBe(true);
    expect(ev.validated).toBe(false);
  });
  it("changing level re-checks the same purchases against the new budget", () => {
    const T = table(fixture());
    const b = { level: 10, purchases: { finishing: 30 } };
    expect(changeLevel(T, b, 20).evaluation.validated).toBe(true); // 60 ≤ 80
    expect(changeLevel(T, b, 10).evaluation.validated).toBe(false);
    expect(changeLevel(T, b, 15).evaluation.budget).toBeNull(); // no verified value → never extrapolated
    expect(levelBudget(fixture(), 15)).toBeNull();
  });
  it("height and weight change displayed values, never purchases or cost", () => {
    const T = table(fixture());
    const short = evaluateBuild(T, { level: 30, heightCm: 170, weightKg: 70, purchases: { agility: 10 } });
    const tall = evaluateBuild(T, { level: 30, heightCm: 190, weightKg: 90, purchases: { agility: 10 } });
    const ag = (e: typeof short) => e.lines.find((l) => l.attr === "agility")!;
    expect(ag(short).purchased).toBe(10);
    expect(ag(tall).purchased).toBe(10);
    expect(ag(short).cost).toBe(ag(tall).cost);
    expect(ag(short).displayed).toBe(74); // 70 + 4
    expect(ag(tall).displayed).toBe(68); // 70 − 2
    expect(short.spent).toBe(tall.spent);
    expect(modifiersFor(fixture(), { heightCm: 190, weightKg: 90 })).toEqual({ strength: 3, agility: -2, sprintSpeed: -2 });
    expect(modifiersFor({ attrs: {}, levelBudget: {} }, { heightCm: 190 })).toEqual({}); // no declared rule → no modifier
  });
  it("only a verified, complete table validates", () => {
    const b = { level: 20, purchases: { vision: 5 } };
    expect(evaluateBuild(table(fixture()), b).validated).toBe(true);
    expect(evaluateBuild(table(fixture(), "draft"), b).validated).toBe(false);
    const partial = fixture(); delete partial.attrs.gkDiving;
    const ev = evaluateBuild(table(partial), b);
    expect(ev.validated).toBe(false);
    expect(ev.reasons.join(" ")).toMatch(/não cobre todos/);
  });
});

describe("table updates", () => {
  it("validates structure on import", () => {
    expect(validateTable(fixture()).filter((i) => i.level === "error")).toEqual([]);
    const bad = fixture({ vision: { base: 60, max: 90, costs: [1, 2] } });
    expect(validateTable(bad).some((i) => i.code === "costs_length" && i.attr === "vision")).toBe(true);
    const neg = fixture({ vision: { base: 60, max: 62, costs: [1, -1] } });
    expect(validateTable(neg).some((i) => i.code === "bad_cost")).toBe(true);
    expect(validateTable(tableTemplate()).some((i) => i.code === "bad_range")).toBe(true); // template must be filled before use
    expect(validateTable({ attrs: {}, levelBudget: {} }).some((i) => i.code === "no_budget")).toBe(true);
  });
  it("a new revision does not change results of builds tied to the old one", () => {
    const v1 = table(fixture());
    const build = { level: 20, purchases: { vision: 15 } };
    const before = evaluateBuild(v1, build);
    const v2 = { ...v1, id: "t2", revision: 2, data: fixture({ vision: { base: 60, max: 90, costs: Array(30).fill(5) } }) };
    expect(evaluateBuild(v2, build).spent).not.toBe(before.spent);
    expect(evaluateBuild(v1, build)).toEqual(before); // old build keeps its table and its numbers
  });
});

describe("optimizer", () => {
  it("respects the budget exactly and follows the cost curve (no fixed percentages)", () => {
    const T = table(fixture());
    const r = optimize({ table: T, level: 10, weights: { vision: 3, shortPassing: 2 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.evaluation.spent).toBeLessThanOrEqual(40);
    expect(r.evaluation.validated).toBe(true);
    // vision (w3) and shortPassing (w2): cheap levels 60→70 cost 1 each → both get them; then vision 2-cost levels.
    expect(r.build.purchases.vision).toBe(20);   // 10 + 20 = 30 AP
    expect(r.build.purchases.shortPassing).toBe(10); // 10 AP → total 40
  });
  it("finds the true optimum where a greedy choice would fail", () => {
    // Budget 40. Vision: 1 level for 25 AP (weight 3 → 0.12/AP). Curve: 2 levels for 20 AP each (weight 2 → 0.10/AP).
    // Greedy by value/AP buys Vision (25) and can't afford Curve → utility 3. Optimum: Curve ×2 = 40 AP → utility 4.
    const data = fixture({ vision: { base: 60, max: 61, costs: [25] }, curve: { base: 60, max: 62, costs: [20, 20] } });
    const r = optimize({ table: table(data), level: 10, weights: { vision: 3, curve: 2 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.build.purchases.vision).toBeUndefined();
    expect(r.build.purchases.curve).toBe(2);
    expect(r.utility).toBe(4);
    expect(r.evaluation.spent).toBe(40);
  });
  it("honours minimums and refuses impossible ones", () => {
    const T = table(fixture());
    const r = optimize({ table: T, level: 10, weights: { vision: 1 }, minimums: { finishing: 75 } });
    expect(r.ok && r.build.purchases.finishing).toBeGreaterThanOrEqual(15);
    expect(optimize({ table: T, level: 10, weights: {}, minimums: { finishing: 90 } }).ok).toBe(false); // 60 AP > 40
    expect(optimize({ table: T, level: 15, weights: { vision: 1 } }).ok).toBe(false); // no verified budget
  });
  it("is not reported as validated on a draft table", () => {
    const r = optimize({ table: table(fixture(), "draft"), level: 10, weights: { vision: 1 } });
    expect(r.ok && r.evaluation.validated).toBe(false);
  });
});
