import { useState } from "react";
import { ArrowLeftRight, X } from "lucide-react";
import { useCompare } from "@/lib/useCompare";
import { CompareOverlay } from "@/components/CompareOverlay";

export function CompareBar() {
  const { count, clear } = useCompare();
  const [open, setOpen] = useState(false);

  if (count < 2) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border-2 border-accent/40 shadow-2xl rounded-full px-5 py-3 backdrop-blur-xl animate-slide-up">
        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
          {count} {count === 1 ? "produto" : "produtos"} selecionados
        </span>
        <button
          onClick={() => setOpen(true)}
          className="kiosk-btn bg-accent text-accent-foreground px-4 py-1.5 rounded-full text-sm font-bold inline-flex items-center gap-1.5"
        >
          <ArrowLeftRight className="h-4 w-4" />
          Comparar
        </button>
        <button
          onClick={clear}
          className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition"
          title="Limpar seleção"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <CompareOverlay open={open} onClose={() => setOpen(false)} />
    </>
  );
}
