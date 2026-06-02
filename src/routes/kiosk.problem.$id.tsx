import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, MapPin, Package, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/kiosk/problem/$id")({
  component: ProblemDetail,
});

function ProblemDetail() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["problem", id],
    queryFn: async () => {
      const { data: problem, error } = await supabase
        .from("problems").select("*").eq("id", id).eq("active", true).maybeSingle();
      if (error) throw error;
      if (!problem) return null;
      const { data: links } = await supabase
        .from("problem_products")
        .select("display_order, products(*)")
        .eq("problem_id", id)
        .order("display_order");
      const products = (links ?? [])
        .map((l: any) => l.products)
        .filter((p: any) => p && p.active);
      return { problem, products };
    },
  });

  if (isLoading) return <div className="p-10 text-xl">A carregar...</div>;
  if (!data) {
    return (
      <div className="p-10 max-w-3xl mx-auto text-center">
        <p className="text-2xl">
          Não encontramos uma solução cadastrada para este problema. Por favor peça ajuda a um funcionário.
        </p>
        <Link to="/kiosk/problems" className="kiosk-btn mt-8 bg-primary text-primary-foreground px-6 py-3">
          <ArrowLeft className="mr-2 h-5 w-5" /> Voltar
        </Link>
      </div>
    );
  }
  const { problem, products } = data;
  const steps = problem.steps?.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) ?? [];

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <Link to="/kiosk/problems" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="text-4xl font-bold text-primary">{problem.title}</h1>
      {problem.category && <p className="mt-1 text-muted-foreground">{problem.category}</p>}
      {problem.description && <p className="mt-4 text-xl">{problem.description}</p>}

      {problem.solution && (
        <section className="mt-8 bg-card border rounded-2xl p-6">
          <h2 className="text-2xl font-semibold text-primary mb-2">Solução recomendada</h2>
          <p className="text-lg whitespace-pre-line">{problem.solution}</p>
        </section>
      )}

      {steps.length > 0 && (
        <section className="mt-6 bg-card border rounded-2xl p-6">
          <h2 className="text-2xl font-semibold text-primary mb-3">Passos</h2>
          <ol className="space-y-2 list-decimal pl-6 text-lg">
            {steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </section>
      )}

      {problem.safety_warning && (
        <section className="mt-6 bg-destructive/10 border-2 border-destructive rounded-2xl p-6 flex gap-4">
          <AlertTriangle className="h-8 w-8 text-destructive shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-destructive">Aviso de segurança</h2>
            <p className="text-lg mt-1 whitespace-pre-line">{problem.safety_warning}</p>
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-2xl font-semibold text-primary mb-3">Produtos recomendados</h2>
        {products.length === 0 ? (
          <p className="text-muted-foreground">Sem produtos associados. Peça ajuda a um funcionário.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p: any) => (
              <Link
                key={p.id}
                to="/kiosk/product/$id"
                params={{ id: p.id }}
                className="kiosk-btn bg-card border rounded-2xl p-5 flex-col items-start text-left hover:border-accent"
              >
                <div className="w-full aspect-square rounded-xl bg-muted overflow-hidden flex items-center justify-center mb-3">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    : <Package className="h-16 w-16 text-muted-foreground" />}
                </div>
                <h3 className="text-xl font-semibold text-primary">{p.name}</h3>
                <div className="mt-2 flex items-center gap-2 text-sm bg-accent/20 rounded-lg px-3 py-1.5">
                  <MapPin className="h-4 w-4" />
                  {[p.section, p.aisle && `Corredor ${p.aisle}`, p.shelf && `Prat. ${p.shelf}`].filter(Boolean).join(" · ") || "—"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
