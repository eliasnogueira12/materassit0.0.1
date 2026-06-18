import { useEffect, useRef, useState } from "react";
import { ShoppingCart, Plus, Minus, Trash2, X, ArrowRight, Package, MapPin, Tag, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/useCart";
import { formatPrice } from "@/lib/format";
import { useNavigate } from "@tanstack/react-router";

export function CartFAB() {
  const { itemCount, items } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 kiosk-btn bg-accent text-accent-foreground rounded-full shadow-xl hover:scale-110 transition-all duration-200 flex items-center gap-2 px-5 py-3.5"
        aria-label="Abrir carrinho"
      >
        <ShoppingCart className="h-6 w-6" />
        {itemCount > 0 && (
          <span className="min-w-[1.5rem] h-6 bg-destructive text-destructive-foreground text-sm font-bold rounded-full flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </button>
      <CartPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function CartPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, subtotal, updateQty, removeItem, checkout, loading } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function handleCheckout() {
    setCheckingOut(true);
    try {
      const result = await checkout();
      if (result) {
        onClose();
        navigate({ to: "/kiosk/invoice/$token", params: { token: result.token } });
      }
    } catch (err) {
      console.error("[Cart] Checkout error:", err);
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      )}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-background border-l shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-accent" /> Carrinho
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
              <ShoppingCart className="h-20 w-20 opacity-30" />
              <p className="text-xl font-medium">Carrinho vazio</p>
              <p className="text-sm text-center max-w-64">Adicione produtos através do assistente ou da pesquisa de produtos.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="bg-card border rounded-2xl p-4 flex items-center gap-4 animate-fade-in">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary text-base leading-tight line-clamp-2">{item.product_name}</p>
                  {item.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {item.location}
                    </p>
                  )}
                  <p className="text-sm font-bold text-accent mt-1">{formatPrice(Number(item.price))}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => item.quantity > 1 ? updateQty(item.id, item.quantity - 1) : removeItem(item.id)}
                    className="kiosk-btn h-14 w-14 rounded-full border-2 flex items-center justify-center hover:bg-muted transition text-xl"
                  >
                    {item.quantity > 1 ? <Minus className="h-6 w-6" /> : <Trash2 className="h-6 w-6 text-destructive" />}
                  </button>
                  <span className="w-10 text-center font-extrabold text-2xl">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.id, item.quantity + 1)}
                    className="kiosk-btn h-14 w-14 rounded-full border-2 flex items-center justify-center hover:bg-muted transition text-xl"
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-5 space-y-3 bg-card/50 backdrop-blur">
            <div className="flex justify-between items-center text-lg">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-extrabold text-2xl text-primary">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              IVA incluído. Pague no balcão e levante os produtos.
            </p>
            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full kiosk-btn bg-accent text-accent-foreground py-5 text-xl font-extrabold flex items-center justify-center gap-3 disabled:opacity-50 rounded-xl"
            >
              {checkingOut ? "A gerar fatura..." : "Finalizar Pedido"}
              <ArrowRight className="h-6 w-6" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
