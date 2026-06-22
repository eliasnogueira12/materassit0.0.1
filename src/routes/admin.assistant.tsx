import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askAssistant } from "@/lib/assistant.functions";
import { Sparkles, Send, User, Bot } from "lucide-react";

export const Route = createFileRoute("/admin/assistant")({
  component: AdminAssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function AdminAssistantPage() {
  const ask = useServerFn(askAssistant);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou o assistente administrativo. Pergunta sobre produtos, stock, localizações ou problemas registados no sistema.",
    },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send() {
    const q = text.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setText("");
    setBusy(true);
    try {
      const history = messages.slice(-10);
      const { reply } = await ask({ data: { message: q, history } });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      console.error("[AdminChat] Erro ao obter resposta:", e);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Não foi possível obter resposta do sistema. Verifica se a base de dados está acessível.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Sparkles className="h-7 w-7 text-accent" />
        <div>
          <h1 className="text-3xl font-bold text-primary">Assistente IA</h1>
          <p className="text-muted-foreground text-sm">
            Pesquisa no catálogo da loja em tempo real.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-card border rounded-2xl p-4 space-y-4 scroll-smooth">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-3 animate-fade-in ${m.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}
            >
              {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div
              className={`rounded-2xl px-4 py-2.5 max-w-[80%] whitespace-pre-line ${m.role === "user" ? "bg-accent/20" : "bg-muted"}`}
            >
              {m.content}
            </div>
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

      <div className="mt-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ex: que tintas brancas temos em stock?"
          className="flex-1 h-12 rounded-2xl px-4 border border-input bg-background outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <button
          onClick={send}
          disabled={busy || !text.trim()}
          className="px-5 rounded-2xl bg-accent text-accent-foreground disabled:opacity-50 transition"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
