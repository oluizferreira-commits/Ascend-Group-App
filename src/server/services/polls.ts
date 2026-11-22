import "server-only";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";

export type PollView = { question: string; options: string[]; counts: number[]; total: number; myVote: number | null };

export async function pollsFor(announcementIds: string[], userId: string | null) {
  const out = new Map<string, PollView>();
  if (!announcementIds.length) return out;
  const [polls, votes] = await Promise.all([
    db.select().from(schema.announcementPolls).where(inArray(schema.announcementPolls.announcementId, announcementIds)),
    db.select().from(schema.pollVotes).where(inArray(schema.pollVotes.announcementId, announcementIds)),
  ]);
  for (const p of polls) {
    const vs = votes.filter((v) => v.announcementId === p.announcementId);
    const counts = p.options.map((_, i) => vs.filter((v) => v.optionIndex === i).length);
    out.set(p.announcementId, { question: p.question, options: p.options, counts, total: vs.length, myVote: userId ? vs.find((v) => v.userId === userId)?.optionIndex ?? null : null });
  }
  return out;
}
