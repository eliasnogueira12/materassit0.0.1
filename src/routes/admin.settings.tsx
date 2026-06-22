import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, FileText, Youtube, Palette, Plus, Trash2, ShieldAlert, Globe } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
});

type Lang = "pt" | "en" | "es";

interface PhraseGroup {
  welcome: string;
  subtitle: string;
}

interface Phrases {
  pt: PhraseGroup;
  en: PhraseGroup;
  es: PhraseGroup;
}

interface ThemeSettings {
  gradientFrom: string;
  gradientTo: string;
  primary?: string;
  accent?: string;
}

function extractYoutubeId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  if (trimmed.length === 11 && !trimmed.includes("/") && !trimmed.includes(".")) {
    return trimmed;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = trimmed.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

function AdminSettingsPage() {
  const [busy, setBusy] = useState(false);

  // Auth States
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Phrase States
  const [phrases, setPhrases] = useState<Phrases>({
    pt: {
      welcome: "Bem-vindo à MarquesMater",
      subtitle: "Toque para descobrir o produto certo para si.",
    },
    en: { welcome: "Welcome to MarquesMater", subtitle: "Tap to find the right product for you." },
    es: {
      welcome: "Bienvenido a MarquesMater",
      subtitle: "Toque para encontrar el producto adecuado.",
    },
  });
  const [selectedLang, setSelectedLang] = useState<Lang>("pt");

  // Video States
  const [videos, setVideos] = useState<string[]>(["_rWPvpP1jmU", "l2PQO8Sg-y0"]);
  const [newVideoInput, setNewVideoInput] = useState("");

  // Theme States
  const [theme, setTheme] = useState<ThemeSettings>({
    gradientFrom: "#1a1a2e",
    gradientTo: "#0f3460",
  });

  // Load Settings from Supabase
  useEffect(() => {
    // Load phrases
    supabase
      .from("settings")
      .select("value")
      .eq("key", "phrases")
      .maybeSingle()
      .then(
        ({ data }) => {
          if (data?.value) {
            setPhrases(data.value as unknown as Phrases);
          }
        },
        () => {},
      );

    // Load videos
    supabase
      .from("settings")
      .select("value")
      .eq("key", "videos")
      .maybeSingle()
      .then(
        ({ data }) => {
          if (data?.value && Array.isArray(data.value)) {
            setVideos(data.value as string[]);
          }
        },
        () => {},
      );

    // Load theme
    supabase
      .from("settings")
      .select("value")
      .eq("key", "theme")
      .maybeSingle()
      .then(
        ({ data }) => {
          if (data?.value) {
            const t = data.value as unknown as ThemeSettings;
            setTheme({
              gradientFrom: t.gradientFrom || "#1a1a2e",
              gradientTo: t.gradientTo || "#0f3460",
            });
          }
        },
        () => {},
      );
  }, []);

  // Save Settings Helper
  async function saveSetting(key: string, value: Json, successMsg: string) {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("settings")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
      toast.success(successMsg);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      console.error(`[Settings] Erro ao guardar ${key}:`, e);
      toast.error(`Erro ao guardar: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  // Update Credentials
  async function handleUpdateCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail && !newPassword) {
      toast.error("Por favor, introduza um novo email ou palavra-passe.");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("As novas palavras-passe não coincidem.");
      return;
    }
    setBusy(true);
    try {
      const updates: { email?: string; password?: string } = {};
      if (newEmail) updates.email = newEmail;
      if (newPassword) updates.password = newPassword;

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;

      let msg = "Credenciais atualizadas!";
      if (newEmail) {
        msg += " Se alterou o email, enviámos links de confirmação para a sua caixa de correio.";
      }
      toast.success(msg);
      setNewEmail("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      console.error("[Settings] Erro ao atualizar credenciais:", e);
      toast.error(`Erro ao atualizar credenciais: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  // Save Phrases
  function handleSavePhrases() {
    saveSetting("phrases", phrases, "Frases e textos de boas-vindas guardados!");
  }

  // Handle Phrase Text Edit
  function handlePhraseChange(field: keyof PhraseGroup, val: string) {
    setPhrases((prev) => ({
      ...prev,
      [selectedLang]: {
        ...prev[selectedLang],
        [field]: val,
      },
    }));
  }

  // Add Video
  function handleAddVideo() {
    const videoId = extractYoutubeId(newVideoInput);
    if (!videoId) {
      toast.error("ID de vídeo ou link do YouTube inválido.");
      return;
    }
    if (videos.includes(videoId)) {
      toast.error("Este vídeo já existe na lista de destaques.");
      return;
    }
    const updated = [...videos, videoId];
    setVideos(updated);
    setNewVideoInput("");
    saveSetting("videos", updated, "Vídeo adicionado com sucesso!");
  }

  // Remove Video
  function handleRemoveVideo(id: string) {
    const updated = videos.filter((v) => v !== id);
    setVideos(updated);
    saveSetting("videos", updated, "Vídeo removido da lista.");
  }

  // Save Theme
  function handleSaveTheme() {
    saveSetting("theme", theme, "Tema e cores do ecrã principal guardados!");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Definições Gerais</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie as credenciais e configurações de aparência do ecrã principal do quiosque.
        </p>
      </div>

      <Tabs defaultValue="credentials" className="w-full">
        <TabsList className="grid w-full grid-cols-4 gap-2 bg-muted p-1 rounded-xl">
          <TabsTrigger
            value="credentials"
            className="flex items-center gap-2 py-2.5 rounded-lg text-sm"
          >
            <Key className="h-4 w-4" /> Credenciais
          </TabsTrigger>
          <TabsTrigger
            value="phrases"
            className="flex items-center gap-2 py-2.5 rounded-lg text-sm"
          >
            <FileText className="h-4 w-4" /> Textos
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-2 py-2.5 rounded-lg text-sm">
            <Youtube className="h-4 w-4" /> Vídeos
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2 py-2.5 rounded-lg text-sm">
            <Palette className="h-4 w-4" /> Temas
          </TabsTrigger>
        </TabsList>

        {/* Credentials Tab */}
        <TabsContent value="credentials" className="mt-4 focus-visible:outline-none">
          <form onSubmit={handleUpdateCredentials}>
            <Card>
              <CardHeader>
                <CardTitle>Credenciais do Administrador</CardTitle>
                <CardDescription>
                  Atualize o email ou a palavra-passe da conta de administrador do quiosque.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-email">Novo Email de Acesso</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="introduza um novo email se pretender alterar"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <Label htmlFor="new-password">Nova Palavra-passe</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Palavra-passe</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="confirme a palavra-passe introduzida acima"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                  />
                </div>

                {newEmail && (
                  <div className="p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs flex gap-2 items-start animate-fade-in">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Aviso sobre alteração de email</p>
                      <p className="opacity-90 leading-relaxed mt-0.5">
                        O Supabase irá enviar emails de confirmação tanto para o seu email atual
                        como para o novo email. A alteração só será efetivada após confirmar ambos
                        os links de verificação.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={busy}>
                  {busy ? "A processar..." : "Atualizar Credenciais"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        {/* Phrases Tab */}
        <TabsContent value="phrases" className="mt-4 focus-visible:outline-none">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Textos do Ecrã Principal</CardTitle>
                  <CardDescription>
                    Configure as frases de boas-vindas que aparecem no ecrã de início do quiosque.
                  </CardDescription>
                </div>
                <div className="flex gap-1.5 bg-secondary p-1 rounded-lg border">
                  {(["pt", "en", "es"] as Lang[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setSelectedLang(l)}
                      className={`px-3 py-1 rounded text-xs font-bold transition uppercase ${selectedLang === l ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <span className="mr-1">{l === "pt" ? "🇵🇹" : l === "en" ? "🇬🇧" : "🇪🇸"}</span>{" "}
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="welcome-text" className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Título de Boas-vindas ({selectedLang.toUpperCase()})
                </Label>
                <Input
                  id="welcome-text"
                  value={phrases[selectedLang]?.welcome || ""}
                  onChange={(e) => handlePhraseChange("welcome", e.target.value)}
                  placeholder="Ex: Bem-vindo à MarquesMater"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle-text" className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Subtítulo ({selectedLang.toUpperCase()})
                </Label>
                <Textarea
                  id="subtitle-text"
                  rows={3}
                  value={phrases[selectedLang]?.subtitle || ""}
                  onChange={(e) => handlePhraseChange("subtitle", e.target.value)}
                  placeholder="Ex: Toque para descobrir o produto certo para si."
                />
              </div>

              {/* Visual Preview */}
              <div className="pt-4 mt-2 border-t border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Pré-visualização do texto
                </span>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#0f3460] text-white text-center shadow-md">
                  <h3 className="text-2xl font-extrabold truncate">
                    {phrases[selectedLang]?.welcome}
                  </h3>
                  <p className="mt-2 text-sm opacity-80 leading-relaxed max-w-md mx-auto line-clamp-2">
                    {phrases[selectedLang]?.subtitle}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end pt-4 border-t">
              <Button onClick={handleSavePhrases} disabled={busy}>
                {busy ? "A guardar..." : "Guardar Textos"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos" className="mt-4 focus-visible:outline-none">
          <Card>
            <CardHeader>
              <CardTitle>Vídeos de Destaque</CardTitle>
              <CardDescription>
                Adicione ou remova vídeos do YouTube que aparecem em segundo plano ou na galeria do
                quiosque.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    placeholder="Cole o link do YouTube ou ID do vídeo (ex: l2PQO8Sg-y0)"
                    value={newVideoInput}
                    onChange={(e) => setNewVideoInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddVideo()}
                  />
                  <span className="text-[10px] text-muted-foreground block pl-1">
                    Exemplo de link: https://www.youtube.com/watch?v=_rWPvpP1jmU
                  </span>
                </div>
                <Button
                  onClick={handleAddVideo}
                  disabled={busy || !newVideoInput.trim()}
                  className="h-10"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Adicionar
                </Button>
              </div>

              <div className="pt-4 border-t">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
                  Vídeos Ativos ({videos.length})
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {videos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center col-span-2 py-6">
                      Sem vídeos registados. O fundo do ecrã usará apenas a cor do tema.
                    </p>
                  ) : (
                    videos.map((id) => (
                      <div
                        key={id}
                        className="flex gap-3 items-center p-3 rounded-xl border bg-card shadow-sm group"
                      >
                        <div className="w-24 aspect-video rounded overflow-hidden bg-black/10 shrink-0 relative">
                          <img
                            src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`}
                            alt="YouTube Thumbnail"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback if no thumbnail found
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop";
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-mono truncate block text-muted-foreground">
                            ID: {id}
                          </span>
                          <a
                            href={`https://youtube.com/watch?v=${id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-accent hover:underline truncate block font-medium mt-0.5"
                          >
                            Ver no YouTube →
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveVideo(id)}
                          className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition"
                          title="Remover vídeo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Theme Tab */}
        <TabsContent value="theme" className="mt-4 focus-visible:outline-none">
          <Card>
            <CardHeader>
              <CardTitle>Temas e Cores de Fundo</CardTitle>
              <CardDescription>
                Configure as cores do gradiente de fundo que é mostrado quando não há vídeos ou na
                área de início.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color-from">Cor de Início (Esquerda/Topo)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color-from"
                      type="color"
                      className="w-12 h-10 p-1 border cursor-pointer shrink-0 rounded-lg"
                      value={theme.gradientFrom}
                      onChange={(e) => setTheme((p) => ({ ...p, gradientFrom: e.target.value }))}
                    />
                    <Input
                      type="text"
                      className="font-mono text-sm uppercase"
                      value={theme.gradientFrom}
                      onChange={(e) => setTheme((p) => ({ ...p, gradientFrom: e.target.value }))}
                      placeholder="#1A1A2E"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color-to">Cor de Fim (Direita/Base)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color-to"
                      type="color"
                      className="w-12 h-10 p-1 border cursor-pointer shrink-0 rounded-lg"
                      value={theme.gradientTo}
                      onChange={(e) => setTheme((p) => ({ ...p, gradientTo: e.target.value }))}
                    />
                    <Input
                      type="text"
                      className="font-mono text-sm uppercase"
                      value={theme.gradientTo}
                      onChange={(e) => setTheme((p) => ({ ...p, gradientTo: e.target.value }))}
                      placeholder="#0F3460"
                    />
                  </div>
                </div>
              </div>

              {/* Theme Presets */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-muted-foreground block mb-2">
                  Esquemas Rápidos (Presets)
                </span>
                <div className="flex gap-3">
                  {[
                    { from: "#1a1a2e", to: "#0f3460", label: "Noite MarquesMater (Original)" },
                    { from: "#111827", to: "#1f2937", label: "Dark Gray" },
                    { from: "#065f46", to: "#022c22", label: "Verde Jardim" },
                    { from: "#1e3a8a", to: "#172554", label: "Azul Profundo" },
                    { from: "#581c87", to: "#3b0764", label: "Púrpura Escuro" },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTheme({ gradientFrom: preset.from, gradientTo: preset.to })}
                      className="w-8 h-8 rounded-full border border-border cursor-pointer transition shadow-sm hover:scale-110 active:scale-95"
                      style={{
                        background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
                      }}
                      title={preset.label}
                    />
                  ))}
                </div>
              </div>

              {/* Real-time Theme Preview */}
              <div className="pt-4 mt-2 border-t border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Visualização do tema do quiosque
                </span>
                <div
                  className="p-12 rounded-2xl text-white text-center shadow-lg border relative transition-colors duration-300"
                  style={{
                    background: `linear-gradient(to bottom right, ${theme.gradientFrom}, ${theme.gradientTo})`,
                  }}
                >
                  <h4 className="text-xl font-bold tracking-tight">MarquesMater Quiosque</h4>
                  <p className="text-xs mt-1 opacity-70">Visualização de fundo do ecrã inicial</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end pt-4 border-t">
              <Button onClick={handleSaveTheme} disabled={busy}>
                {busy ? "A guardar..." : "Guardar Tema"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
