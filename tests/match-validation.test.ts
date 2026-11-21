import { describe, expect, it } from "vitest";
import { matchSchema, sheetSchema, validateSheetAgainstScore, type SheetRow } from "@/lib/validation/match";

const row = (o: Partial<SheetRow> = {}): SheetRow => ({
  playerId: crypto.randomUUID(), role: "starter", position: null, isCaptain: false, minutesPlayed: null,
  goals: 0, assists: 0, shots: null, shotsOnTarget: null, passesAttempted: null, passesCompleted: null,
  tackles: null, interceptions: null, clearances: null, saves: null, goalsConceded: null, cleanSheet: null,
  yellowCards: null, redCards: null, externalRating: null, isMotm: null, ...o,
});

describe("match validation", () => {
  it("requires a score for finished matches", () => {
    const r = matchSchema.safeParse({ opponentName: "X", kickoff: "2026-11-20T21:00", status: "finished", goalsFor: "", goalsAgainst: "" });
    expect(r.success).toBe(false);
    const ok = matchSchema.safeParse({ opponentName: "X", kickoff: "2026-11-20T21:00", status: "scheduled", goalsFor: "", goalsAgainst: "" });
    expect(ok.success).toBe(true);
  });
  it("rejects player goals above the club score", () => {
    expect(validateSheetAgainstScore([row({ goals: 2 }), row({ goals: 1 })], 2)).toHaveLength(1);
    expect(validateSheetAgainstScore([row({ goals: 2, assists: 1 })], 2)).toHaveLength(0);
    expect(validateSheetAgainstScore([row({ goals: 1 })], null)).toHaveLength(1);
  });
  it("rejects inconsistent rows and duplicates", () => {
    expect(sheetSchema.safeParse([row({ shots: 2, shotsOnTarget: 3 })]).success).toBe(false);
    const id = crypto.randomUUID();
    expect(sheetSchema.safeParse([row({ playerId: id }), row({ playerId: id })]).success).toBe(false);
    expect(sheetSchema.safeParse([row({ isCaptain: true }), row({ isCaptain: true })]).success).toBe(false);
    expect(sheetSchema.safeParse([row({ role: "unused", goals: 1 })]).success).toBe(false);
  });
});
