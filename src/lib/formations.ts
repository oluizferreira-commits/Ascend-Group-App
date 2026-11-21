import type { Position } from "./domain";

export type Slot = { key: string; label: string; position: Position; x: number; y: number };
export type FormationDef = { code: string; name: string; slots: Slot[] };

// x: 0 (left) → 100 (right); y: 0 (own goal) → 100 (opponent goal).
const gk: Slot = { key: "GK", label: "GOL", position: "GK", x: 50, y: 6 };
const s = (key: string, position: Position, x: number, y: number, label = key): Slot => ({ key, label, position, x, y });

export const BUILT_IN_FORMATIONS: FormationDef[] = [
  {
    code: "4-3-3",
    name: "4-3-3",
    slots: [gk, s("LB", "LB", 12, 28, "LE"), s("LCB", "CB", 36, 22, "ZAG"), s("RCB", "CB", 64, 22, "ZAG"), s("RB", "RB", 88, 28, "LD"),
      s("LCM", "CM", 28, 50, "MC"), s("CDM", "CDM", 50, 42, "VOL"), s("RCM", "CM", 72, 50, "MC"),
      s("LW", "LW", 16, 78, "PE"), s("ST", "ST", 50, 84, "ATA"), s("RW", "RW", 84, 78, "PD")],
  },
  {
    code: "4-2-3-1",
    name: "4-2-3-1",
    slots: [gk, s("LB", "LB", 12, 28, "LE"), s("LCB", "CB", 36, 22, "ZAG"), s("RCB", "CB", 64, 22, "ZAG"), s("RB", "RB", 88, 28, "LD"),
      s("LDM", "CDM", 36, 42, "VOL"), s("RDM", "CDM", 64, 42, "VOL"),
      s("LM", "LM", 16, 64, "ME"), s("CAM", "CAM", 50, 64, "MEI"), s("RM", "RM", 84, 64, "MD"), s("ST", "ST", 50, 86, "ATA")],
  },
  {
    code: "4-4-2",
    name: "4-4-2",
    slots: [gk, s("LB", "LB", 12, 28, "LE"), s("LCB", "CB", 36, 22, "ZAG"), s("RCB", "CB", 64, 22, "ZAG"), s("RB", "RB", 88, 28, "LD"),
      s("LM", "LM", 14, 54, "ME"), s("LCM", "CM", 38, 50, "MC"), s("RCM", "CM", 62, 50, "MC"), s("RM", "RM", 86, 54, "MD"),
      s("LST", "ST", 38, 82, "ATA"), s("RST", "ST", 62, 82, "ATA")],
  },
  {
    code: "4-1-2-1-2",
    name: "4-1-2-1-2",
    slots: [gk, s("LB", "LB", 12, 28, "LE"), s("LCB", "CB", 36, 22, "ZAG"), s("RCB", "CB", 64, 22, "ZAG"), s("RB", "RB", 88, 28, "LD"),
      s("CDM", "CDM", 50, 40, "VOL"), s("LCM", "CM", 30, 54, "MC"), s("RCM", "CM", 70, 54, "MC"), s("CAM", "CAM", 50, 66, "MEI"),
      s("LST", "ST", 38, 84, "ATA"), s("RST", "ST", 62, 84, "ATA")],
  },
  {
    code: "3-5-2",
    name: "3-5-2",
    slots: [gk, s("LCB", "CB", 28, 22, "ZAG"), s("CB", "CB", 50, 20, "ZAG"), s("RCB", "CB", 72, 22, "ZAG"),
      s("LWB", "LWB", 10, 52, "ALE"), s("LDM", "CDM", 36, 44, "VOL"), s("RDM", "CDM", 64, 44, "VOL"), s("RWB", "RWB", 90, 52, "ALD"),
      s("CAM", "CAM", 50, 64, "MEI"), s("LST", "ST", 38, 84, "ATA"), s("RST", "ST", 62, 84, "ATA")],
  },
  {
    code: "5-3-2",
    name: "5-3-2",
    slots: [gk, s("LWB", "LWB", 10, 34, "ALE"), s("LCB", "CB", 30, 22, "ZAG"), s("CB", "CB", 50, 20, "ZAG"), s("RCB", "CB", 70, 22, "ZAG"), s("RWB", "RWB", 90, 34, "ALD"),
      s("LCM", "CM", 28, 52, "MC"), s("CM", "CM", 50, 48, "MC"), s("RCM", "CM", 72, 52, "MC"),
      s("LST", "ST", 38, 82, "ATA"), s("RST", "ST", 62, 82, "ATA")],
  },
];
