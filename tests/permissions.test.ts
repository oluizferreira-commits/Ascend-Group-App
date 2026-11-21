import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS, ROLES, canManageRole, permissionsForRoles } from "@/server/auth/permissions";

describe("RBAC", () => {
  it("gives the president every permission", () => {
    expect(permissionsForRoles(["president"]).size).toBe(ALL_PERMISSIONS.length);
  });
  it("visitors get nothing inside the app", () => {
    expect(permissionsForRoles(["visitor"]).size).toBe(0);
  });
  it("players can read but not manage", () => {
    const p = permissionsForRoles(["player"]);
    expect(p.has("players.view")).toBe(true);
    expect(p.has("players.manage")).toBe(false);
    expect(p.has("availability.self")).toBe(true);
  });
  it("unions permissions across roles", () => {
    const p = permissionsForRoles(["player", "analyst"]);
    expect(p.has("stats.manage")).toBe(true);
    expect(p.has("availability.self")).toBe(true);
  });
  it("only the president manages president/admin roles", () => {
    expect(canManageRole(["president"], "admin")).toBe(true);
    expect(canManageRole(["admin"], "admin")).toBe(false);
    expect(canManageRole(["admin"], "president")).toBe(false);
    expect(canManageRole(["admin"], "coach")).toBe(true);
    expect(canManageRole(["coach"], "player")).toBe(false);
  });
  it("ranks are strictly ordered", () => {
    const ranks = Object.values(ROLES).map((r) => r.rank);
    expect(new Set(ranks).size).toBe(ranks.length);
  });
});

import { checkRoleChange } from "@/server/auth/permissions";

describe("checkRoleChange", () => {
  const base = { isSelf: false, presidentCount: 2 };
  it("blocks self changes", () => {
    expect(checkRoleChange({ ...base, actorRoles: ["president"], targetRoles: ["president"], newRoles: [], isSelf: true })).not.toBeNull();
  });
  it("keeps at least one president", () => {
    expect(checkRoleChange({ ...base, presidentCount: 1, actorRoles: ["president"], targetRoles: ["president"], newRoles: ["admin"] })).not.toBeNull();
    expect(checkRoleChange({ ...base, actorRoles: ["president"], targetRoles: ["president"], newRoles: ["admin"] })).toBeNull();
  });
  it("lets admins manage coaching staff and players only", () => {
    expect(checkRoleChange({ ...base, actorRoles: ["admin"], targetRoles: ["player"], newRoles: ["player", "coach"] })).toBeNull();
    expect(checkRoleChange({ ...base, actorRoles: ["admin"], targetRoles: ["player"], newRoles: ["admin"] })).not.toBeNull();
    expect(checkRoleChange({ ...base, actorRoles: ["admin"], targetRoles: ["admin"], newRoles: ["player"] })).not.toBeNull();
  });
  it("denies users without users.manage", () => {
    expect(checkRoleChange({ ...base, actorRoles: ["coach"], targetRoles: ["player"], newRoles: ["analyst"] })).not.toBeNull();
  });
});
