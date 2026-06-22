import { createFileRoute, Link, Outlet, redirect, isRedirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdminSession } from "@/lib/use-admin-session";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Package, Wrench, Tag, LogOut, Home, Bell, Sparkles, Users, Menu, X, FileText, QrCode, Settings } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAssistanceRequests, playChime } from "@/lib/assistance";
import { toast } from "sonner";
import { verifyAdmin } from "@/lib/admin-guard.functions";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    // Allow the login page through without server check.
    if (location.pathname === "/admin/login") return;
    
    // Skip checking authentication on the server during SSR (since session is localStorage-based).
    if (typeof window === "undefined") return;

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        throw redirect({ to: "/admin/login" });
      }
      const result = await verifyAdmin();
      if (!result.isAdmin) {
        // Authenticated but not admin: send back to kiosk root.
        throw redirect({ to: "/" });
      }
    } catch (e) {
      // Always re-throw redirects so navigation happens.
      if (isRedirect(e)) throw e;
      // Real error (network, server down): go to login instead of looping.
      console.error("[admin beforeLoad]", e);
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminLayout,
});


function AdminLayout() {
  const { status, user, recheck } = useAdminSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (status === "anonymous" && pathname !== "/admin/login") {
      navigate({ to: "/admin/login" });
    }
  }, [status, pathname, navigate]);

  // IMPORTANT: all hooks must be declared before any conditional return
  // (React rules of hooks — otherwise produces error #310).
  const { items: pendingRequests } = useAssistanceRequests({
    onNew: () => {
      if (status === "admin") {
        playChime();
        toast("Novo pedido de assistência", { icon: "🛎️" });
      }
    },
  });
  const pendingCount = (pendingRequests ?? []).filter((r) => r?.status === "pending").length;

  if (pathname === "/admin/login") return <Outlet />;

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto mb-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          Estamos a preparar o painel…
        </div>
      </div>
    );
  }
  if (status === "anonymous") {
    return <div className="p-10 text-muted-foreground">A redirecionar…</div>;
  }
  if (status === "user") {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div className="max-w-md bg-card border rounded-2xl p-8">
          <h2 className="text-xl font-bold text-primary">Conta sem permissões</h2>
          <p className="mt-3 text-muted-foreground">
            Esta conta ({user?.email}) ainda não foi reconhecida como admin. Tente novamente — a permissão pode ainda estar a sincronizar.
          </p>
          <p className="mt-2 text-xs text-muted-foreground break-all">
            user_id: <code>{user?.id}</code>
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <button
              onClick={() => recheck()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              Tentar novamente
            </button>
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/admin/login" }); }}
              className="px-4 py-2 rounded-lg border text-sm"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  const items = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/products", label: "Produtos", icon: Package },
    { to: "/admin/problems", label: "Problemas", icon: Wrench },
    { to: "/admin/categories", label: "Categorias", icon: Tag },
    { to: "/admin/customers", label: "Clientes", icon: Users },
    { to: "/admin/orders", label: "Faturas", icon: FileText },
    { to: "/admin/assistant", label: "Assistente IA", icon: Sparkles },
    { to: "/admin/assistance", label: "Assistência", icon: Bell },
    { to: "/admin/qrcodes", label: "QR Codes", icon: QrCode },
    { to: "/admin/settings", label: "Definições", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Mobile top header bar */}
      <header className="flex md:hidden items-center justify-between bg-sidebar text-sidebar-foreground px-4 py-3 border-b border-sidebar-border shadow-sm">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-auto bg-white rounded p-0.5" />
          <div>
            <div className="font-bold text-sm leading-none">MaterAssist</div>
            <div className="text-[10px] opacity-70 mt-0.5">Admin</div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 hover:bg-sidebar-accent rounded-lg transition"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Collapsible sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground p-4 flex flex-col border-r border-sidebar-border
          transition-transform duration-300 ease-in-out shrink-0
          md:transform-none md:flex
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Close button inside mobile menu */}
        <div className="flex md:hidden items-center justify-between mb-6 px-2 pb-2 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-auto bg-white rounded p-0.5" />
            <span className="font-bold text-sm">MaterAssist</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 hover:bg-sidebar-accent rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Desktop Title & Logo */}
        <div className="hidden md:flex items-center gap-2 mb-8 px-2">
          <Logo className="h-10 w-auto bg-white rounded p-0.5" />
          <div>
            <div className="font-bold">MaterAssist</div>
            <div className="text-xs opacity-70">Admin</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {items.map((it) => {
            const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent"}`}
              >
                <it.icon className="h-4 w-4" />
                <span className="flex-1">{it.label}</span>
                {it.to === "/admin/assistance" && pendingCount > 0 && (
                  <span className="text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-2 py-0.5">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 pt-4 border-t border-sidebar-border">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-sidebar-accent">
            <Home className="h-4 w-4" /> Ver quiosque
          </Link>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/admin/login" }); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-4 md:p-8"><Outlet /></main>
    </div>
  );
}
