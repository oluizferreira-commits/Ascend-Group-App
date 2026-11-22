"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Scissors, Trash2 } from "lucide-react";
import { PlayerCard, type PlayerCardProps } from "@/components/cards/player-card";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { removePlayerPhotoAction, savePlayerPhotoAction } from "@/server/actions/player-photo";

type Props = { playerId: string; card: Omit<PlayerCardProps, "photoX" | "photoY" | "photoZoom" | "size" | "tilt">; photoX: number; photoY: number; photoZoom: number };

const MAX_SIDE = 1000;

async function drawScaled(src: Blob) {
  const bmp = await createImageBitmap(src);
  const s = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}

const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/png"));

/**
 * In-browser background removal (MediaPipe selfie segmenter, Apache-2.0, served from /mediapipe).
 * Runs on the device — no paid service, the photo never leaves the browser until "Salvar".
 */
async function cutOut(src: Blob): Promise<Blob> {
  const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks("/mediapipe");
  const seg = await ImageSegmenter.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: "/mediapipe/selfie_segmenter.tflite" },
    runningMode: "IMAGE", outputConfidenceMasks: true, outputCategoryMask: false,
  });
  try {
    const canvas = await drawScaled(src);
    const { width: w, height: h } = canvas;
    const res = seg.segment(canvas);
    const masks = res.confidenceMasks ?? [];
    const mask = masks[masks.length - 1]?.getAsFloat32Array();
    if (!mask || mask.length !== w * h) throw new Error("mask");
    // Make sure the mask means "person": corners should be background.
    const corner = (mask[0] + mask[w - 1] + mask[(h - 1) * w] + mask[h * w - 1]) / 4;
    const center = mask[Math.floor(h / 2) * w + Math.floor(w / 2)];
    const invert = corner > center;
    const ctx = canvas.getContext("2d")!;
    const img = ctx.getImageData(0, 0, w, h);
    let minX = w, minY = h, maxX = 0, maxY = 0;
    for (let i = 0; i < w * h; i++) {
      const v = invert ? 1 - mask[i] : mask[i];
      const a = Math.max(0, Math.min(1, (v - 0.35) / 0.3)); // soft edge
      img.data[i * 4 + 3] = Math.round(img.data[i * 4 + 3] * a);
      if (a > 0.1) { const x = i % w, y = (i / w) | 0; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    masks.forEach((m) => m.close());
    if (maxX <= minX || maxY <= minY) throw new Error("Nenhuma pessoa encontrada na foto.");
    ctx.putImageData(img, 0, 0);
    // trim to the player with a small margin
    const pad = Math.round(Math.max(w, h) * 0.03);
    const cx = Math.max(0, minX - pad), cy = Math.max(0, minY - pad);
    const cw = Math.min(w, maxX + pad) - cx, ch = Math.min(h, maxY + pad) - cy;
    const out = document.createElement("canvas");
    out.width = cw; out.height = ch;
    out.getContext("2d")!.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
    return toBlob(out);
  } finally {
    seg.close();
  }
}

export function PhotoEditor({ playerId, card, photoX, photoY, photoZoom }: Props) {
  const [file, setFile] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(card.avatarUrl);
  const [x, setX] = useState(photoX), [y, setY] = useState(photoY), [zoom, setZoom] = useState(photoZoom);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [state, action] = useActionState(async (prev: Awaited<ReturnType<typeof savePlayerPhotoAction>> | null, form: FormData) => {
    form.delete("photo");
    if (file) form.set("photo", new File([file], "foto.png", { type: file.type || "image/png" }));
    const r = await savePlayerPhotoAction(playerId, prev, form);
    if (r.ok) setFile(null);
    return r;
  }, null);

  useEffect(() => () => { if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);
  const show = (b: Blob) => setPreview((old) => { if (old?.startsWith("blob:")) URL.revokeObjectURL(old); return URL.createObjectURL(b); });

  return (
    <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
      <div className="mx-auto" data-no-swipe>
        <PlayerCard {...card} avatarUrl={preview} photoX={x} photoY={y} photoZoom={zoom} size="md" />
      </div>
      <form action={action} className="space-y-4">
        <input type="hidden" name="photoX" value={x} />
        <input type="hidden" name="photoY" value={y} />
        <input type="hidden" name="photoZoom" value={zoom} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => input.current?.click()}><ImagePlus className="size-4" />Escolher foto</button>
          <button type="button" className="btn-secondary" disabled={!preview || !!busy}
            onClick={async () => {
              setErr(null); setBusy("Recortando o jogador…");
              try {
                const src = file ?? (preview ? await (await fetch(preview)).blob() : null);
                if (!src) return;
                const cut = await cutOut(src);
                setFile(cut); show(cut);
              } catch (e) {
                setErr((e as Error).message === "mask" ? "Não foi possível recortar esta foto." : (e as Error).message);
              } finally { setBusy(null); }
            }}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Scissors className="size-4" />}{busy ?? "Remover fundo"}
          </button>
          <input ref={input} type="file" accept="image/png,image/webp,image/jpeg" className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setErr(null);
              const scaled = await toBlob(await drawScaled(f)); // PNG keeps transparency of pre-cut images
              setFile(scaled); show(scaled);
              setX(50); setY(20); setZoom(100);
            }} />
        </div>
        <p className="text-xs text-ink-400">
          Dica: o recorte fica perfeito com o próprio celular — no iPhone ou Android, segure o dedo sobre o jogador na foto, copie/salve o recorte e envie aqui.
          A transparência é mantida.
        </p>
        {[["Horizontal", x, setX, 0, 100], ["Vertical", y, setY, 0, 100], ["Zoom", zoom, setZoom, 100, 250]].map(([label, v, set, min, max]) => (
          <label key={label as string} className="block text-sm">
            <span className="label flex justify-between"><span>{label as string}</span><span className="tabular-nums">{v as number}{label === "Zoom" ? "%" : "%"}</span></span>
            <input type="range" min={min as number} max={max as number} value={v as number} onChange={(e) => (set as (n: number) => void)(Number(e.target.value))} className="w-full accent-[#1c3fb0]" />
          </label>
        ))}
        {err && <p className="text-sm text-loss">{err}</p>}
        <FormMessage state={state} />
        <div className="flex flex-wrap gap-2">
          <SubmitButton>{file ? "Salvar foto" : "Salvar enquadramento"}</SubmitButton>
          {card.avatarUrl && !file && (
            <button type="button" className="btn-ghost text-loss" onClick={async () => { await removePlayerPhotoAction(playerId); setPreview(null); }}>
              <Trash2 className="size-4" />Remover foto
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
