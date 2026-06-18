import { MapPin, Tag, Package, ImageOff, Eye, ShoppingCart, Plus, Heart } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { RecommendedProduct } from "@/lib/assistant.functions";
import { useCart } from "@/lib/useCart";
import { useFavorites } from "@/lib/useFavorites";

export function ProductCard({ product, showAddToCart }: { product: RecommendedProduct; showAddToCart?: boolean }) {
  const navigate = useNavigate();
  const { addProduct, adding } = useCart();
  const { favoriteIds, toggle } = useFavorites();
  const hasPromo = product.promotion != null;
  const price = hasPromo ? product.promotion! : product.price;
  const isAdding = adding.has(product.id);
  const isFav = favoriteIds.has(product.id);

  function handleClick() {
    if (product.id) {
      navigate({ to: "/kiosk/product/$id", params: { id: product.id } });
    }
  }

  async function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    if (!product.id || !price) return;
    await addProduct(product.id, product.name, price, product.location);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group rounded-2xl border-2 border-transparent bg-card/90 backdrop-blur shadow-sm overflow-hidden hover:shadow-xl hover:border-accent hover:-translate-y-1 transition-all duration-300 animate-fade-in text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="aspect-square bg-muted relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-16 w-16" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 bg-white/90 text-foreground font-bold px-5 py-2.5 rounded-xl text-base shadow-lg inline-flex items-center gap-2">
            <Eye className="h-5 w-5" /> Ver
          </span>
        </div>
        {hasPromo && (
          <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full shadow">
            PROMO
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); toggle(product.id, product.name); }}
          className="absolute top-2 right-2 h-9 w-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition shadow-sm"
        >
          <Heart
            className={`h-5 w-5 ${isFav ? "text-pink-500" : "text-gray-400"}`}
            fill={isFav ? "currentColor" : "none"}
          />
        </button>
      </div>
      <div className="p-3 space-y-1.5">
        <h4 className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</h4>
        {product.location && (
          <p className="text-xs inline-flex items-center gap-1.5 text-primary">
            <MapPin className="h-3 w-3" /> {product.location}
          </p>
        )}
        <div className="flex items-baseline gap-2 pt-1">
          {hasPromo ? (
            <>
              <span className="text-base font-bold text-destructive">
                {product.promotion!.toFixed(2)} €
              </span>
              {product.price != null && (
                <span className="text-xs text-muted-foreground line-through">
                  {product.price.toFixed(2)} €
                </span>
              )}
            </>
          ) : (
            product.price != null && (
              <span className="text-base font-bold">{product.price.toFixed(2)} €</span>
            )
          )}
        </div>
        {showAddToCart && price != null && (
          <button
            onClick={handleAdd}
            disabled={isAdding}
            className="mt-2 w-full kiosk-btn bg-accent/10 hover:bg-accent/20 text-accent-foreground font-semibold py-2 rounded-xl text-sm flex items-center justify-center gap-2 border border-accent/20 transition disabled:opacity-50"
          >
            {isAdding ? (
              <span className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
            {isAdding ? "A adicionar..." : "Adicionar ao carrinho"}
          </button>
        )}
      </div>
    </button>
  );
}
