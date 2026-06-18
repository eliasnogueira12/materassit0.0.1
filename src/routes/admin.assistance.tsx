import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CheckCircle2, Hand, X, Clock, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAssistanceRequests, playChime } from "@/lib/assistance";
import { setRequestStatus } from "@/lib/assistant.functions";
import type { AssistanceRequest } from "@/lib/assistance";

export const Route = createFileRoute("/admin/assistance")({
  component: AssistancePage,
});

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  return `há ${h}h`;
}

function AssistancePage() {
  const { items, loading } = useAssistanceRequests({
    onNew: () => {
      playChime();
      toast("Novo pedido de assistência", { icon: "🛎️" });
    },
  });
  const setStatus = useServerFn(setRequestStatus);
  async function update(id: string, status: "accepted" | "refused" | "done") {
    try {
      await setStatus({ data: { id, status } });
      toast.success(
        status === "accepted" ? "Pedido aceite" : status === "refused" ? "Pedido recusado" : "Concluído",
      );
    } catch (e) {
      console.error("[admin.assistance] update error:", e);
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e);
      toast.error(msg);
    }
  }

  const pending = items.filter((i) => i.status === "pending");
  const accepted = items.filter((i) => i.status === "accepted" || i.status === "attending");

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-7 w-7 text-accent" />
        <h1 className="text-3xl font-bold text-primary">Pedidos de assistência</h1>
        {pending.length > 0 && (
          <span className="ml-2 inline-flex items-center justify-center text-xs font-bold rounded-full bg-destructive text-destructive-foreground px-2.5 py-1 animate-pulse">
            {pending.length} novo{pending.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">A carregar…</p>
      ) : pending.length === 0 && accepted.length === 0 ? (
        <div className="bg-card border rounded-2xl p-10 text-center text-muted-foreground">
          Sem pedidos no momento.
        </div>
      ) : (
        <div className="space-y-8">
          <Section title="A aguardar resposta" items={pending} onAction={update} variant="pending" />
          <Section title="Em atendimento" items={accepted} onAction={update} variant="accepted" />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  onAction,
  variant,
}: {
  title: string;
  items: AssistanceRequest[];
  onAction: (id: string, s: "accepted" | "refused" | "done") => void;
  variant: "pending" | "accepted";
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="font-semibold text-primary mb-3">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((r) => {
          const expired =
            r.status === "pending" &&
            r.expires_at &&
            new Date(r.expires_at).getTime() < Date.now();
          return (
            <div
              key={r.id}
              className="bg-card border rounded-2xl p-4 animate-fade-in shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-primary">{r.kiosk_label}</span>
                    {r.customer_number != null && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary rounded-full px-2 py-0.5">
                        <User className="h-3 w-3" /> #{r.customer_number}
                      </span>
                    )}
                    {expired && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-500/15 text-amber-600 rounded-full px-2 py-0.5">
                        <Clock className="h-3 w-3" /> Expirado
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{timeAgo(r.created_at)}</div>
                  {r.reason && (
                    <p className="mt-2 text-sm">
                      <span className="text-muted-foreground">Motivo: </span>
                      {r.reason}
                    </p>
                  )}
                  {!r.reason && r.message && <p className="mt-2 text-sm">{r.message}</p>}
                </div>
              </div>
              <div className="mt-3 flex gap-2 justify-end">
                {variant === "pending" ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => onAction(r.id, "refused")}>
                      <X className="h-4 w-4 mr-1.5" /> Recusar
                    </Button>
                    <Button size="sm" onClick={() => onAction(r.id, "accepted")}>
                      <Hand className="h-4 w-4 mr-1.5" /> Aceitar
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => onAction(r.id, "done")}>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Concluir
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
