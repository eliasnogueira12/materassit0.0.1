import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, ShoppingCart, X, ShoppingBag, Package, MapPin } from "lucide-react";
import { useFavorites } from "@/lib/useFavorites";
import { useCart } from "@/lib/useCart";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function FavoritesFAB() {
  const { favoriteIds } = useFavorites();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 z-40 kiosk-btn bg-pink-500 text-white rounded-full shadow-xl hover:scale-110 transition-all duration-200 flex items-center gap-2 px-5 py-3.5"
        aria-label="Abrir favoritos"
      >
        <Heart className="h-6 w-6" />
        {favoriteIds.size > 0 && (
          <span className="min-w-[1.5rem] h-6 bg-white text-pink-600 text-sm font-bold rounded-full flex items-center justify-center">
            {favoriteIds.size}
          </span>
        )}
      </button>
      <FavoritesPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function FavoritesPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { favoriteIds, toggle } = useFavorites();
  const { addProduct, adding } = useCart();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const ids = useMemo(() => [...favoriteIds], [favoriteIds]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["favorites-products", ids],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from("products")
        .select(
          "id, name, price, image_url, section, aisle, shelf, promotion_active, promotion_price",
        )
        .in("id", ids)
        .eq("active", true);
      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        price:
          p.promotion_active && p.promotion_price != null
            ? Number(p.promotion_price)
            : Number(p.price),
        image_url: p.image_url,
        location: [p.section, p.aisle, p.shelf].filter(Boolean).join(" · "),
      }));
    },
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function handleAdd(p: {
    id: string;
    name: string;
    price: number;
    location: string | null;
  }) {
    if (!p.id || !p.price) return;
    await addProduct(p.id, p.name, p.price, p.location);
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />
      )}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-background border-l shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Heart className="h-6 w-6 text-pink-500" /> Favoritos
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <span className="h-8 w-8 rounded-full border-4 border-muted-foreground/20 border-t-pink-500 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
              <Heart className="h-20 w-20 opacity-30" />
              <p className="text-xl font-medium">Nenhum favorito</p>
              <p className="text-sm text-center max-w-64">
                Adicione produtos aos favoritos tocando no coração durante a navegação.
              </p>
            </div>
          ) : (
            products.map((p) => (
              <div
                key={p.id}
                className="bg-card border rounded-2xl p-4 flex items-center gap-4 animate-fade-in"
              >
                <div
                  className="h-16 w-16 rounded-xl bg-muted overflow-hidden shrink-0 cursor-pointer"
                  onClick={() => {
                    onClose();
                    navigate({ to: "/kiosk/product/$id", params: { id: p.id } });
                  }}
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-primary text-base leading-tight line-clamp-2 cursor-pointer hover:text-accent transition"
                    onClick={() => {
                      onClose();
                      navigate({ to: "/kiosk/product/$id", params: { id: p.id } });
                    }}
                  >
                    {p.name}
                  </p>
                  {p.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {p.location}
                    </p>
                  )}
                  <p className="text-sm font-bold text-pink-500 mt-0.5">
                    {Number(p.price).toFixed(2)} €
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleAdd(p)}
                    disabled={adding.has(p.id)}
                    className="kiosk-btn h-12 w-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center hover:bg-accent/20 transition disabled:opacity-50"
                  >
                    {adding.has(p.id) ? (
                      <span className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    ) : (
                      <ShoppingCart className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => toggle(p.id, p.name)}
                    className="kiosk-btn h-12 w-12 rounded-xl border border-pink-200 flex items-center justify-center hover:bg-pink-50 transition"
                  >
                    <Heart className="h-5 w-5 text-pink-500" fill="currentColor" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
