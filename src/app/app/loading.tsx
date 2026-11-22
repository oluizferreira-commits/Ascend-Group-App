/** Instant skeleton while a page streams in — navigation never feels frozen. */
export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <div className="h-3 w-28 rounded bg-ink-800" />
        <div className="h-10 w-64 rounded bg-ink-800" />
      </div>
      <div className="h-40 rounded-lg bg-ink-800/80" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-lg bg-ink-800/70" />)}
      </div>
      <div className="h-64 rounded-lg bg-ink-800/60" />
    </div>
  );
}
