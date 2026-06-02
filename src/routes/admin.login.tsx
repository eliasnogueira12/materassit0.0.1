import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      const loginPromise = supabase.auth.signInWithPassword({ email, password });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT_ERROR")), 15000)
      );

      const result = await Promise.race([loginPromise, timeoutPromise]);
      const { error } = result;
      if (error) throw error;
      toast.success("Sessão iniciada.");
      navigate({ to: "/admin", replace: true });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "TIMEOUT_ERROR") {
        setErrorMsg("O início de sessão demorou demasiado tempo (limite de 15 segundos excedido). A ligação ao servidor do Supabase falhou ou a sua internet está muito lenta.");
        toast.error("O limite de tempo de 15 segundos para iniciar sessão expirou!");
      } else {
        const msg = e instanceof Error ? e.message : "Erro desconhecido ao iniciar sessão";
        setErrorMsg(msg);
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-secondary px-4">
      <div className="bg-card border rounded-2xl p-8 w-full max-w-md shadow-lg">
        <div className="flex flex-col items-center mb-6">
          <Logo className="h-16 w-auto mb-3" />
          <h1 className="text-2xl font-bold text-primary">Administração</h1>
          <p className="text-sm text-muted-foreground">MaterAssist · MarquesMater</p>
        </div>
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex gap-2 items-start animate-fade-in">
            <span className="text-base shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="font-bold mb-0.5">Falha no Acesso</p>
              <p className="opacity-90 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Palavra-passe</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "..." : "Entrar"}
          </Button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Acesso restrito. Contacte o administrador para obter credenciais.
        </p>
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => navigate({ to: "/", replace: true })}
            className="text-sm text-accent hover:underline"
          >
            ← Voltar ao quiosque
          </button>
        </div>
      </div>
    </main>
  );
}
