import { X, ImageOff, Package, Tag, MapPin, ShoppingCart, ArrowLeftRight } from "lucide-react";
import { useCompare } from "@/lib/useCompare";
import { useCart } from "@/lib/useCart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CompareOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { products, remove, clear } = useCompare();
  const { addProduct, adding } = useCart();

  if (products.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Comparar produtos
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(products.length, 4)}, minmax(0, 1fr))` }}>
          {products.map((p) => {
            const hasPromo = p.promotion != null;
            const price = hasPromo ? p.promotion! : p.price;
            const isAdding = adding.has(p.id);

            return (
              <div key={p.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="relative aspect-square bg-muted">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageOff className="h-12 w-12" />
                    </div>
                  )}
                  <button
                    onClick={() => remove(p.id)}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition shadow-sm"
                    title="Remover"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {hasPromo && (
                    <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full shadow">
                      PROMO
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  <h3 className="font-bold text-base leading-tight line-clamp-2">{p.name}</h3>

                  <div className="space-y-2 text-sm flex-1">
                    {p.category && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Tag className="h-3.5 w-3.5 shrink-0" />
                        <span>{p.category}</span>
                      </div>
                    )}
                    {p.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{p.location}</span>
                      </div>
                    )}
                    {p.stock != null && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Package className="h-3.5 w-3.5 shrink-0" />
                        <span>{p.stock > 0 ? `${p.stock} em stock` : "Sem stock"}</span>
                      </div>
                    )}
                    {p.description && (
                      <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3 mt-2">
                        {p.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2 pt-2 border-t border-border">
                    {hasPromo ? (
                      <>
                        <span className="text-xl font-bold text-destructive">
                          {p.promotion!.toFixed(2)} €
                        </span>
                        {p.price != null && (
                          <span className="text-sm text-muted-foreground line-through">
                            {p.price.toFixed(2)} €
                          </span>
                        )}
                      </>
                    ) : (
                      p.price != null && (
                        <span className="text-xl font-bold">{p.price.toFixed(2)} €</span>
                      )
                    )}
                  </div>

                  {price != null && (
                    <button
                      onClick={() => addProduct(p.id, p.name, price, p.location)}
                      disabled={isAdding}
                      className="mt-auto w-full kiosk-btn bg-accent/10 hover:bg-accent/20 text-accent-foreground font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 border border-accent/20 transition disabled:opacity-50"
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
              </div>
            );
          })}
        </div>

        {products.length >= 2 && (
          <div className="mt-6 border-t pt-4">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="py-2 pr-4 font-semibold text-muted-foreground w-32">Preço</td>
                  {products.map((p) => {
                    const hasPromo = p.promotion != null;
                    return (
                      <td key={p.id} className="py-2">
                        {hasPromo ? (
                          <div>
                            <span className="font-bold text-destructive">{p.promotion!.toFixed(2)} €</span>
                            {p.price != null && <span className="ml-1 text-xs line-through text-muted-foreground">{p.price.toFixed(2)} €</span>}
                          </div>
                        ) : (
                          <span className="font-bold">{p.price?.toFixed(2) ?? "—"} €</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-semibold text-muted-foreground">Categoria</td>
                  {products.map((p) => (
                    <td key={p.id} className="py-2">{p.category ?? "—"}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-semibold text-muted-foreground">Localização</td>
                  {products.map((p) => (
                    <td key={p.id} className="py-2">{p.location || "—"}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-semibold text-muted-foreground">Stock</td>
                  {products.map((p) => (
                    <td key={p.id} className="py-2">{p.stock != null ? (p.stock > 0 ? `${p.stock} un.` : "Sem stock") : "—"}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
