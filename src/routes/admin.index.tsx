import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, Wrench, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
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

  const { data: recent = [] } = useQuery({
    queryKey: ["admin", "recent"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,name,updated_at,active")
        .order("updated_at", { ascending: false }).limit(8);
      return data ?? [];
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-primary mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Package />} label="Total de produtos" value={stats?.products} />
        <Stat icon={<CheckCircle2 />} label="Produtos ativos" value={stats?.active} />
        <Stat icon={<XCircle />} label="Produtos inativos" value={stats?.inactive} />
        <Stat icon={<Wrench />} label="Problemas cadastrados" value={stats?.problems} />
      </div>

      <h2 className="text-xl font-semibold text-primary mt-10 mb-3">Últimas alterações</h2>
      <div className="bg-card border rounded-2xl divide-y">
        {recent.length === 0 ? (
          <p className="p-4 text-muted-foreground">Sem alterações.</p>
        ) : recent.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground">{new Date(p.updated_at).toLocaleString("pt-PT")}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${p.active ? "bg-accent/20 text-accent-foreground" : "bg-destructive/10 text-destructive"}`}>
              {p.active ? "ativo" : "inativo"}
            </span>
          </div>
        ))}
      </div>
    </div>
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
