import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Shield } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useEffect, useRef, useState } from "react";
import { clearKioskSession } from "@/lib/customer";
import { useFullscreen, useWakeLock } from "@/lib/useKiosk";
import { useI18n, greetingFor } from "@/lib/i18n";
import { useAccessibility } from "@/lib/useAccessibility";
import DigitalSignage from "@/components/DigitalSignage";
import QRCode from "@/components/QRCode";
import type { Lang } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MaterAssist — MarquesMater" },
      { name: "description", content: "Toque para começar." },
    ],
  }),
  component: Home,
});

const ADMIN_TAPS = 7;
const TAP_WINDOW_MS = 3000;
const AMBIENT_IDLE_MS = 30_000;

function Home() {
  const { t, lang, setLang } = useI18n();
  const { fontSize, setFontSize, highContrast, setHighContrast } = useAccessibility();
  const [showAdmin, setShowAdmin] = useState(false);
  const [ambient, setAmbient] = useState(false);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ambientTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fs = useFullscreen();
  useWakeLock();

  function resetAmbient() {
    setAmbient(false);
    clearTimeout(ambientTimer.current);
    ambientTimer.current = setTimeout(() => setAmbient(true), AMBIENT_IDLE_MS);
  }

  useEffect(() => {
    clearKioskSession();
    resetAmbient();
    const events = ["mousedown", "touchstart", "keydown", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetAmbient));
    return () => {
      clearTimeout(ambientTimer.current);
      events.forEach((e) => window.removeEventListener(e, resetAmbient));
    };
  }, []);

  function handleFirstTap() {
    fs.enter();
    resetAmbient();
  }

  function handleLogoTap() {
    fs.enter();
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    if (tapCount.current >= ADMIN_TAPS) {
      setShowAdmin(true);
      tapCount.current = 0;
    } else {
      tapTimer.current = setTimeout(() => { tapCount.current = 0; }, TAP_WINDOW_MS);
    }
  }

  if (ambient) return <div onClick={resetAmbient}><DigitalSignage /></div>;

  return (
    <main onClick={handleFirstTap} className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary via-primary to-[hsl(220,60%,15%)] text-primary-foreground">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl" />

      {/* Top toolbar */}
      <div className="absolute top-4 right-4 flex items-center gap-2 text-xs z-10">
        {(["pt", "en", "es"] as Lang[]).map((l) => (
          <button key={l} onClick={() => setLang(l)}
            className={`px-2 py-1 rounded font-semibold transition ${lang === l ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"}`}>
            {l.toUpperCase()}
          </button>
        ))}
        <span className="text-white/20">|</span>
        <button onClick={() => setFontSize(Math.max(80, fontSize - 10))} className="text-white/50 hover:text-white/80 px-1" title={t("font_size")}>A−</button>
        <span className="text-white/50 text-xs w-5 text-center">{fontSize}%</span>
        <button onClick={() => setFontSize(Math.min(150, fontSize + 10))} className="text-white/50 hover:text-white/80 px-1" title={t("font_size")}>A+</button>
        <span className="text-white/20">|</span>
        <button onClick={() => setHighContrast(!highContrast)}
          className={`px-2 py-1 rounded font-semibold transition ${highContrast ? "bg-white text-black" : "text-white/50 hover:text-white/80"}`}>
          {t("high_contrast")}
        </button>
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center px-8 text-center">
        <button onClick={handleLogoTap} className="cursor-pointer">
          <Logo className="h-28 w-auto mb-8 drop-shadow-2xl bg-white/95 rounded-2xl p-3" />
        </button>
        <p className="text-2xl md:text-3xl opacity-90 mb-2 min-h-[2.25rem]">{greetingFor(new Date(), lang)}!</p>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
          {t("welcome")}
        </h1>
        <p className="mt-4 text-xl md:text-2xl opacity-80 max-w-2xl">
          {t("subtitle")}
        </p>

        <Link
          to="/kiosk/start"
          onClick={resetAmbient}
          className="kiosk-btn mt-14 bg-accent text-accent-foreground text-4xl md:text-5xl px-20 py-10 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-transform animate-[pulse_3s_ease-in-out_infinite]"
        >
          {t("start")} <ArrowRight className="ml-4 h-10 w-10" />
        </Link>

        {/* QR continue on phone */}
        <div className="mt-10 flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition">
          <p className="text-xs">{t("continue_phone")}</p>
          <QRCode url={"https://materassist.vercel.app/kiosk/start"} size={100} />
          <p className="text-xs opacity-60">{t("scan_qr")}</p>
        </div>
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
