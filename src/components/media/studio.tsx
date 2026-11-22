"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";

type Opt = { id: string; label: string };
type Props = {
  templates: Record<string, { label: string; source: string }>;
  formats: Record<string, { label: string }>;
  sources: Record<string, Opt[]>;
  initial: { template?: string; match?: string; lineup?: string; event?: string; player?: string; season?: string };
};
const SOURCE_LABEL: Record<string, string> = { match: "Partida", lineup: "Escalação", event: "Evento / convocação", player: "Jogador", season: "Temporada" };

export function MediaStudio({ templates, formats, sources, initial }: Props) {
  const [template, setTemplate] = useState(initial.template && templates[initial.template] ? initial.template : "result");
  const [format, setFormat] = useState("feed");
  const src = templates[template].source;
  const [sel, setSel] = useState<Record<string, string>>({
    match: initial.match ?? sources.match[0]?.id ?? "", lineup: initial.lineup ?? sources.lineup[0]?.id ?? "",
    event: initial.event ?? sources.event[0]?.id ?? "", player: initial.player ?? sources.player[0]?.id ?? "", season: initial.season ?? "",
  });
  const url = useMemo(() => {
    const q = new URLSearchParams({ format });
    if (sel[src]) q.set(src, sel[src]);
    return `/api/media/${template}?${q}`;
  }, [template, format, src, sel]);
  const [result, setResult] = useState<{ url: string; error: string | null; blob: string | null } | null>(null);
  const state = result?.url === url ? { loading: false, ...result } : { loading: true, error: null, blob: null };

  useEffect(() => {
    let cancel = false;
    let objectUrl: string | null = null;
    fetch(url).then(async (r) => {
      if (cancel) return;
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setResult({ url, error: j.error ?? "Não foi possível gerar a arte.", blob: null });
        return;
      }
      objectUrl = URL.createObjectURL(await r.blob());
      if (!cancel) setResult({ url, error: null, blob: objectUrl });
    }).catch(() => { if (!cancel) setResult({ url, error: "Falha de conexão.", blob: null }); });
    return () => { cancel = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url]);

  const opts = sources[src] ?? [];
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="card h-fit space-y-4 p-5">
        <label className="block text-sm"><span className="label">Modelo</span>
          <select value={template} onChange={(e) => setTemplate(e.target.value)} className="input">
            {Object.entries(templates).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label className="block text-sm"><span className="label">{SOURCE_LABEL[src]}</span>
          <select value={sel[src]} onChange={(e) => setSel((s) => ({ ...s, [src]: e.target.value }))} className="input">
            {src === "season" && <option value="">Temporada atual</option>}
            {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          {src !== "season" && opts.length === 0 && <span className="mt-1 block text-xs text-ink-400">Nenhum item cadastrado.</span>}
        </label>
        <label className="block text-sm"><span className="label">Formato</span>
          <select value={format} onChange={(e) => setFormat(e.target.value)} className="input">
            {Object.entries(formats).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <a href={`${url}&download=1`} className={state.blob ? "btn-primary w-full" : "btn-primary pointer-events-none w-full opacity-50"} aria-disabled={!state.blob}>
          <Download className="size-4" />Baixar PNG
        </a>
        <p className="text-xs text-ink-400">As artes usam o escudo oficial e somente dados registrados na plataforma.</p>
      </div>
      <div className="card grid min-h-96 place-items-center p-4">
        {state.loading ? <Loader2 className="size-8 animate-spin text-gold-400" /> : state.error ? <p className="text-sm text-red-300">{state.error}</p> : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={state.blob!} alt="Pré-visualização da arte" className="max-h-[78vh] w-auto rounded-lg shadow-2xl" />
        )}
      </div>
    </div>
  );
}
