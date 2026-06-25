import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Home, Search, Wrench, Sparkles, Clock, Paintbrush } from "lucide-react";
import { useKioskIdle } from "@/lib/kiosk-idle";
import { Logo } from "@/components/Logo";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import { clearKioskSession } from "@/lib/customer";
import { CartProvider } from "@/lib/useCart";
import { CartFAB } from "@/components/CartDrawer";
import { FavoritesProvider } from "@/lib/useFavorites";
import { FavoritesFAB } from "@/components/FavoritesDrawer";
import { CompareProvider } from "@/lib/useCompare";
import { CompareBar } from "@/components/CompareBar";
import { useKioskConfig, getKioskLabel, getEnabledPages } from "@/lib/useKioskConfig";
import type { KioskPage } from "@/lib/useKioskConfig";

export const Route = createFileRoute("/kiosk")({
  component: KioskLayout,
});

const NAV_ITEMS: { page: KioskPage; to: string; icon: React.ReactNode; label: string }[] = [
  { page: "paints", to: "/kiosk/paints", icon: <Paintbrush className="h-5 w-5" />, label: "Tintas" },
  { page: "assistant", to: "/kiosk/assistant", icon: <Sparkles className="h-5 w-5" />, label: "Assistente" },
  { page: "search", to: "/kiosk/search", icon: <Search className="h-5 w-5" />, label: "Produtos" },
  { page: "problems", to: "/kiosk/problems", icon: <Wrench className="h-5 w-5" />, label: "Problemas" },
];

function KioskLayout() {
  const { warning, secondsLeft, dismiss, endSession } = useKioskIdle();
  const navigate = useNavigate();
  const { config, loading } = useKioskConfig();
  const kioskLabel = getKioskLabel();

  const enabledPages = loading
    ? Object.fromEntries(NAV_ITEMS.map((n) => [n.page, true]))
    : getEnabledPages(config, kioskLabel);

  const visibleNavItems = NAV_ITEMS.filter((n) => enabledPages[n.page]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between shadow-md">
        <Link to="/" className="flex items-center gap-3">
          <Logo className="h-12 w-auto bg-white rounded-lg p-1" />
          <span className="text-xl font-bold">MaterAssist</span>
        </Link>
        <nav className="flex gap-2">
          <NavLink to="/kiosk/start" icon={<Home className="h-5 w-5" />} label="Início" />
          {visibleNavItems.map((item) => (
            <NavLink key={item.page} to={item.to} icon={item.icon} label={item.label} />
          ))}
          <button
            onClick={() => {
              clearKioskSession();
              navigate({ to: "/" });
            }}
            className="kiosk-btn bg-accent text-accent-foreground px-5 py-2.5 text-base"
          >
            <Home className="mr-2 h-5 w-5" /> Início
          </button>
        </nav>
      </header>
      <main className="flex-1 overflow-auto">
        <CartProvider>
          <FavoritesProvider>
            <CompareProvider>
              <Outlet />
              <CartFAB />
              <FavoritesFAB />
              <CompareBar />
            </CompareProvider>
          </FavoritesProvider>
        </CartProvider>
      </main>

      <Dialog open={warning} onOpenChange={(o) => !o && dismiss()}>
        <DialogContent className="max-w-md text-center p-8 rounded-3xl border-2 border-accent/20 bg-background/95 backdrop-blur-xl shadow-2xl animate-scale-in">
          <DialogHeader className="flex flex-col items-center">
            <div className="h-16 w-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <DialogTitle className="text-2xl font-black text-primary tracking-tight">
              A sessão vai expirar!
            </DialogTitle>
            <DialogDescription className="text-lg text-muted-foreground mt-2">
              Por motivos de privacidade, a sua sessão será limpa automaticamente em:
              <div className="my-4 text-7xl font-black text-accent select-none animate-bounce">
                {secondsLeft}s
              </div>
              Deseja continuar a utilizar o quiosque?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={dismiss}
              className="w-full sm:flex-1 py-4 rounded-2xl bg-accent text-accent-foreground font-extrabold text-lg shadow-lg shadow-accent/25 hover:scale-[1.02] transition cursor-pointer"
            >
              Sim, Continuar
            </button>
            <button
              onClick={endSession}
              className="w-full sm:flex-1 py-4 rounded-2xl border-2 border-border text-foreground font-bold hover:bg-muted/80 transition cursor-pointer"
            >
              Terminar agora
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="px-5 py-2.5 rounded-xl text-base font-medium hover:bg-white/10 flex items-center gap-2"
    >
      {icon}
      {label}
    </Link>
  );
}
