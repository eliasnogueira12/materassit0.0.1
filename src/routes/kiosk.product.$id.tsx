import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, ShoppingCart, Tag, Package, Minus, Plus } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/useCart";
import { ProductCard } from "@/components/ProductCard";
import { useCustomer, logHistory } from "@/lib/customer";
import type { RecommendedProduct } from "@/lib/assistant.functions";

export const Route = createFileRoute("/kiosk/product/$id")({
  component: ProductDetail,
});

function toRec(p: any): RecommendedProduct {
  return {
    id: p.id, name: p.name, category: p.category,
    location: [p.section, p.aisle, p.shelf].filter(Boolean).join(" · "),
    price: p.price != null ? Number(p.price) : null,
    promotion: p.promotion_active && p.promotion_price != null ? Number(p.promotion_price) : null,
    stock: p.stock_visible ? p.stock : null,
    image_url: p.image_url, description: p.description,
  };
}

function ProductDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { addProduct, adding } = useCart();
  const [qty, setQty] = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);

  const { customer } = useCustomer();

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

  useEffect(() => {
    if (data && customer?.id) {
      logHistory(customer.id, "product_view", { product_id: id, product_name: data.name });
    }
  }, [data, customer?.id, id]);

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
        .select("*")
        .in("id", ids)
        .eq("active", true);
      return prods ?? [];
    },
  });

  const relatedRecs = useMemo(() => related.map(toRec), [related]);

  if (isLoading) return <ProductDetailSkeleton />;
  if (!data) {
    return (
      <div className="px-6 py-16 text-center">
        <Package className="h-20 w-20 text-muted-foreground mx-auto mb-4 opacity-40" />
        <p className="text-2xl font-bold text-primary">Produto não disponível</p>
        <p className="text-muted-foreground mt-2">Pode ter sido removido ou está temporariamente indisponível.</p>
        <button onClick={() => router.history.back()} className="mt-6 px-6 py-3 rounded-xl bg-accent text-accent-foreground font-bold text-lg">
          Voltar
        </button>
      </div>
    );
  }
  const p = data;
  const showPromo = p.promotion_active && p.promotion_price != null;
  const displayPrice = showPromo ? Number(p.promotion_price) : p.price != null ? Number(p.price) : null;
  const totalPrice = displayPrice != null ? displayPrice * qty : null;
  const stockLow = p.stock_visible && p.stock <= 5 && p.stock > 0;
  const outOfStock = p.stock_visible && p.stock <= 0;

  async function handleAddToCart() {
    if (!p.id || !displayPrice) return;
    for (let i = 0; i < qty; i++) {
      await addProduct(p.id, p.name, displayPrice, [p.section, p.aisle, p.shelf].filter(Boolean).join(" · ") || null);
    }
  }

  return (
    <div className="min-h-[calc(100vh-7rem)] px-4 md:px-6 py-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/kiosk/search" className="hover:text-accent transition font-medium">Catálogo</Link>
        {p.category && (
          <>
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-[200px]">{p.category}</span>
          </>
        )}
      </nav>

      {/* Main card */}
      <div className="grid md:grid-cols-2 gap-8 bg-card border rounded-3xl p-4 md:p-8 shadow-lg animate-fade-in">
        {/* Image */}
        <div className="relative aspect-square rounded-2xl bg-gradient-to-br from-muted to-muted/50 overflow-hidden flex items-center justify-center group">
          {p.image_url ? (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-10 w-10 rounded-full border-4 border-muted-foreground/20 border-t-accent animate-spin" />
                </div>
              )}
              <img
                src={p.image_url}
                alt={p.name}
                onLoad={() => setImgLoaded(true)}
                className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </>
          ) : (
            <Package className="h-32 w-32 text-muted-foreground/40" />
          )}
          {showPromo && (
            <span className="absolute top-4 left-4 bg-destructive text-destructive-foreground text-sm font-bold px-3 py-1.5 rounded-full shadow-lg inline-flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" /> Promoção
            </span>
          )}
          {outOfStock && (
            <span className="absolute top-4 right-4 bg-foreground/80 text-background text-xs font-bold px-3 py-1.5 rounded-full">
              Sem stock
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary leading-tight">{p.name}</h1>
            {p.category && (
              <p className="text-muted-foreground mt-1.5 text-base">{p.category}</p>
            )}

            {/* Price */}
            {displayPrice != null && (
              <div className="mt-5 flex items-baseline gap-3">
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
                    <span className="text-xs font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                      -{Math.round((1 - Number(p.promotion_price) / Number(p.price)) * 100)}%
                    </span>
                  </>
                ) : (
                  <span className="text-4xl font-extrabold text-primary">{formatPrice(p.price)}</span>
                )}
              </div>
            )}

            {/* Stock */}
            {p.stock_visible && (
              <div className="mt-3 flex items-center gap-2">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${p.stock > 0 ? "bg-emerald-500" : "bg-destructive"}`} />
                <span className={`text-sm font-semibold ${stockLow ? "text-amber-600" : outOfStock ? "text-destructive" : "text-emerald-600"}`}>
                  {outOfStock ? "Fora de stock" : stockLow ? `Apenas ${p.stock} em stock` : `Em stock (${p.stock})`}
                </span>
              </div>
            )}

            {/* Description */}
            {p.description && (
              <p className="mt-5 text-lg text-foreground/80 leading-relaxed border-t border-border pt-5">
                {p.description}
              </p>
            )}
          </div>

          {/* CTA area */}
          <div className="mt-8 space-y-4">
            {/* Location */}
            <div className="bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-accent" /> Localização na loja
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-background/60 rounded-xl p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Secção</div>
                  <div className="text-lg font-bold text-primary">{p.section || "—"}</div>
                </div>
                <div className="bg-background/60 rounded-xl p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Corredor</div>
                  <div className="text-lg font-bold text-primary">{p.aisle || "—"}</div>
                </div>
                <div className="bg-background/60 rounded-xl p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Prateleira</div>
                  <div className="text-lg font-bold text-primary">{p.shelf || "—"}</div>
                </div>
              </div>
            </div>

            {/* Quantity + Add to cart */}
            {displayPrice != null && !outOfStock && (
              <div className="flex items-stretch gap-3">
                <div className="flex items-center bg-muted rounded-2xl border border-border">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="p-3 md:p-4 hover:bg-muted/80 transition rounded-l-2xl text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="w-14 text-center font-bold text-xl tabular-nums">{qty}</span>
                  <button
                    onClick={() => setQty(Math.min(99, qty + 1))}
                    className="p-3 md:p-4 hover:bg-muted/80 transition rounded-r-2xl text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={adding.has(p.id)}
                  className="flex-1 kiosk-btn bg-accent text-accent-foreground py-3 md:py-4 text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99] rounded-2xl"
                >
                  {adding.has(p.id) ? (
                    <span className="h-5 w-5 rounded-full border-2 border-accent-foreground border-t-transparent animate-spin" />
                  ) : (
                    <ShoppingCart className="h-5 w-5" />
                  )}
                  {adding.has(p.id) ? "A adicionar..." : `Adicionar — ${formatPrice(totalPrice!)}`}
                </button>
              </div>
            )}
            {outOfStock && (
              <div className="w-full py-4 rounded-2xl bg-destructive/10 border-2 border-destructive/20 text-destructive text-center font-bold text-lg">
                Produto indisponível
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related products */}
      {relatedRecs.length > 0 && (
        <section className="mt-12 animate-fade-in">
          <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
            Talvez precises disto também
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedRecs.map((r) => (
              <ProductCard key={r.id} product={r} showAddToCart />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="px-4 md:px-6 py-6 max-w-6xl mx-auto animate-pulse">
      <div className="h-5 bg-muted rounded w-40 mb-6" />
      <div className="grid md:grid-cols-2 gap-8 bg-card border rounded-3xl p-4 md:p-8">
        <div className="aspect-square rounded-2xl bg-muted" />
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-5 bg-muted rounded w-1/2" />
          <div className="h-10 bg-muted rounded w-1/3 mt-4" />
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-20 bg-muted rounded w-full mt-4" />
          <div className="h-24 bg-muted rounded-2xl w-full mt-6" />
          <div className="h-16 bg-muted rounded-2xl w-full" />
        </div>
      </div>
    </div>
  );
}
