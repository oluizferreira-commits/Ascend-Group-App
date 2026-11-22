"use client";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { X } from "lucide-react";

/**
 * iOS-style sheet that slides up from the bottom. Drag the handle (or the sheet) down to close,
 * tap the backdrop or press Esc. Locks page scroll while open.
 */
export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const controls = useDragControls();
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby={id}>
          <motion.div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="glass absolute inset-x-0 bottom-0 mx-auto max-h-[88dvh] max-w-lg overflow-hidden rounded-t-3xl"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            drag="y" dragListener={false} dragControls={controls} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 90 || info.velocity.y > 600) onClose(); }}
          >
            <div className="cursor-grab touch-none px-5 pt-3 pb-2 active:cursor-grabbing" onPointerDown={(e) => controls.start(e)}>
              <div className="mx-auto h-1.5 w-11 rounded-full bg-ink-500/60" />
              <div className="mt-3 flex items-center justify-between">
                <h2 id={id} className="font-display text-xl font-bold tracking-wide uppercase">{title}</h2>
                <button onClick={onClose} className="btn-ghost px-2" aria-label="Fechar"><X className="size-5" /></button>
              </div>
            </div>
            <div className="max-h-[70dvh] overflow-y-auto px-5 pb-2">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
