import { MapPin, Tag, Package, ImageOff } from "lucide-react";
import type { RecommendedProduct } from "@/lib/assistant.functions";

export function ProductCard({ product }: { product: RecommendedProduct }) {
  const hasPromo = product.promotion != null;
  return (
    <div className="group rounded-2xl border bg-card/90 backdrop-blur shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 animate-fade-in">
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-10 w-10" />
          </div>
        )}
        {hasPromo && (
          <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full shadow">
            PROMO
          </span>
        )}
      </div>
      <div className="p-4 space-y-2">
        <h4 className="font-semibold text-base leading-tight line-clamp-2">{product.name}</h4>
        {product.category && (
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Tag className="h-3 w-3" /> {product.category}
          </p>
        )}
        {product.location && (
          <p className="text-sm inline-flex items-center gap-1.5 text-primary">
            <MapPin className="h-4 w-4" /> {product.location}
          </p>
        )}
        <div className="flex items-baseline gap-2 pt-1">
          {hasPromo ? (
            <>
              <span className="text-lg font-bold text-destructive">
                {product.promotion!.toFixed(2)} €
              </span>
              {product.price != null && (
                <span className="text-sm text-muted-foreground line-through">
                  {product.price.toFixed(2)} €
                </span>
              )}
            </>
          ) : (
            product.price != null && (
              <span className="text-lg font-bold">{product.price.toFixed(2)} €</span>
            )
          )}
          {product.stock != null && (
            <span className="ml-auto text-xs inline-flex items-center gap-1 text-muted-foreground">
              <Package className="h-3 w-3" /> {product.stock} un.
            </span>
          )}
        </div>
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
        )}
      </div>
    </div>
  );
}
