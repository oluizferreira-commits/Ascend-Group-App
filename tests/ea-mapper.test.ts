import { describe, expect, it } from "vitest";
import fixture from "./fixtures/ea-matches.synthetic.json";
import { eaMatchListSchema } from "@/integrations/ea-fc/types";
import { mapMatch } from "@/integrations/ea-fc/mapper";

const matches = eaMatchListSchema.parse(fixture);

describe("EA mapper", () => {
  it("maps score, opponent and result from our club's perspective", () => {
    const r = mapMatch(matches[0], "111");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.match).toMatchObject({ externalId: "900001", opponentName: "Rival Teste", goalsFor: 3, goalsAgainst: 1, result: "W" });
    expect(r.match.kickoffAt.toISOString()).toBe(new Date(1795300000 * 1000).toISOString());
  });
  it("maps player stats and leaves unavailable metrics as null", () => {
    const r = mapMatch(matches[0], "111");
    if (!r.ok) throw new Error();
    const st = r.match.players.find((p) => p.eaName === "TesteST")!;
    expect(st).toMatchObject({ goals: 2, shots: 5, passesCompleted: 10, passesAttempted: 14, externalRating: 8.7, isMotm: true, redCards: 0 });
    expect(st.shotsOnTarget).toBeNull();
    expect(st.interceptions).toBeNull();
    expect(st.yellowCards).toBeNull();
  });
  it("drops inconsistent pass numbers instead of storing them", () => {
    const r = mapMatch(matches[0], "111");
    if (!r.ok) throw new Error();
    const cm = r.match.players.find((p) => p.eaName === "TesteCM")!;
    expect(cm.passesCompleted).toBeNull();
    expect(cm.passesAttempted).toBeNull();
  });
  it("rejects matches that do not involve the configured club", () => {
    expect(mapMatch(matches[2], "111")).toEqual({ ok: false, reason: "partida não envolve o clube configurado" });
  });
});

import fc27 from "./fixtures/ea-match.fc27.anonymized.json";

describe("EA mapper — real FC 27 format (anonymized sample)", () => {
  const [m] = eaMatchListSchema.parse(fc27);
  it("parses and maps the FC 27 response shape", () => {
    const r = mapMatch(m, "1000001");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.match.opponentName).toBe("Clube B");
    expect(r.match.goalsFor).toBeGreaterThanOrEqual(0);
    expect(r.match.players.length).toBeGreaterThan(0);
    for (const p of r.match.players) {
      expect(p.eaName).toMatch(/^Jogador\d+$/);
      expect(p.externalRating === null || (p.externalRating >= 0 && p.externalRating <= 10)).toBe(true);
      expect(p.minutesPlayed === null || p.minutesPlayed <= 130).toBe(true);
    }
    expect(r.match.players.reduce((a, p) => a + p.goals, 0)).toBeLessThanOrEqual(r.match.goalsFor);
  });
});
