import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Wrench, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/kiosk/problems")({
  component: ProblemsPage,
});

function ProblemsPage() {
  const [q, setQ] = useState("");
  const { data: problems = [], isLoading } = useQuery({
    queryKey: ["problems", "kiosk", q],
    queryFn: async () => {
      let query = supabase.from("problems").select("*").eq("active", true).order("title");
      if (q.trim()) {
        const t = `%${q.trim()}%`;
        query = query.or(`title.ilike.${t},description.ilike.${t},keywords.ilike.${t},category.ilike.${t}`);
      }
      const { data, error } = await query.limit(60);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-primary mb-2">Que problema tem?</h1>
      <p className="text-lg text-muted-foreground mb-6">
        Escolha um problema ou procure por palavras.
      </p>
      <Input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ex: torneira a pingar, parede com buraco..."
        className="h-16 text-2xl rounded-2xl px-6"
      />
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <p className="text-muted-foreground">A carregar...</p>
        ) : problems.length === 0 ? (
          <div className="col-span-full bg-card border-2 border-dashed rounded-2xl p-10 text-center">
            <p className="text-xl">Não encontramos uma solução cadastrada para este problema. Por favor peça ajuda a um funcionário.</p>
          </div>
        ) : (
          problems.map((p) => (
            <Link
              key={p.id}
              to="/kiosk/problem/$id"
              params={{ id: p.id }}
              className="kiosk-btn bg-card border-2 border-border rounded-2xl p-6 items-start text-left hover:border-accent justify-between"
            >
              <div className="flex items-start gap-4">
                <Wrench className="h-10 w-10 text-accent shrink-0" />
                <div>
                  <h3 className="text-2xl font-semibold text-primary">{p.title}</h3>
                  {p.category && <span className="text-sm text-muted-foreground">{p.category}</span>}
                  {p.description && (
                    <p className="mt-2 text-base text-muted-foreground line-clamp-2">{p.description}</p>
                  )}
                </div>
              </div>
              <ArrowRight className="h-8 w-8 text-accent shrink-0 ml-3" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
