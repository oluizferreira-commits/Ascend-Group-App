import { describe, expect, it } from "vitest";
import { applicationSchema, contactLinks } from "@/lib/validation/application";

const base = { fullName: "Fulano de Tal", age: "20", eaName: "Fulano10", platform: "ps5", primaryPosition: "ST", consent: "on" };

describe("Seja do Ascend validation", () => {
  it("requires at least one contact", () => {
    expect(applicationSchema.safeParse(base).success).toBe(false);
    expect(applicationSchema.safeParse({ ...base, contactDiscord: "fulano" }).success).toBe(true);
  });
  it("requires consent", () => {
    const { consent: _c, ...noConsent } = base;
    void _c;
    expect(applicationSchema.safeParse({ ...noConsent, contactDiscord: "x" }).success).toBe(false);
  });
  it("normalises WhatsApp and Instagram", () => {
    const r = applicationSchema.parse({ ...base, contactWhatsapp: "(11) 91234-5678", contactInstagram: "@ascend.cf" });
    expect(r.contactWhatsapp).toBe("11912345678");
    expect(r.contactInstagram).toBe("ascend.cf");
    expect(contactLinks({ ...r, contactEmail: null }).whatsapp).toBe("https://wa.me/5511912345678");
  });
  it("requires guardian consent under 18 and a minimum age of 13", () => {
    expect(applicationSchema.safeParse({ ...base, contactDiscord: "x", age: "16" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...base, contactDiscord: "x", age: "16", guardianConsent: "on" }).success).toBe(true);
    expect(applicationSchema.safeParse({ ...base, contactDiscord: "x", age: "12", guardianConsent: "on" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...base, contactDiscord: "x", age: "" }).success).toBe(false);
  });
  it("rejects bad links and ranges", () => {
    expect(applicationSchema.safeParse({ ...base, contactDiscord: "x", videoUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...base, contactDiscord: "x", overall: "150" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...base, contactWhatsapp: "123" }).success).toBe(false);
  });
});

import { playerSchema } from "@/lib/validation/player";

describe("player avatar", () => {
  const base = { fullName: "A B", nickname: "ab", primaryPosition: "ST", status: "available", secondaryPositions: [], userId: "" };
  it("accepts https and internal application photos, rejects others", () => {
    expect(playerSchema.safeParse({ ...base, avatarUrl: "https://example.com/a.png" }).success).toBe(true);
    expect(playerSchema.safeParse({ ...base, avatarUrl: "/api/propostas/0f9a1c2e-1234-4abc-9def-0123456789ab/foto" }).success).toBe(true);
    expect(playerSchema.safeParse({ ...base, avatarUrl: "/etc/passwd" }).success).toBe(false);
    expect(playerSchema.safeParse({ ...base, avatarUrl: "http://example.com/a.png" }).success).toBe(false);
  });
});
