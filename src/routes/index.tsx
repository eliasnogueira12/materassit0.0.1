import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Shield } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useEffect, useRef, useState } from "react";
import { clearKioskSession } from "@/lib/customer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MaterAssist — MarquesMater" },
      { name: "description", content: "Toque para começar." },
    ],
  }),
  component: Home,
});

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 12) return "Bom dia";
  if (h < 19) return "Boa tarde";
  return "Boa noite";
}

const ADMIN_TAPS = 7;
const TAP_WINDOW_MS = 3000;

function Home() {
  const [greeting, setGreeting] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearKioskSession();
    setGreeting(greetingFor(new Date()));
    const id = setInterval(() => setGreeting(greetingFor(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);

  function handleLogoTap() {
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    if (tapCount.current >= ADMIN_TAPS) {
      setShowAdmin(true);
      tapCount.current = 0;
    } else {
      tapTimer.current = setTimeout(() => { tapCount.current = 0; }, TAP_WINDOW_MS);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary via-primary to-[hsl(220,60%,15%)] text-primary-foreground">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl" />

      <div className="relative min-h-screen flex flex-col items-center justify-center px-8 text-center">
        <button onClick={handleLogoTap} className="cursor-pointer">
          <Logo className="h-28 w-auto mb-8 drop-shadow-2xl bg-white/95 rounded-2xl p-3" />
        </button>
        <p className="text-2xl md:text-3xl opacity-90 mb-2 min-h-[2.25rem]">{greeting ? `${greeting}!` : "\u00A0"}</p>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
          Bem-vindo à MarquesMater
        </h1>
        <p className="mt-4 text-xl md:text-2xl opacity-80 max-w-2xl">
          Toque para descobrir o produto certo para si.
        </p>

        <Link
          to="/kiosk/start"
          className="kiosk-btn mt-14 bg-accent text-accent-foreground text-4xl md:text-5xl px-20 py-10 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-transform animate-[pulse_3s_ease-in-out_infinite]"
        >
          Início <ArrowRight className="ml-4 h-10 w-10" />
        </Link>
      </div>

      {showAdmin && (
        <Link
          to="/admin/login"
          className="absolute bottom-4 right-4 flex items-center gap-1 text-xs opacity-50 hover:opacity-100 animate-fade-in"
        >
          <Shield className="h-3.5 w-3.5" /> Admin
        </Link>
      )}
    </main>
  );
}
