import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, Wrench, CheckCircle2, XCircle, Users, Search, Bell } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

const COLORS = ["hsl(var(--accent))", "hsl(var(--destructive))", "hsl(var(--primary))", "hsl(var(--muted-foreground))"];
const CHART_COLORS = ["var(--color-sessions)", "var(--color-searches)", "var(--color-assistance)"];

function Dashboard() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: stats } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const [p, pa, pi, pr] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("active", true),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("active", false),
        supabase.from("problems").select("*", { count: "exact", head: true }),
      ]);
      return {
        products: p.count ?? 0,
        active: pa.count ?? 0,
        inactive: pi.count ?? 0,
        problems: pr.count ?? 0,
      };
    },
  });

  const { data: today = { sessions: 0, searches: 0, assistance: 0 } } = useQuery({
    queryKey: ["admin", "today"],
    queryFn: async () => {
      const [sessionsRes, searchesRes, assistanceRes] = await Promise.all([
        supabase.from("customers").select("*", { count: "exact", head: true })
          .gte("created_at", todayStart.toISOString())
          .lte("created_at", todayEnd.toISOString()),
        supabase.from("customer_history").select("*", { count: "exact", head: true })
          .eq("event_type", "search")
          .gte("created_at", todayStart.toISOString())
          .lte("created_at", todayEnd.toISOString()),
        supabase.from("assistance_requests").select("*", { count: "exact", head: true })
          .gte("created_at", todayStart.toISOString())
          .lte("created_at", todayEnd.toISOString()),
      ]);
      return {
        sessions: sessionsRes.count ?? 0,
        searches: searchesRes.count ?? 0,
        assistance: assistanceRes.count ?? 0,
      };
    },
  });

  const { data: activityData = [] } = useQuery({
    queryKey: ["admin", "activity", "14days"],
    queryFn: async () => {
      const start = new Date();
      start.setDate(start.getDate() - 13);
      start.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("customers")
        .select("created_at")
        .gte("created_at", start.toISOString())
        .order("created_at", { ascending: true });

      const dayMap = new Map<string, number>();
      for (let i = 0; i < 14; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        dayMap.set(d.toISOString().slice(0, 10), 0);
      }
      (data ?? []).forEach((c) => {
        const key = new Date(c.created_at).toISOString().slice(0, 10);
        dayMap.set(key, (dayMap.get(key) || 0) + 1);
      });
      return Array.from(dayMap.entries()).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("pt-PT", { weekday: "short", day: "numeric" }),
        sessions: count,
      }));
    },
  });

  const { data: topProducts = [] } = useQuery({
    queryKey: ["admin", "top-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_history")
        .select("payload")
        .eq("event_type", "product_view")
        .order("created_at", { ascending: false })
        .limit(2000);

      const countMap = new Map<string, { count: number; name: string }>();
      (data ?? []).forEach((r) => {
        const payload = r.payload as { product_id?: string; product_name?: string } | null;
        const pid = payload?.product_id;
        const pname = payload?.product_name?.trim();
        if (pid && pname) {
          const entry = countMap.get(pid) || { count: 0, name: pname };
          entry.count += 1;
          countMap.set(pid, entry);
        }
      });
      return Array.from(countMap.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([id, { count, name }]) => ({ id, name, count }));
    },
  });

  const { data: topSearches = [] } = useQuery({
    queryKey: ["admin", "top-searches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_history")
        .select("payload")
        .eq("event_type", "search")
        .order("created_at", { ascending: false })
        .limit(2000);

      const countMap = new Map<string, number>();
      (data ?? []).forEach((r) => {
        const payload = r.payload as { query?: string } | null;
        const q = payload?.query?.trim().toLowerCase();
        if (q && q.length > 1) {
          countMap.set(q, (countMap.get(q) || 0) + 1);
        }
      });
      return Array.from(countMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([query, count]) => ({ query, count }));
    },
  });

  const { data: assistanceByStatus = [] } = useQuery({
    queryKey: ["admin", "assistance-status"],
    queryFn: async () => {
      const { data } = await supabase
        .from("assistance_requests")
        .select("status");

      const countMap = new Map<string, number>();
      (data ?? []).forEach((r) => {
        countMap.set(r.status, (countMap.get(r.status) || 0) + 1);
      });
      const labelMap: Record<string, string> = {
        pending: "Pendentes",
        accepted: "Aceites",
        attending: "Em atendimento",
        refused: "Recusados",
        expired: "Expirados",
        done: "Concluídos",
      };
      return Array.from(countMap.entries()).map(([status, count]) => ({
        status: labelMap[status] || status,
        count,
        fill: COLORS[["pending", "accepted", "done", "refused", "expired"].indexOf(status) % COLORS.length],
      }));
    },
  });

  const config = {
    sessions: { label: "Sessões", color: "hsl(var(--accent))" },
    searches: { label: "Pesquisas", color: "hsl(var(--primary))" },
    assistance: { label: "Assistência", color: "hsl(var(--destructive))" },
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-primary mb-6">Dashboard</h1>

      {/* Catalog stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat icon={<Package />} label="Total de produtos" value={stats?.products} />
        <Stat icon={<CheckCircle2 />} label="Produtos ativos" value={stats?.active} />
        <Stat icon={<XCircle />} label="Produtos inativos" value={stats?.inactive} />
        <Stat icon={<Wrench />} label="Problemas cadastrados" value={stats?.problems} />
      </div>

      {/* Today's activity */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat icon={<Users />} label="Sessões hoje" value={today.sessions} />
        <Stat icon={<Search />} label="Pesquisas hoje" value={today.searches} />
        <Stat icon={<Bell />} label="Pedidos hoje" value={today.assistance} />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Activity chart */}
        <div className="bg-card border rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-primary mb-4">Sessões (últimos 14 dias)</h2>
          <div className="h-64">
            <ChartContainer config={config}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="sessions" fill="var(--color-sessions)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        {/* Assistance by status */}
        <div className="bg-card border rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-primary mb-4">Pedidos de assistência por estado</h2>
          <div className="h-64 flex items-center justify-center">
            {assistanceByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assistanceByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    label={({ status, count }) => `${status}: ${count}`}
                    labelLine={false}
                  >
                    {assistanceByStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground">Sem pedidos ainda.</p>
            )}
          </div>
        </div>
      </div>

      {/* Top products */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card border rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-primary mb-4">Produtos mais vistos</h2>
          {topProducts.length === 0 ? (
            <p className="text-muted-foreground">Sem visualizações ainda.</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((item, i) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-5 text-right">{i + 1}.</span>
                  <div className="flex-1 bg-muted rounded-full h-7 overflow-hidden">
                    <div
                      className="h-full bg-primary/80 text-primary-foreground text-xs flex items-center px-3 font-medium"
                      style={{ width: `${Math.max(5, (item.count / topProducts[0].count) * 100)}%` }}
                    >
                      {item.name}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-8 text-right">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top searches */}
        <div className="bg-card border rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-primary mb-4">Pesquisas mais frequentes</h2>
        {topSearches.length === 0 ? (
          <p className="text-muted-foreground">Sem pesquisas ainda.</p>
        ) : (
          <div className="space-y-2">
            {topSearches.map((item, i) => (
              <div key={item.query} className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-5 text-right">{i + 1}.</span>
                <div className="flex-1 bg-muted rounded-full h-7 overflow-hidden">
                  <div
                    className="h-full bg-accent/80 text-accent-foreground text-xs flex items-center px-3 font-medium"
                    style={{ width: `${Math.max(5, (item.count / topSearches[0].count) * 100)}%` }}
                  >
                    {item.query}
                  </div>
                </div>
                <span className="text-xs font-mono text-muted-foreground w-8 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Recent changes */}
      <RecentChanges />
    </div>
  );
}

function RecentChanges() {
  const { data: recent = [] } = useQuery({
    queryKey: ["admin", "recent"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,name,updated_at,active")
        .order("updated_at", { ascending: false }).limit(8);
      return data ?? [];
    },
  });

  return (
    <>
      <h2 className="text-xl font-semibold text-primary mt-2 mb-3">Últimas alterações</h2>
      <div className="bg-card border rounded-2xl divide-y">
        {recent.length === 0 ? (
          <p className="p-4 text-muted-foreground">Sem alterações.</p>
        ) : recent.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(p.updated_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${p.active ? "bg-accent/20 text-accent-foreground" : "bg-destructive/10 text-destructive"}`}>
              {p.active ? "ativo" : "inativo"}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | undefined }) {
  return (
    <div className="bg-card border rounded-2xl p-5">
      <div className="text-accent">{icon}</div>
      <div className="mt-2 text-3xl font-bold text-primary">{value ?? "—"}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
