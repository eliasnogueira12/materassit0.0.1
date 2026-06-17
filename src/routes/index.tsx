import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Shield } from "lucide-react";
import { Logo } from "@/components/Logo";
import { YouTubeShowcase } from "@/components/YouTubeShowcase";
import { useEffect, useRef, useState } from "react";
import { clearKioskSession } from "@/lib/customer";
import { useFullscreen, useWakeLock } from "@/lib/useKiosk";
import { useI18n, greetingFor, FLAGS, type Lang } from "@/lib/i18n";
import { useAccessibility } from "@/lib/useAccessibility";

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

function Home() {
  const { t, lang, setLang } = useI18n();
  const { fontSize, setFontSize, highContrast, setHighContrast } = useAccessibility();
  const [showAdmin, setShowAdmin] = useState(false);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fs = useFullscreen();
  useWakeLock();

  useEffect(() => {
    clearKioskSession();
  }, []);

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

  return (
    <main className="relative min-h-screen overflow-hidden text-primary-foreground">
      <YouTubeShowcase background />

      <div className="relative min-h-screen flex flex-col items-center justify-center px-8 text-center z-10">
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
          onClick={() => fs.enter()}
          className="kiosk-btn mt-14 bg-accent text-accent-foreground text-4xl md:text-5xl px-20 py-10 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-transform animate-[pulse_3s_ease-in-out_infinite]"
        >
          {t("start")} <ArrowRight className="ml-4 h-10 w-10" />
        </Link>

        <div className="mt-8 flex items-center gap-3 text-sm z-10">
          {(["pt", "en", "es"] as Lang[]).map((l) => (
            <button key={l} onClick={() => setLang(l)} title={l.toUpperCase()}
              className={`px-2 py-1 rounded font-semibold transition text-lg leading-none ${lang === l ? "bg-white/20" : "text-white/50 hover:text-white/80"}`}>
              {FLAGS[l]}
            </button>
          ))}
          <span className="text-white/20">|</span>
          <button onClick={() => setFontSize(Math.max(80, fontSize - 10))} className="text-white/50 hover:text-white/80 px-1 text-xs" title={t("font_size")}>A−</button>
          <span className="text-white/50 text-xs w-5 text-center">{fontSize}%</span>
          <button onClick={() => setFontSize(Math.min(150, fontSize + 10))} className="text-white/50 hover:text-white/80 px-1 text-xs" title={t("font_size")}>A+</button>
          <span className="text-white/20">|</span>
          <button onClick={() => setHighContrast(!highContrast)}
            className={`px-2 py-1 rounded font-semibold transition text-xs ${highContrast ? "bg-white text-black" : "text-white/50 hover:text-white/80"}`}>
            {t("high_contrast")}
          </button>
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
