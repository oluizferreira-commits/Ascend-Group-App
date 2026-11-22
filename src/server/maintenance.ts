import "server-only";
import { lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { purgeExpiredApplications } from "./actions/recruitment";

let lastRun = 0;

/** Data-retention housekeeping promised in /privacidade. Runs at most every 6 h per instance; never throws. */
export async function runRetention() {
  if (Date.now() - lastRun < 6 * 3600_000) return;
  lastRun = Date.now();
  try {
    await purgeExpiredApplications();
    await db.delete(schema.loginAttempts).where(lt(schema.loginAttempts.createdAt, new Date(Date.now() - 30 * 86400_000)));
    await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
    await db.delete(schema.passwordResetTokens).where(lt(schema.passwordResetTokens.expiresAt, new Date(Date.now() - 86400_000)));
  } catch (e) {
    console.error("[retention] failed", e);
  }
}
