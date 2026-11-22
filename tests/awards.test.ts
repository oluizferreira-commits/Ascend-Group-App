import { describe, expect, it } from "vitest";
import { editionStatus, goldEditionFor, pickWinner, plannedEditions, silverEditionFor, sp } from "@/lib/awards";

describe("award schedule (São Paulo time)", () => {
  it("first Bola de Prata: week 22–28/11, voting Sat 28 12:00 → Sun 29 23:59", () => {
    const e = silverEditionFor(sp(2026, 10, 24, 15)); // Tue 24/11
    expect(e.periodStart).toBe("2026-11-22");
    expect(e.periodEnd).toBe("2026-11-28");
    expect(e.label).toBe("Semana de 22/11 a 28/11/2026");
    expect(e.votingOpensAt.toISOString()).toBe("2026-11-28T15:00:00.000Z");
    expect(e.votingClosesAt.toISOString()).toBe("2026-11-30T02:59:59.000Z");
  });
  it("Saturday night still belongs to the same week", () => {
    expect(silverEditionFor(sp(2026, 10, 28, 23, 30)).periodStart).toBe("2026-11-22");
    expect(silverEditionFor(sp(2026, 10, 29, 0, 30)).periodStart).toBe("2026-11-29");
  });
  it("first Bola de Ouro: November 2026, voting 1–3 December", () => {
    const e = goldEditionFor(2026, 10);
    expect(e.label).toBe("Novembro de 2026");
    expect(e.periodEnd).toBe("2026-11-30");
    expect(e.votingOpensAt.toISOString()).toBe("2026-12-01T03:00:00.000Z");
    expect(e.votingClosesAt.toISOString()).toBe("2026-12-04T02:59:59.000Z");
    expect(goldEditionFor(2026, 11).votingOpensAt.toISOString()).toBe("2027-01-01T03:00:00.000Z"); // year rollover
  });
  it("plans nothing before the start dates", () => {
    const plans = plannedEditions(sp(2026, 10, 23, 10));
    expect(plans.filter((p) => p.kind === "silver").map((p) => p.periodStart)).toEqual(["2026-11-22"]);
    expect(plans.filter((p) => p.kind === "gold").map((p) => p.periodStart)).toEqual(["2026-11-01"]);
  });
  it("status and winner with tie-breaks", () => {
    const e = { votingOpensAt: new Date(2000), votingClosesAt: new Date(3000), finalizedAt: null };
    expect(editionStatus(e, new Date(1000))).toBe("upcoming");
    expect(editionStatus(e, new Date(2500))).toBe("open");
    expect(editionStatus(e, new Date(3500))).toBe("closed");
    expect(pickWinner([{ playerId: "a", votes: 0, avgRating: 9, involvements: 9 }])).toBeNull();
    const w = pickWinner([
      { playerId: "a", votes: 3, avgRating: 7.1, involvements: 2 },
      { playerId: "b", votes: 3, avgRating: 7.8, involvements: 1 },
      { playerId: "c", votes: 1, avgRating: 9.9, involvements: 9 },
    ]);
    expect(w?.playerId).toBe("b");
  });
});
