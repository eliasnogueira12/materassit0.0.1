import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { BellRing, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";

type Status = "pending" | "accepted" | "refused" | "expired" | "done";

export function AssistanceModal({
  requestId,
  open,
  onClose,
  onRetry,
}: {
  requestId: string | null;
  open: boolean;
  onClose: () => void;
  onRetry: () => void;
}) {
  const [status, setStatus] = useState<Status>("pending");
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!open || !requestId) return;
    setStatus("pending");
    setProgress(0);
    expiredRef.current = false;

    // Initial fetch
    supabase
      .from("assistance_requests")
      .select("status")
      .eq("id", requestId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.status) setStatus(data.status as Status);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`assistance-${requestId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "assistance_requests", filter: `id=eq.${requestId}` },
        (payload) => {
          const next = (payload.new as { status?: Status })?.status;
          if (next) setStatus(next);
        },
      )
      .subscribe();

    // 2 min countdown
    const start = Date.now();
    const total = 120_000;
    timerRef.current = setInterval(async () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / total) * 100);
      setProgress(pct);
      if (elapsed >= total && !expiredRef.current) {
        expiredRef.current = true;
        // Mark expired in DB if still pending
        const { data } = await supabase
          .from("assistance_requests")
          .update({ status: "expired" })
          .eq("id", requestId)
          .eq("status", "pending")
          .select("id");
        if (data && data.length > 0) setStatus("expired");
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 250);

    return () => {
      supabase.removeChannel(channel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, requestId]);

  // Stop timer once status leaves pending
  useEffect(() => {
    if (status !== "pending" && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [status]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {status === "pending" && "A procurar um funcionário disponível…"}
            {status === "accepted" && "Pedido Aceite!"}
            {status === "refused" && "Pedido Recusado"}
            {status === "expired" && "Nenhum funcionário aceitou neste momento."}
            {status === "done" && "Assistência concluída."}
          </DialogTitle>
          <DialogDescription className="text-center text-base mt-2">
            {status === "pending" && "A enviar o teu pedido à equipa. Aguarda um momento."}
            {status === "accepted" && "Um funcionário aceitou o seu pedido e está a caminho."}
            {status === "refused" && "O seu pedido foi recusado. Pode tentar novamente ou continuar a utilizar o assistente."}
            {status === "expired" && "Podes tentar novamente dentro de instantes."}
            {status === "done" && "Esperamos ter ajudado."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-6">
          {status === "pending" && (
            <div className="relative">
              <BellRing className="h-20 w-20 text-destructive animate-pulse" />
              <Loader2 className="absolute -top-2 -right-2 h-7 w-7 animate-spin text-accent" />
            </div>
          )}
          {status === "accepted" && <CheckCircle2 className="h-24 w-24 text-emerald-500 animate-scale-in" />}
          {status === "refused" && <XCircle className="h-24 w-24 text-destructive animate-scale-in" />}
          {status === "expired" && <Clock className="h-24 w-24 text-amber-500 animate-scale-in" />}
          {status === "done" && <CheckCircle2 className="h-24 w-24 text-emerald-500 animate-scale-in" />}
        </div>

        {status === "pending" && (
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {(status === "refused" || status === "expired") && (
          <div className="mt-4 flex gap-3 justify-center">
            <button
              onClick={onRetry}
              className="px-5 py-3 rounded-xl bg-accent text-accent-foreground font-medium"
            >
              Tentar novamente
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl border font-medium"
            >
              Continuar no assistente
            </button>
          </div>
        )}

        {(status === "accepted" || status === "done") && (
          <button
            onClick={onClose}
            className="mt-4 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
          >
            Fechar
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
