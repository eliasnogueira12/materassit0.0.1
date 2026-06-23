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
import {
  Key,
  FileText,
  Youtube,
  Palette,
  Plus,
  Trash2,
  ShieldAlert,
  Globe,
  Image,
  Upload,
  Save,
  Move,
  Maximize,
  Layers,
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import { broadcastSettingsChange } from "@/lib/settings-broadcast";

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

interface ThemeOverlay {
  id: string;
  imageUrl: string;
  label: string;
  position:
    | "top-left"
    | "top-center"
    | "top-right"
    | "center-left"
    | "center"
    | "center-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
  width: number;
  opacity: number;
  enabled: boolean;
}

interface ThemeSettings {
  gradientFrom: string;
  gradientTo: string;
  overlays: ThemeOverlay[];
  primary?: string;
  accent?: string;
}

function extractYoutubeId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  if (trimmed.length === 11 && !trimmed.includes("/") && !trimmed.includes(".")) {
    return trimmed;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|live\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = trimmed.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

function getOverlayStyle(o: ThemeOverlay): React.CSSProperties {
  const positionMap: Record<string, { top?: string; bottom?: string; left?: string; right?: string; transform?: string }> =
    {
      "top-left": { top: "0", left: "0" },
      "top-center": { top: "0", left: "50%", transform: "translateX(-50%)" },
      "top-right": { top: "0", right: "0" },
      "center-left": { top: "50%", left: "0", transform: "translateY(-50%)" },
      center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
      "center-right": { top: "50%", right: "0", transform: "translateY(-50%)" },
      "bottom-left": { bottom: "0", left: "0" },
      "bottom-center": { bottom: "0", left: "50%", transform: "translateX(-50%)" },
      "bottom-right": { bottom: "0", right: "0" },
    };
  return {
    ...positionMap[o.position],
    width: `${o.width}%`,
    maxWidth: `${o.width}%`,
    opacity: o.opacity / 100,
    zIndex: 5,
  };
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
    overlays: [],
  });

  // Branding States
  const [logoUrl, setLogoUrl] = useState("");
  const [storeName, setStoreName] = useState("MarquesMater");
  const [uploadingLogo, setUploadingLogo] = useState(false);

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
              overlays: Array.isArray(t.overlays) ? t.overlays : [],
            });
          }
        },
        () => {},
      );

    // Load branding
    supabase
      .from("settings")
      .select("value")
      .eq("key", "branding")
      .maybeSingle()
      .then(
        ({ data }) => {
          if (data?.value) {
            const b = data.value as Record<string, string>;
            if (b.logo_url) setLogoUrl(b.logo_url);
            if (b.store_name) setStoreName(b.store_name);
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
      broadcastSettingsChange(key);
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

  // Color extraction from image
  async function extractColorsFromImage(url: string): Promise<{ from: string; to: string } | null> {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = reject;
      });
      img.src = url;
      await loaded;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const size = 50;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size).data;
      const colorMap = new Map<string, number>();

      for (let i = 0; i < imageData.length; i += 4) {
        const r = Math.round(imageData[i] / 32) * 32;
        const g = Math.round(imageData[i + 1] / 32) * 32;
        const b = Math.round(imageData[i + 2] / 32) * 32;
        const key = `${r},${g},${b}`;
        colorMap.set(key, (colorMap.get(key) || 0) + (imageData[i + 3] || 255));
      }

      const sorted = [...colorMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([key]) => {
          const [r, g, b] = key.split(",").map(Number);
          return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
        });

      if (sorted.length < 2) return null;

      return { from: sorted[0], to: sorted[sorted.length - 1] };
    } catch {
      return null;
    }
  }

  // Overlay Upload
  const [uploadingOverlay, setUploadingOverlay] = useState(false);
  const [uploadingPreset, setUploadingPreset] = useState(false);

  async function handleOverlayUpload(e: React.ChangeEvent<HTMLInputElement>, preset?: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecione um ficheiro de imagem.");
      return;
    }
    if (preset) setUploadingPreset(true);
    else setUploadingOverlay(true);
    try {
      const safeName = file.name.replace(/[^a-z0-9.-]/gi, "_");
      const path = `overlays/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      if (preset) {
        // Adding to a festive preset
        const label = preset === "natal" ? "🎄 Natal" : preset === "anonovo" ? "🎆 Ano Novo" : preset === "aniversario" ? "🎂 Aniversário" : preset === "halloween" ? "🎃 Halloween" : "🌸 Primavera";
        const overlay: ThemeOverlay = {
          id: crypto.randomUUID(),
          imageUrl: publicUrl,
          label,
          position: "bottom-right",
          width: 25,
          opacity: 90,
          enabled: true,
        };

        // Auto-extract colors from the image and apply to gradient
        const colors = await extractColorsFromImage(publicUrl);
        if (colors) {
          setTheme((p) => ({
            gradientFrom: colors.from,
            gradientTo: colors.to,
            overlays: [...(Array.isArray(p.overlays) ? p.overlays : []), overlay],
          }));
          toast.success(`Cores extraídas da imagem! Tema "${label}" aplicado.`);
        } else {
          setTheme((p) => ({ ...p, overlays: [...(Array.isArray(p.overlays) ? p.overlays : []), overlay] }));
          toast.success(`Imagem adicionada ao preset "${label}"! Guarde o tema para aplicar.`);
        }
      } else {
        // Manual overlay
        const overlay: ThemeOverlay = {
          id: crypto.randomUUID(),
          imageUrl: publicUrl,
          label: "Decoração",
          position: "bottom-right",
          width: 25,
          opacity: 90,
          enabled: true,
        };
        setTheme((p) => ({ ...p, overlays: [...p.overlays, overlay] }));
        toast.success("Imagem adicionada! Ajuste a posição e tamanho abaixo.");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error(`Erro ao carregar imagem: ${message}`);
    } finally {
      setUploadingOverlay(false);
      setUploadingPreset(false);
      e.target.value = "";
    }
  }

  function handleUpdateOverlay(id: string, updates: Partial<ThemeOverlay>) {
    setTheme((p) => ({
      ...p,
      overlays: p.overlays.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    }));
  }

  function handleRemoveOverlay(id: string) {
    setTheme((p) => ({
      ...p,
      overlays: p.overlays.filter((o) => o.id !== id),
    }));
  }

  const POSITIONS: { value: ThemeOverlay["position"]; label: string }[] = [
    { value: "top-left", label: "Topo Esquerda" },
    { value: "top-center", label: "Topo Centro" },
    { value: "top-right", label: "Topo Direita" },
    { value: "center-left", label: "Meio Esquerda" },
    { value: "center", label: "Centro" },
    { value: "center-right", label: "Meio Direita" },
    { value: "bottom-left", label: "Base Esquerda" },
    { value: "bottom-center", label: "Base Centro" },
    { value: "bottom-right", label: "Base Direita" },
  ];

  const FESTIVE_PRESETS = [
    { id: "natal", label: "🎄 Natal", from: "#1a3a1a", to: "#2d5a27" },
    { id: "anonovo", label: "🎆 Ano Novo", from: "#b8860b", to: "#1a1a1a" },
    { id: "aniversario", label: "🎂 Aniversário", from: "#ff69b4", to: "#daa520" },
    { id: "halloween", label: "🎃 Halloween", from: "#ff8c00", to: "#2d1b00" },
    { id: "primavera", label: "🌸 Primavera", from: "#ffb7c5", to: "#98fb98" },
  ];

  // Logo Upload
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecione um ficheiro de imagem.");
      return;
    }
    setUploadingLogo(true);
    try {
      const safeName = file.name.replace(/[^a-z0-9.-]/gi, "_");
      const path = `logos/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      setLogoUrl(publicUrl);
      toast.success("Logotipo carregado! Guarde as alterações para aplicar.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error(`Erro ao carregar logotipo: ${message}`);
    } finally {
      setUploadingLogo(false);
    }
  }

  // Save Branding
  function handleSaveBranding() {
    saveSetting(
      "branding",
      { logo_url: logoUrl, store_name: storeName },
      "Definições de marca guardadas!",
    );
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
        <TabsList className="grid w-full grid-cols-5 gap-2 bg-muted p-1 rounded-xl">
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
          <TabsTrigger
            value="branding"
            className="flex items-center gap-2 py-2.5 rounded-lg text-sm"
          >
            <Image className="h-4 w-4" /> Marca
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
                <div className="flex flex-wrap gap-3">
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
                      onClick={() => setTheme({ gradientFrom: preset.from, gradientTo: preset.to, overlays: theme.overlays })}
                      className="w-10 h-10 rounded-full border-2 border-border cursor-pointer transition shadow-sm hover:scale-110 active:scale-95"
                      style={{
                        background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
                      }}
                      title={preset.label}
                    />
                  ))}
                </div>
              </div>

              {/* Festive Presets with Decorations */}
              <div className="pt-4 mt-4 border-t border-border">
                <span className="text-xs font-semibold text-muted-foreground block mb-2">
                  🎉 Ocasiões Especiais (Tema + Decorações)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {FESTIVE_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      className="p-3 rounded-xl border bg-card shadow-sm space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full border border-border shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
                          }}
                        />
                        <span className="text-sm font-bold">{preset.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Aplicar cores e adicionar imagem decorativa:
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8"
                          onClick={() => {
                            setTheme((p) => ({
                              gradientFrom: preset.from,
                              gradientTo: preset.to,
                              overlays: Array.isArray(p.overlays) ? p.overlays : [],
                            }));
                            toast.success(`Tema "${preset.label}" aplicado!`);
                          }}
                        >
                          <Palette className="h-3 w-3 mr-1" />
                          Cor
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 relative"
                          disabled={uploadingPreset}
                          asChild
                        >
                          <label className="cursor-pointer">
                            <Image className="h-3 w-3 mr-1" />
                            {uploadingPreset ? "..." : "Imagem"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleOverlayUpload(e, preset.id)}
                              disabled={uploadingPreset}
                            />
                          </label>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Escolha uma ocasião, aplique a cor e adicione uma imagem decorativa (ex: árvore de
                  Natal, bolo, fogos de artifício).
                </p>
              </div>

              {/* Real-time Theme Preview */}
              <div className="pt-4 mt-2 border-t border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Visualização do tema do quiosque
                </span>
                <div
                  className="p-12 rounded-2xl text-white text-center shadow-lg border relative transition-colors duration-300 overflow-hidden min-h-[200px]"
                  style={{
                    background: `linear-gradient(to bottom right, ${theme.gradientFrom}, ${theme.gradientTo})`,
                  }}
                >
                  {theme.overlays
                    .filter((o) => o.enabled)
                    .map((o) => (
                      <img
                        key={o.id}
                        src={o.imageUrl}
                        alt={o.label}
                        className="absolute pointer-events-none"
                        style={getOverlayStyle(o)}
                      />
                    ))}
                  <h4 className="text-xl font-bold tracking-tight relative z-10">
                    MarquesMater Quiosque
                  </h4>
                  <p className="text-xs mt-1 opacity-70 relative z-10">
                    Visualização de fundo do ecrã inicial
                  </p>
                </div>
              </div>

              {/* Overlay Management */}
              <div className="pt-4 mt-2 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Layers className="h-3.5 w-3.5 inline mr-1" />
                    Decorações ({theme.overlays.length})
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 relative"
                    disabled={uploadingOverlay}
                    asChild
                  >
                    <label className="cursor-pointer">
                      <Plus className="h-3 w-3 mr-1" />
                      {uploadingOverlay ? "..." : "Adicionar Imagem"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleOverlayUpload}
                        disabled={uploadingOverlay}
                      />
                    </label>
                  </Button>
                </div>

                {theme.overlays.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhuma decoração adicionada. Carregue imagens para personalizar o ecrã
                    principal para ocasiões especiais.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {theme.overlays.map((o) => (
                      <div
                        key={o.id}
                        className="p-3 rounded-xl border bg-card shadow-sm space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0 border">
                            <img
                              src={o.imageUrl}
                              alt={o.label}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <input
                              className="text-sm font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-border outline-none w-full"
                              value={o.label}
                              onChange={(e) => handleUpdateOverlay(o.id, { label: e.target.value })}
                              placeholder="Nome da decoração"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={async () => {
                                const colors = await extractColorsFromImage(o.imageUrl);
                                if (colors) {
                                  setTheme((p) => ({
                                    ...p,
                                    gradientFrom: colors.from,
                                    gradientTo: colors.to,
                                  }));
                                  toast.success("Cores extraídas da imagem e aplicadas ao fundo!");
                                } else {
                                  toast.error("Não foi possível extrair cores desta imagem.");
                                }
                              }}
                              className="p-1.5 hover:bg-accent/10 text-muted-foreground hover:text-accent rounded-lg transition"
                              title="Extrair cores desta imagem para o fundo"
                            >
                              <Palette className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateOverlay(o.id, { enabled: !o.enabled })
                              }
                              className={`px-2 py-1 rounded text-xs font-bold transition ${
                                o.enabled
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {o.enabled ? "ON" : "OFF"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveOverlay(o.id)}
                              className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition"
                              title="Remover"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-muted-foreground font-semibold">
                              <Move className="h-3 w-3 inline mr-0.5" />
                              Posição
                            </label>
                            <select
                              className="w-full text-xs rounded-lg border border-input bg-background px-2 py-1.5"
                              value={o.position}
                              onChange={(e) =>
                                handleUpdateOverlay(o.id, {
                                  position: e.target.value as ThemeOverlay["position"],
                                })
                              }
                            >
                              {POSITIONS.map((p) => (
                                <option key={p.value} value={p.value}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-muted-foreground font-semibold">
                              <Maximize className="h-3 w-3 inline mr-0.5" />
                              Tamanho: {o.width}%
                            </label>
                            <input
                              type="range"
                              min={5}
                              max={100}
                              value={o.width}
                              onChange={(e) =>
                                handleUpdateOverlay(o.id, {
                                  width: Number(e.target.value),
                                })
                              }
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-muted-foreground font-semibold">
                              Opacidade: {o.opacity}%
                            </label>
                            <input
                              type="range"
                              min={10}
                              max={100}
                              value={o.opacity}
                              onChange={(e) =>
                                handleUpdateOverlay(o.id, {
                                  opacity: Number(e.target.value),
                                })
                              }
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end pt-4 border-t">
              <Button onClick={handleSaveTheme} disabled={busy}>
                {busy ? "A guardar..." : "Guardar Tema"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="mt-4 focus-visible:outline-none">
          <Card>
            <CardHeader>
              <CardTitle>Marca e Identidade Visual</CardTitle>
              <CardDescription>
                Personalize o logotipo e o nome da loja exibidos no quiosque e no painel de
                administração.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5">
                  <Image className="h-4 w-4 text-muted-foreground" />
                  Logotipo da Loja
                </Label>
                <div className="flex items-start gap-4">
                  <div className="w-32 h-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30 shrink-0">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logotipo"
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="text-center p-2">
                        <Image className="h-8 w-8 mx-auto text-muted-foreground/50" />
                        <span className="text-[10px] text-muted-foreground block mt-1">
                          Sem logotipo
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        disabled={uploadingLogo}
                        className="relative"
                        asChild
                      >
                        <label className="cursor-pointer">
                          <Upload className="h-4 w-4 mr-1.5" />
                          {uploadingLogo ? "A carregar..." : "Carregar Imagem"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                            disabled={uploadingLogo}
                          />
                        </label>
                      </Button>
                      {logoUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLogoUrl("")}
                          title="Remover logotipo"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Formatos aceites: PNG, JPG, WEBP. A imagem será redimensionada
                      automaticamente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Store Name */}
              <div className="space-y-2 pt-4 border-t border-border">
                <Label htmlFor="store-name" className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Nome da Loja
                </Label>
                <Input
                  id="store-name"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Ex: MarquesMater"
                />
                <p className="text-[11px] text-muted-foreground">
                  Este nome aparece no título do painel de administração e no ecrã do quiosque.
                </p>
              </div>

              {/* Logo Preview */}
              <div className="pt-4 border-t border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Pré-visualização do logotipo
                </span>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#0f3460] text-white text-center shadow-md flex flex-col items-center gap-3">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logotipo"
                      className="h-16 w-auto max-w-[200px] object-contain"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-white/10 flex items-center justify-center">
                      <Image className="h-8 w-8 text-white/50" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="font-bold text-base">{storeName || "Nome da Loja"}</p>
                    <p className="text-[10px] opacity-60">Quiosque interativo</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end pt-4 border-t">
              <Button onClick={handleSaveBranding} disabled={busy}>
                <Save className="h-4 w-4 mr-1.5" />
                {busy ? "A guardar..." : "Guardar Marca"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
