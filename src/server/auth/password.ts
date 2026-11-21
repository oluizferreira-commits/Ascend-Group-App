import "server-only";
import { hash, verify } from "@node-rs/argon2";

// OWASP-recommended argon2id parameters (m=19 MiB, t=2, p=1).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string) {
  return hash(password, OPTIONS);
}

export async function verifyPassword(hashed: string, password: string) {
  try {
    return await verify(hashed, password);
  } catch {
    return false;
  }
}

// Hash of a random secret, computed once, so that logins for unknown e-mails
// still spend the same time verifying a password (prevents user enumeration).
let dummy: Promise<string> | null = null;
export function dummyHash() {
  dummy ??= hash(crypto.randomUUID(), OPTIONS);
  return dummy;
}
