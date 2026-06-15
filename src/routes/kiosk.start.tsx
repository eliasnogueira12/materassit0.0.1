import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askAssistant, type RecommendedProduct } from "@/lib/assistant.functions";
import { Sparkles, Send, User, Bot, BellRing, LogOut, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer, logHistory, clearKioskSession, createCustomer } from "@/lib/customer";
import { AssistanceModal } from "@/components/AssistanceModal";
import { ProductCard } from "@/components/ProductCard";
import { useWakeLock, useIdleReset, useHideCursor, usePreventBack } from "@/lib/useKiosk";
import { useI18n, greetingFor, FLAGS, type Lang } from "@/lib/i18n";
import { useAccessibility } from "@/lib/useAccessibility";
import QRCode from "@/components/QRCode";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
}

export const Route = createFileRoute("/kiosk/start")({
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string; products?: RecommendedProduct[] };

function AssistantPage() {
  const navigate = useNavigate();
  const ask = useServerFn(askAssistant);
  const { customer, hydrated, setCustomer } = useCustomer();
  const { t, lang, setLang } = useI18n();
  const { fontSize, setFontSize, highContrast, setHighContrast } = useAccessibility();
  const sessionInitied = useRef(false);
  const standalone = useMemo(() => isStandalone(), []);

  useEffect(() => {
    if (hydrated && !customer && !sessionInitied.current) {
      sessionInitied.current = true;
      createCustomer()
        .then((c) => setCustomer(c))
        .catch((err) => console.error("[Chat] Erro ao criar sessão:", err));
    }
  }, [hydrated, customer, setCustomer]);

  const assistantIntro = useCallback((l: Lang) => {
    const greeting = greetingFor(new Date(), l);
    const intro: Record<Lang, string> = {
      pt: `Diz-me em palavras tuas o que precisas — por exemplo, "tenho humidade na parede" ou "preciso de tinta branca".`,
      en: `Tell me in your own words what you need — e.g., "I have a damp wall" or "I need white paint".`,
      es: `Dime con tus palabras lo que necesitas — por ejemplo, "tengo humedad en la pared" o "necesito pintura blanca".`,
    };
    return `${greeting}! Sou o MaterAssist. ${intro[l]}`;
  }, []);

  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: assistantIntro("pt") },
  ]);

  useEffect(() => {
    setMessages((m) => {
      const updated = [...m];
      if (updated.length > 0 && updated[0].role === "assistant" && !updated[0].products) {
        updated[0] = { ...updated[0], content: assistantIntro(lang) };
      }
      return updated;
    });
  }, [lang, assistantIntro]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const [requestId, setRequestId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [calling, setCalling] = useState(false);
  const [farewell, setFarewell] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useWakeLock();
  useIdleReset(!standalone);
  useHideCursor(!standalone);
  usePreventBack();

  useEffect(() => {
    if (customer?.id) {
      supabase
        .from("customers")
        .select("blocked")
        .eq("id", customer.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.blocked) {
            setIsBlocked(true);
          }
        });
    }
  }, [customer?.id]);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  function endSession() {
    setFarewell(true);
    setTimeout(() => {
      clearKioskSession();
      navigate({ to: "/" });
    }, 2200);
  }

  async function send() {
    const q = text.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setText("");
    setBusy(true);
    if (customer) logHistory(customer.id, "search", { query: q });
    try {
      const history = messages.slice(-10).map(({ role, content }) => ({ role, content }));
      const { reply, products } = await ask({ data: { message: q, history } });
      setMessages((m) => [...m, { role: "assistant", content: reply, products }]);
      if (customer)
        logHistory(customer.id, "recommendation", {
          reply: reply.slice(0, 200),
          product_ids: products?.map((p) => p.id),
        });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "";
      console.error("[Chat] Erro ao obter resposta:", errorMsg);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: t("error_no_results"),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function callStaff() {
    if (calling) return;
    setCalling(true);
    try {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const reason = lastUser?.content?.slice(0, 200) ?? t("assistant_request");
      const expiresAt = new Date(Date.now() + 120_000).toISOString();
      const { data, error } = await supabase
        .from("assistance_requests")
        .insert({
          kiosk_label: "Quiosque 1",
          message: reason,
          reason,
          status: "pending",
          customer_id: customer?.id ?? null,
          customer_number: customer?.customer_number ?? null,
          expires_at: expiresAt,
        })
        .select("id")
        .single();
      if (error) throw error;
      setRequestId(data.id);
      setModalOpen(true);
      if (customer) logHistory(customer.id, "assistance", { request_id: data.id });
    } catch (err) {
      console.error("[Chat] Erro ao chamar funcionário:", err);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: t("error_call_staff") },
      ]);
    } finally {
      setCalling(false);
    }
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto flex flex-col h-[calc(100vh-7rem)]">
      <div className="flex items-center gap-3 mb-4">
        <Sparkles className="h-8 w-8 text-accent" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-primary">{t("assistant_title")}</h1>
          <p className="text-muted-foreground">{t("assistant_desc")}</p>
        </div>
        {customer && (
          <div className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 animate-pulse">
            <User className="h-4 w-4" /> {t("session_active")}
          </div>
        )}
      </div>

      {/* Toolbar: language, accessibility */}
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        {/* Language */}
        <div className="flex items-center gap-1">
          {(["pt", "en", "es"] as Lang[]).map((l) => (
            <button key={l} onClick={() => setLang(l)} title={l.toUpperCase()}
              className={`px-2 py-0.5 rounded font-semibold transition text-lg leading-none ${lang === l ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}>
              {FLAGS[l]}
            </button>
          ))}
        </div>
        <span className="opacity-30">|</span>
        {/* Font size */}
        <div className="flex items-center gap-1">
          <button onClick={() => setFontSize(Math.max(80, fontSize - 10))} className="px-2 py-0.5 rounded hover:bg-muted transition" title={t("font_size")}>A−</button>
          <span className="text-xs w-6 text-center">{fontSize}%</span>
          <button onClick={() => setFontSize(Math.min(150, fontSize + 10))} className="px-2 py-0.5 rounded hover:bg-muted transition" title={t("font_size")}>A+</button>
        </div>
        <span className="opacity-30">|</span>
        {/* High contrast */}
        <button onClick={() => setHighContrast(!highContrast)}
          className={`px-2 py-0.5 rounded font-semibold transition ${highContrast ? "bg-foreground text-background" : "hover:bg-muted"}`}>
          {t("high_contrast")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-card/80 backdrop-blur border rounded-2xl p-4 space-y-4 shadow-inner scroll-smooth"
      >
        {messages.map((m, i) => (
          <div key={i} className="space-y-3">
            <div className={`flex gap-3 animate-fade-in ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}
              >
                {m.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
              </div>
              <div
                className={`rounded-2xl px-4 py-3 max-w-[80%] text-lg whitespace-pre-line shadow-sm ${m.role === "user" ? "bg-accent/20" : "bg-muted"}`}
              >
                {m.content}
              </div>
            </div>
            {m.products && m.products.length > 0 && (
              <div className="ml-13 pl-13">
                <div className="grid sm:grid-cols-2 gap-3">
                  {m.products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
            <Bot className="h-4 w-4" />
            <span>{t("thinking")}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {isBlocked ? (
        <div className="mt-4 p-5 rounded-2xl bg-destructive/10 border-2 border-destructive/20 text-destructive text-center font-semibold animate-pulse text-lg shadow-sm">
          {t("session_blocked")}
        </div>
      ) : (
        <>
          <div className="mt-2 flex gap-2">
            <input
              value={text}
              disabled={busy}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={t("placeholder")}
              className="flex-1 h-14 text-xl rounded-2xl px-5 border border-input bg-background focus:border-accent focus:ring-1 focus:ring-accent outline-none animate-[slide-up_0.2s_ease-out]"
            />
            <button
              onClick={send}
              disabled={busy || !text.trim()}
              className="kiosk-btn bg-accent text-accent-foreground px-6 py-3 text-xl disabled:opacity-50"
            >
              <Send className="h-6 w-6" />
            </button>
          </div>

          <button
            onClick={callStaff}
            disabled={calling}
            className="mt-3 w-full kiosk-btn bg-destructive text-destructive-foreground py-4 text-xl font-semibold hover:scale-[1.01] transition-transform disabled:opacity-50 animate-[slide-up_0.3s_ease-out]"
          >
            <BellRing className="h-6 w-6 mr-2" />
            {calling ? t("calling") : t("call_staff")}
          </button>
        </>
      )}

      <button
        onClick={endSession}
        className="mt-2 w-full kiosk-btn bg-muted text-foreground border py-3 text-base font-medium hover:bg-muted/70 transition"
      >
        <LogOut className="h-5 w-5 mr-2" />
        {t("end_session")}
      </button>

      <AssistanceModal
        requestId={requestId}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          endSession();
        }}
        onRetry={() => {
          setModalOpen(false);
          setRequestId(null);
          setTimeout(callStaff, 250);
        }}
      />

      {farewell && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-primary via-primary to-[hsl(220,60%,15%)] text-primary-foreground animate-fade-in">
          <Heart className="h-24 w-24 text-accent animate-scale-in mb-6" />
          <h2 className="text-5xl font-extrabold tracking-tight mb-3">{t("farewell_title")}</h2>
          <p className="text-xl opacity-80 mb-6">{t("farewell_sub")}</p>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 flex flex-col items-center gap-3">
            <p className="text-sm opacity-80">{t("continue_phone")}</p>
            <QRCode url={typeof window !== "undefined" ? window.location.href : ""} size={140} />
            <p className="text-xs opacity-60 text-center max-w-48">{t("scan_qr")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
