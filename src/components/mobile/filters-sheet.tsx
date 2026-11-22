"use client";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { BottomSheet } from "./bottom-sheet";

/** Inline filters on desktop; a "Filtros" button that opens a bottom sheet on phones. */
export function FiltersSheet({ children, active }: { children: React.ReactNode; active?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="mb-5 sm:hidden">
        <button type="button" onClick={() => setOpen(true)} className="btn-secondary w-full">
          <SlidersHorizontal className="size-4" />Filtros{active ? ` (${active})` : ""}
        </button>
      </div>
      <div className="hidden sm:block">{children}</div>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Filtros">{open && children}</BottomSheet>
    </>
  );
}
