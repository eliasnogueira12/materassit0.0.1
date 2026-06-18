import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Home, Search, Wrench, Sparkles, Clock } from "lucide-react";
import { useKioskIdle } from "@/lib/kiosk-idle";
import { Logo } from "@/components/Logo";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { clearKioskSession } from "@/lib/customer";
import { CartProvider } from "@/lib/useCart";
import { CartFAB } from "@/components/CartDrawer";
import { FavoritesProvider } from "@/lib/useFavorites";
import { FavoritesFAB } from "@/components/FavoritesDrawer";

export const Route = createFileRoute("/kiosk")({
  component: KioskLayout,
});

function KioskLayout() {
  const { warning, secondsLeft, dismiss, endSession } = useKioskIdle(); // 15-second total timeout
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between shadow-md">
        <Link to="/" className="flex items-center gap-3">
          <Logo className="h-12 w-auto bg-white rounded-lg p-1" />
          <span className="text-xl font-bold">MaterAssist</span>
        </Link>
        <nav className="flex gap-2">
          <NavLink to="/kiosk/start" icon={<Sparkles className="h-5 w-5" />} label="Assistente" />
          <NavLink to="/kiosk/search" icon={<Search className="h-5 w-5" />} label="Produtos" />
          <NavLink to="/kiosk/problems" icon={<Wrench className="h-5 w-5" />} label="Problemas" />
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
            <Outlet />
            <CartFAB />
            <FavoritesFAB />
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
