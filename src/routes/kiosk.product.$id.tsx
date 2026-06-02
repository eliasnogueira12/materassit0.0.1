import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Package, Tag } from "lucide-react";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/kiosk/product/$id")({
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: related = [] } = useQuery({
    queryKey: ["product-related", id],
    enabled: !!data,
    queryFn: async () => {
      const { data: rel } = await supabase
        .from("product_relations")
        .select("related_product_id, display_order")
        .eq("product_id", id)
        .order("display_order");
      const ids = (rel ?? []).map((r) => r.related_product_id);
      if (ids.length === 0) return [];
      const { data: prods } = await supabase
        .from("products")
        .select("id,name,image_url,price,promotion_price,promotion_active,section,aisle,shelf")
        .in("id", ids)
        .eq("active", true);
      return prods ?? [];
    },
  });

  if (isLoading) return <div className="p-10 text-xl">A carregar...</div>;
  if (!data) {
    return (
      <div className="p-10 text-center text-2xl">
        Produto não disponível.{" "}
        <Link to="/kiosk/search" className="text-accent underline">
          Voltar
        </Link>
      </div>
    );
  }
  const p = data;
  const showPromo = p.promotion_active && p.promotion_price != null;

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <Link
        to="/kiosk/search"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <div className="grid md:grid-cols-2 gap-8 bg-card border rounded-3xl p-6 shadow-lg animate-fade-in">
        <div className="relative aspect-square rounded-2xl bg-muted overflow-hidden flex items-center justify-center">
          {p.image_url ? (
            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
          ) : (
            <Package className="h-32 w-32 text-muted-foreground" />
          )}
          {showPromo && (
            <span className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-sm font-bold px-3 py-1.5 rounded-full shadow">
              <Tag className="inline h-3.5 w-3.5 mr-1" /> Promoção
            </span>
          )}
        </div>
        <div>
          <h1 className="text-4xl font-bold text-primary">{p.name}</h1>
          {p.category && <p className="text-muted-foreground mt-1">{p.category}</p>}

          {(p.price != null || showPromo) && (
            <div className="mt-4 flex items-baseline gap-3">
              {showPromo ? (
                <>
                  <span className="text-4xl font-extrabold text-destructive">
                    {formatPrice(p.promotion_price)}
                  </span>
                  {p.price != null && (
                    <span className="text-xl line-through text-muted-foreground">
                      {formatPrice(p.price)}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-4xl font-extrabold text-primary">{formatPrice(p.price)}</span>
              )}
            </div>
          )}

          {p.stock_visible && (
            <p
              className={`mt-2 text-sm font-medium ${p.stock > 0 ? "text-emerald-600" : "text-destructive"}`}
            >
              {p.stock > 0 ? `Em stock (${p.stock})` : "Sem stock"}
            </p>
          )}

          {p.description && <p className="mt-4 text-lg">{p.description}</p>}

          <div className="mt-8 bg-accent/15 border-2 border-accent rounded-2xl p-5">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <MapPin className="h-6 w-6 text-accent" /> Onde fica
            </h2>
            <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
              <Stat label="Secção" value={p.section} />
              <Stat label="Corredor" value={p.aisle} />
              <Stat label="Prateleira" value={p.shelf} />
            </dl>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-10 animate-fade-in">
          <h2 className="text-2xl font-bold text-primary mb-4">Talvez precises disto também</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((r) => {
              const promo = r.promotion_active && r.promotion_price != null;
              return (
                <Link
                  key={r.id}
                  to="/kiosk/product/$id"
                  params={{ id: r.id }}
                  className="bg-card border rounded-2xl p-3 hover:border-accent transition-all hover:scale-[1.02]"
                >
                  <div className="aspect-square rounded-xl bg-muted overflow-hidden flex items-center justify-center mb-2">
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <div className="font-medium text-sm text-primary line-clamp-2">{r.name}</div>
                  {(r.price != null || promo) && (
                    <div className="mt-1 text-sm font-bold">
                      {promo ? (
                        <span className="text-destructive">{formatPrice(r.promotion_price)}</span>
                      ) : (
                        <span>{formatPrice(r.price)}</span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-card rounded-xl p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold text-primary">{value || "—"}</div>
    </div>
  );
}
