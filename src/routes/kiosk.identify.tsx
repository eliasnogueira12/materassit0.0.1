import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sparkles,
  UserPlus,
  LogIn,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { createCustomer, findCustomer, logHistory, useCustomer } from "@/lib/customer";
import { toast } from "sonner";

export const Route = createFileRoute("/kiosk/identify")({
  component: IdentifyPage,
});

type Step = "ask" | "input" | "created";

function IdentifyPage() {
  const navigate = useNavigate();
  const { customer, hydrated, setCustomer } = useCustomer();
  const [step, setStep] = useState<Step>("ask");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdNumber, setCreatedNumber] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    if (hydrated && customer) navigate({ to: "/kiosk/start" });
  }, [hydrated, customer, navigate]);

  useEffect(() => {
    if (step !== "created") return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate({ to: "/kiosk/start" });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, navigate]);

  async function handleNew() {
    setBusy(true);
    setError(null);
    try {
      const c = await createCustomer();
      setCustomer(c);
      setCreatedNumber(c.customer_number);
      setStep("created");
      logHistory(c.id, "visit");
    } catch {
      toast.error("Não foi possível gerar o número. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLookup() {
    const n = parseInt(number, 10);
    if (!Number.isFinite(n) || n < 1) {
      setError("Digite um número válido.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const c = await findCustomer(n);
      if (!c) {
        setError("Não encontrámos esse número.");
        return;
      }
      setCustomer(c);
      logHistory(c.id, "visit");
      navigate({ to: "/kiosk/start" });
    } catch {
      setError("Erro ao procurar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-6 py-12 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Sparkles className="h-9 w-9 text-accent" />
        <h1 className="text-4xl font-bold text-primary">Bem-vindo!</h1>
      </div>

      {step === "ask" && (
        <div className="animate-fade-in">
          <p className="text-2xl text-muted-foreground mb-10">É a sua primeira vez aqui?</p>
          <div className="grid md:grid-cols-2 gap-5">
            <button
              onClick={handleNew}
              disabled={busy}
              className="kiosk-btn bg-accent text-accent-foreground p-10 text-2xl rounded-3xl shadow-lg hover:scale-[1.02] transition disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <UserPlus className="h-8 w-8" />
              )}
              Sim, é a primeira vez
            </button>
            <button
              onClick={() => setStep("input")}
              className="kiosk-btn bg-primary text-primary-foreground p-10 text-2xl rounded-3xl shadow-lg hover:scale-[1.02] transition"
            >
              <LogIn className="h-8 w-8" />
              Não, já tenho número
            </button>
          </div>
        </div>
      )}

      {step === "input" && (
        <div className="animate-fade-in">
          <label className="block text-xl text-muted-foreground mb-3">
            Digite o seu número de cliente
          </label>
          <div className="flex gap-3">
            <input
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              placeholder="#1024"
              className="flex-1 h-16 text-3xl text-center rounded-2xl px-5 border-2 border-input bg-background focus:border-accent outline-none"
            />
            <button
              onClick={handleLookup}
              disabled={busy || !number}
              className="kiosk-btn bg-accent text-accent-foreground px-8 text-xl disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <ArrowRight className="h-6 w-6" />
              )}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-4 rounded-xl bg-destructive/10 text-destructive flex items-center gap-2 animate-fade-in">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => {
                setError(null);
                setNumber("");
              }}
              className="px-5 py-3 rounded-xl border text-base"
            >
              Tentar novamente
            </button>
            <button
              onClick={handleNew}
              disabled={busy}
              className="px-5 py-3 rounded-xl bg-primary text-primary-foreground text-base disabled:opacity-50"
            >
              Criar novo número
            </button>
            <button
              onClick={() => setStep("ask")}
              className="ml-auto px-5 py-3 rounded-xl text-base text-muted-foreground hover:bg-muted"
            >
              Voltar
            </button>
          </div>
        </div>
      )}

      {step === "created" && createdNumber !== null && (
        <div className="animate-fade-in text-center relative">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-accent/10 via-transparent to-primary/10 blur-3xl" />
          <div className="mx-auto h-24 w-24 rounded-full bg-emerald-500/15 flex items-center justify-center mb-6 ring-4 ring-emerald-500/20">
            <CheckCircle2 className="h-14 w-14 text-emerald-500 animate-scale-in" />
          </div>
          <p className="text-xl text-muted-foreground mb-3">O seu número de cliente é</p>
          <div className="relative inline-block mb-6">
            <div className="absolute -inset-6 bg-gradient-to-r from-accent/30 via-primary/30 to-accent/30 blur-2xl opacity-70 animate-pulse" />
            <div className="relative text-8xl md:text-9xl font-extrabold bg-gradient-to-br from-primary via-accent to-primary bg-clip-text text-transparent tracking-tight animate-scale-in">
              #{createdNumber}
            </div>
          </div>
          <div className="mx-auto max-w-md mb-8 rounded-2xl border-2 border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 px-5 py-4 flex items-center gap-3 shadow-lg animate-fade-in">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <div className="text-left">
              <p className="font-bold text-lg leading-tight">Não perca o seu número.</p>
              <p className="text-sm opacity-80">Vai precisar dele em futuras visitas.</p>
            </div>
          </div>
          <button
            onClick={() => navigate({ to: "/kiosk/start" })}
            className="kiosk-btn bg-accent text-accent-foreground px-12 py-6 text-2xl rounded-2xl shadow-xl hover:scale-105 transition-transform"
          >
            Continuar ({countdown}s) <ArrowRight className="ml-2 h-6 w-6" />
          </button>
          <p className="text-sm text-muted-foreground mt-4 animate-pulse">
            A redirecionar automaticamente em {countdown} segundos...
          </p>
        </div>
      )}
    </div>
  );
}
