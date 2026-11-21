import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/** Constant-time check of an `Authorization: Bearer <token>` header against a secret. */
export function bearerMatches(header: string | null, secret: string | undefined) {
  if (!secret || secret.length < 24 || !header?.startsWith("Bearer ")) return false;
  const a = createHash("sha256").update(header.slice(7)).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}
