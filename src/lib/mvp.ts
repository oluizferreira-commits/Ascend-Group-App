/** Rules for the "craque da partida" fan vote (pure). */
export const MVP_WINDOW_HOURS = 48;

export function mvpWindow(kickoffAt: Date, createdAt: Date) {
  const start = new Date(Math.max(kickoffAt.getTime(), createdAt.getTime()));
  return { closesAt: new Date(start.getTime() + MVP_WINDOW_HOURS * 3600_000) };
}

export function tally(votes: { playerId: string }[]) {
  const counts = new Map<string, number>();
  for (const v of votes) counts.set(v.playerId, (counts.get(v.playerId) ?? 0) + 1);
  const max = Math.max(0, ...counts.values());
  const winners = max > 0 ? [...counts.entries()].filter(([, n]) => n === max).map(([id]) => id) : [];
  return { counts, total: votes.length, winners };
}
