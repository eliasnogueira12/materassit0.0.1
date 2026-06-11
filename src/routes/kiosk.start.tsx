import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askAssistant, type RecommendedProduct } from "@/lib/assistant.functions";
import { Sparkles, Send, User, Bot, BellRing, LogOut, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer, logHistory, clearKioskSession, createCustomer } from "@/lib/customer";
import { AssistanceModal } from "@/components/AssistanceModal";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/kiosk/start")({
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string; products?: RecommendedProduct[] };

function greetingFor(d: Date) {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 19) return "Boa tarde";
  return "Boa noite";
}

function AssistantPage() {
  const navigate = useNavigate();
  const ask = useServerFn(askAssistant);
  const { customer, hydrated, setCustomer } = useCustomer();
  const [initializingSession, setInitializingSession] = useState(false);

  useEffect(() => {
    if (hydrated && !customer && !initializingSession) {
      setInitializingSession(true);
      createCustomer()
        .then((c) => {
          setCustomer(c);
        })
        .catch((err) => {
          console.error("Erro ao criar sessão de cliente silenciosa:", err);
        })
        .finally(() => {
          setInitializingSession(false);
        });
    }
  }, [hydrated, customer, initializingSession, setCustomer]);

  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: `${greetingFor(new Date())}! Sou o MaterAssist. Diz-me em palavras tuas o que precisas — por exemplo, "tenho humidade na parede" ou "preciso de tinta branca".`,
    },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const [requestId, setRequestId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [calling, setCalling] = useState(false);
  const [farewell, setFarewell] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

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

  // Auto-scroll to last message
  const scrollRef = useRef<HTMLDivElement>(null);
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

  const quickQuestions = [
    { label: "Pintura", query: "Gostaria de saber mais sobre tintas e produtos de pintura.", icon: "🎨", color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20" },
    { label: "Eletricidade", query: "Quais os artigos de eletricidade e lâmpadas disponíveis?", icon: "⚡", color: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20" },
    { label: "Canalização", query: "Têm produtos para canalização ou fugas de água?", icon: "💧", color: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20" },
    { label: "Ferragens", query: "Que tipo de parafusos e ferragens têm na loja?", icon: "⚙️", color: "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20" },
    { label: "Jardim", query: "Preciso de ferramentas ou terra para plantas no jardim.", icon: "🌱", color: "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/20" },
    { label: "Promoções", query: "Quais as principais promoções e descontos em vigor?", icon: "🏷️", color: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20" },
    { label: "Chamar Funcionário", action: "staff", icon: "🔔", color: "bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20" }
  ];

  async function send(customText?: string) {
    const q = typeof customText === "string" ? customText.trim() : text.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    if (typeof customText !== "string") setText("");
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
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Não tenho essa informação registada no sistema. Pode chamar um funcionário.",
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
      const reason = lastUser?.content?.slice(0, 200) ?? "Pedido do assistente";
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
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Não foi possível chamar a equipa agora. Tenta de novo." },
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
          <h1 className="text-3xl font-bold text-primary">Assistente MaterAssist</h1>
          <p className="text-muted-foreground">Descreve o que precisas por palavras tuas.</p>
        </div>
        {customer && (
          <div className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 animate-pulse">
            <User className="h-4 w-4" /> Sessão Ativa
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-card/80 backdrop-blur border rounded-2xl p-4 space-y-4 shadow-inner scroll-smooth"
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
            <span>A pensar…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {isBlocked ? (
        <div className="mt-4 p-5 rounded-2xl bg-destructive/10 border-2 border-destructive/20 text-destructive text-center font-semibold animate-pulse text-lg shadow-sm">
          Esta sessão de atendimento foi suspensa pelo administrador. Por favor, fale com um funcionário na loja para assistência presencial.
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2 shrink-0 mt-2 max-w-full select-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {quickQuestions.map((qq, idx) => (
              <button
                key={idx}
                disabled={busy}
                onClick={() => {
                  if (qq.action === "staff") {
                    callStaff();
                  } else if (qq.query) {
                    send(qq.query);
                  }
                }}
                className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-full border text-base font-extrabold whitespace-nowrap cursor-pointer transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${qq.color} shadow-sm`}
              >
                <span>{qq.icon}</span>
                <span>{qq.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-2 flex gap-2">
            <input
              value={text}
              disabled={busy}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ex: tenho uma torneira a pingar"
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
            {calling ? "A chamar..." : "Chamar funcionário"}
          </button>
        </>
      )}

      <button
        onClick={endSession}
        className="mt-2 w-full kiosk-btn bg-muted text-foreground border py-3 text-base font-medium hover:bg-muted/70 transition"
      >
        <LogOut className="h-5 w-5 mr-2" />
        Terminar atendimento
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
          <h2 className="text-5xl font-extrabold tracking-tight mb-3">Obrigado pela visita.</h2>
          <p className="text-xl opacity-80">Até breve!</p>
        </div>
      )}
    </div>
  );
}
