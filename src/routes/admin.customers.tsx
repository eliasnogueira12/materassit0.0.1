import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, Trash2, Lock, LockOpen, Save, X, Eye, UserPlus, Activity, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/customers")({
  component: CustomersPage,
});


type Customer = {
  id: string;
  customer_number: number;
  created_at: string;
  last_seen_at: string;
  blocked: boolean;
  notes: string | null;
};

type HistoryRow = {
  id: string;
  event_type: string;
  payload: any;
  created_at: string;
};

type RequestRow = {
  id: string;
  status: string;
  reason: string | null;
  created_at: string;
};

function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "active" | "recent" | "blocked">("all");

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error) setItems((data ?? []) as Customer[]);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    let list = items;
    const q = search.trim();
    if (q) {
      list = list.filter((c) => String(c.customer_number).includes(q) || c.id.includes(q));
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (filterTab === "active") {
      list = list.filter((c) => new Date(c.last_seen_at) >= today);
    } else if (filterTab === "recent") {
      list = list.filter((c) => new Date(c.created_at) >= oneDayAgo);
    } else if (filterTab === "blocked") {
      list = list.filter((c) => c.blocked);
    }
    return list;
  }, [items, search, filterTab]);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const activeToday = items.filter((c) => new Date(c.last_seen_at) >= today).length;
    const blocked = items.filter((c) => c.blocked).length;
    return { total: items.length, activeToday, blocked };
  }, [items]);

  async function createManual() {
    const { data, error } = await supabase.rpc("create_customer");
    if (error) { toast.error("Não foi possível criar."); return; }
    const row = (data as any)?.[0];
    if (row?.customer_number) toast.success(`Cliente #${row.customer_number} criado.`);
    refresh();
  }

  async function clearInactiveSessions() {
    if (!confirm("Deseja limpar todos os clientes inativos (sem visitas nos últimos 15 dias, não bloqueados e sem notas internas)?")) return;
    setLoading(true);
    try {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const { error } = await supabase
        .from("customers")
        .delete()
        .lt("last_seen_at", fifteenDaysAgo.toISOString())
        .eq("blocked", false)
        .is("notes", null);

      if (error) throw error;
      toast.success("Sessões inativas limpas com sucesso.");
      refresh();
    } catch (e: any) {
      toast.error("Erro ao limpar sessões: " + e.message);
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-7 w-7 text-accent" />
        <h1 className="text-3xl font-bold text-primary">Clientes</h1>
        <span className="ml-2 text-sm text-muted-foreground">{items.length} no total</span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={clearInactiveSessions} disabled={loading}>
            <Trash2 className="h-4 w-4 mr-1.5" /> Limpar inativos
          </Button>
          <Button onClick={createManual}>
            <UserPlus className="h-4 w-4 mr-1.5" /> Novo cliente
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard icon={<Users className="h-5 w-5" />} label="Total de clientes" value={stats.total} tone="primary" />
        <StatCard icon={<Activity className="h-5 w-5" />} label="Ativos hoje" value={stats.activeToday} tone="emerald" />
        <StatCard icon={<ShieldCheck className="h-5 w-5" />} label="Bloqueados" value={stats.blocked} tone="destructive" />
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4 border-b pb-4">
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filterTab === "all" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"}`}
          >
            Todos ({items.length})
          </button>
          <button
            onClick={() => setFilterTab("active")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filterTab === "active" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"}`}
          >
            Ativos Hoje ({stats.activeToday})
          </button>
          <button
            onClick={() => setFilterTab("recent")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filterTab === "recent" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"}`}
          >
            Recentemente Criados
          </button>
          <button
            onClick={() => setFilterTab("blocked")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filterTab === "blocked" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"}`}
          >
            Bloqueados ({stats.blocked})
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por número ou ID…"
            className="w-full pl-9 pr-3 h-9 rounded-lg border border-input bg-background text-xs"
          />
        </div>
      </div>


      <div className="bg-card border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-4 py-3 font-semibold">Número</th>
              <th className="px-4 py-3 font-semibold">Criado em</th>
              <th className="px-4 py-3 font-semibold">Última visita</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold w-32 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">A carregar…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Sem resultados.</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-3 font-semibold text-primary">#{c.customer_number}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(c.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(c.last_seen_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  {c.blocked ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-destructive/15 text-destructive rounded-full px-2 py-0.5">
                      <Lock className="h-3 w-3" /> Bloqueado
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-600 font-medium">Ativo</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => setSelected(c)}>
                    <Eye className="h-4 w-4 mr-1" /> Detalhes
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <CustomerDetail
          customer={selected}
          onClose={() => setSelected(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: number; tone: "primary" | "emerald" | "destructive" }) {
  const toneCls = {
    primary: "from-primary/10 to-primary/5 text-primary",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600",
    destructive: "from-destructive/10 to-destructive/5 text-destructive",
  }[tone];
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${toneCls} p-5 shadow-sm backdrop-blur`}>
      <div className="flex items-center gap-2 text-sm font-medium opacity-80">
        {icon} {label}
      </div>
      <div className="mt-2 text-4xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

function CustomerDetail({
  customer,
  onClose,
  onChanged,
}: {
  customer: Customer;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [number, setNumber] = useState(String(customer.customer_number));
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [blocked, setBlocked] = useState(customer.blocked);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [h, r] = await Promise.all([
        supabase
          .from("customer_history")
          .select("id,event_type,payload,created_at")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("assistance_requests")
          .select("id,status,reason,created_at")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (!h.error) setHistory((h.data ?? []) as HistoryRow[]);
      if (!r.error) setRequests((r.data ?? []) as RequestRow[]);
    })();
  }, [customer.id]);

  async function save() {
    setSaving(true);
    const n = parseInt(number, 10);
    if (!Number.isFinite(n) || n < 1) {
      toast.error("Número inválido.");
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("customers")
      .update({ customer_number: n, notes: notes || null, blocked })
      .eq("id", customer.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível guardar. " + (error.message.includes("unique") ? "Número já existe." : ""));
      return;
    }
    toast.success("Cliente atualizado.");
    onChanged();
    onClose();
  }

  async function remove() {
    if (!confirm(`Apagar cliente #${customer.customer_number}? Esta ação é definitiva.`)) return;
    const { error } = await supabase.from("customers").delete().eq("id", customer.id);
    if (error) { toast.error("Não foi possível apagar."); return; }
    toast.success("Cliente apagado.");
    onChanged();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cliente #{customer.customer_number}</DialogTitle>
          <DialogDescription>
            Criado em {new Date(customer.created_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 mt-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Número</label>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Estado</label>
            <button
              onClick={() => setBlocked(!blocked)}
              className={`mt-1 w-full h-10 rounded-lg border flex items-center justify-center gap-2 font-medium ${blocked ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"}`}
            >
              {blocked ? <><Lock className="h-4 w-4" /> Bloqueado</> : <><LockOpen className="h-4 w-4" /> Ativo</>}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-muted-foreground">Notas internas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full p-3 rounded-lg border border-input bg-background mt-1 text-sm"
            placeholder="Apenas visível para administradores…"
          />
        </div>

        <div className="mt-6">
          <h3 className="font-semibold text-primary mb-2">Pedidos de assistência ({requests.length})</h3>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido.</p>
          ) : (
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {requests.map((r) => (
                <li key={r.id} className="text-sm flex items-center gap-2 border-b py-1.5">
                  <span className="text-xs font-mono uppercase rounded bg-muted px-1.5 py-0.5">{r.status}</span>
                  <span className="flex-1 truncate">{r.reason ?? "—"}</span>
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6">
          <h3 className="font-semibold text-primary mb-2">Histórico ({history.length})</h3>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem atividade registada.</p>
          ) : (
            <ul className="space-y-1 max-h-64 overflow-y-auto">
              {history.map((h) => (
                <li key={h.id} className="text-sm flex items-start gap-2 border-b py-1.5">
                  <span className="text-xs font-mono uppercase rounded bg-muted px-1.5 py-0.5 shrink-0">
                    {h.event_type}
                  </span>
                  <span className="flex-1 text-muted-foreground truncate">
                    {h.payload?.query || h.payload?.reply || h.payload?.request_id || "—"}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex gap-2 justify-between">
          <Button variant="destructive" onClick={remove}>
            <Trash2 className="h-4 w-4 mr-1.5" /> Apagar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-1.5" /> Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4 mr-1.5" /> Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
