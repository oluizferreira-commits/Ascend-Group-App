const TZ = "America/Sao_Paulo";
export const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));
export const fmtDateTime = (d: Date | string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
export const fmtWeekdayTime = (d: Date | string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
export const fmtNum = (n: number | null | undefined, digits = 0) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const fmtPct = (n: number | null | undefined) => (n == null ? "—" : `${fmtNum(n, 1)}%`);
/** Value for <input type="datetime-local"> in São Paulo time. */
export function toLocalInput(d: Date) {
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
  return parts.replace(" ", "T");
}
/** Parses <input type="datetime-local"> as São Paulo time (UTC−03:00, no DST since 2019). */
export function parseLocalInput(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
