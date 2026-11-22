import { describe, expect, it } from "vitest";
import { MVP_WINDOW_HOURS, mvpWindow, tally } from "@/lib/mvp";

describe("mvp vote rules", () => {
  it("window starts at the later of kickoff and import time", () => {
    const k = new Date("2026-11-20T21:00:00Z"), imported = new Date("2026-11-21T10:00:00Z");
    expect(mvpWindow(k, imported).closesAt.getTime()).toBe(imported.getTime() + MVP_WINDOW_HOURS * 3600_000);
    expect(mvpWindow(imported, k).closesAt.getTime()).toBe(imported.getTime() + MVP_WINDOW_HOURS * 3600_000);
  });
  it("tallies and reports ties", () => {
    expect(tally([]).winners).toEqual([]);
    const t = tally([{ playerId: "a" }, { playerId: "b" }, { playerId: "a" }, { playerId: "b" }]);
    expect(t.total).toBe(4);
    expect(t.winners.sort()).toEqual(["a", "b"]);
  });
});
