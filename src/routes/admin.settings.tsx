import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Mail, Lock, Video, Languages, Palette, Save, Plus, X, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

type Tab = "account" | "videos" | "phrases" | "theme";

function AdminSettings() {
  const [tab, setTab] = useState<Tab>("account");

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "account", label: "Conta", icon: <Settings className="h-4 w-4" /> },
    { key: "videos", label: "Vídeos", icon: <Video className="h-4 w-4" /> },
    { key: "phrases", label: "Frases", icon: <Languages className="h-4 w-4" /> },
    { key: "theme", label: "Tema", icon: <Palette className="h-4 w-4" /> },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-primary mb-6 flex items-center gap-2">
        <Settings className="h-7 w-7" /> Definições
      </h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition ${
              tab === t.key
                ? "bg-accent text-accent-foreground shadow-sm"
                : "bg-card border border-border hover:border-accent/50 text-muted-foreground"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "account" && <AccountTab />}
      {tab === "videos" && <VideosTab />}
      {tab === "phrases" && <PhrasesTab />}
      {tab === "theme" && <ThemeTab />}
    </div>
  );
}

/* ─── Account Tab ─── */

function AccountTab() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busyEmail, setBusyEmail] = useState(false);
  const [busyPass, setBusyPass] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUser(data.user);
        setEmail(data.user.email ?? "");
      }
    });
  }, []);

  async function handleUpdateEmail() {
    if (!email.trim()) return;
    setBusyEmail(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Email atualizado! Confirma o novo email no link que enviámos.");
    }
    setBusyEmail(false);
  }

  async function handleUpdatePassword() {
    if (newPassword.length < 6) {
      toast.error("A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }
    setBusyPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Palavra-passe atualizada com sucesso!");
      setNewPassword("");
    }
    setBusyPass(false);
  }

  return (
    <div className="max-w-lg space-y-8">
      <div className="bg-card border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-accent" /> Alterar email
        </h2>
        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="novo@email.com"
            className="w-full h-12 px-4 rounded-xl border border-input bg-background text-base focus:border-accent focus:ring-1 focus:ring-accent outline-none"
          />
          <button
            onClick={handleUpdateEmail}
            disabled={busyEmail}
            className="kiosk-btn bg-accent text-accent-foreground px-6 py-3 text-sm font-bold disabled:opacity-50"
          >
            {busyEmail ? "A atualizar..." : "Atualizar email"}
          </button>
        </div>
      </div>

      <div className="bg-card border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-accent" /> Alterar palavra-passe
        </h2>
        <div className="space-y-3">
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova palavra-passe (mín. 6 caracteres)"
              className="w-full h-12 px-4 pr-12 rounded-xl border border-input bg-background text-base focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            />
            <button
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <button
            onClick={handleUpdatePassword}
            disabled={busyPass}
            className="kiosk-btn bg-accent text-accent-foreground px-6 py-3 text-sm font-bold disabled:opacity-50"
          >
            {busyPass ? "A atualizar..." : "Atualizar palavra-passe"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Videos Tab ─── */

function VideosTab() {
  const [videos, setVideos] = useState<string[]>([]);
  const [newId, setNewId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("settings").select("value").eq("key", "videos").maybeSingle()
      .then(({ data }) => {
        if (data?.value) setVideos(data.value as string[]);
        setLoading(false);
      });
  }, []);

  async function save(v: string[]) {
    setVideos(v);
    const { error } = await supabase.from("settings").upsert({ key: "videos", value: v }, { onConflict: "key" });
    if (error) toast.error(error.message);
    else toast.success("Vídeos atualizados!");
  }

  function addVideo() {
    const id = newId.trim();
    if (!id) return;
    const match = id.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const cleanId = match ? match[1] : id;
    if (videos.includes(cleanId)) {
      toast.error("Este vídeo já está na lista.");
      return;
    }
    save([...videos, cleanId]);
    setNewId("");
  }

  function removeVideo(id: string) {
    save(videos.filter((v) => v !== id));
  }

  if (loading) return <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />;

  return (
    <div className="max-w-2xl">
      <div className="bg-card border rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Video className="h-5 w-5 text-accent" /> Vídeos de fundo (YouTube)
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Estes vídeos aparecem como fundo no ecrã principal do quiosque.
        </p>
        <div className="flex gap-2 mb-4">
          <input
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addVideo()}
            placeholder="URL ou ID do YouTube"
            className="flex-1 h-12 px-4 rounded-xl border border-input bg-background text-base focus:border-accent focus:ring-1 focus:ring-accent outline-none"
          />
          <button onClick={addVideo} className="kiosk-btn bg-accent text-accent-foreground px-5 py-3 text-sm font-bold">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {videos.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum vídeo adicionado.</p>
        ) : (
          <div className="space-y-2">
            {videos.map((id) => (
              <div key={id} className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-3 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-16 rounded-lg bg-black/10 overflow-hidden shrink-0">
                    <img
                      src={`https://img.youtube.com/vi/${id}/default.jpg`}
                      alt={id}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                  <div>
                    <code className="text-sm font-mono text-foreground">{id}</code>
                    <p className="text-xs text-muted-foreground">youtube.com/watch?v={id}</p>
                  </div>
                </div>
                <button onClick={() => removeVideo(id)} className="h-8 w-8 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Phrases Tab ─── */

function PhrasesTab() {
  const langs = ["pt", "en", "es"] as const;
  const langLabels = { pt: "Português", en: "English", es: "Español" };
  const [phrases, setPhrases] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeLang, setActiveLang] = useState<string>("pt");

  useEffect(() => {
    supabase.from("settings").select("value").eq("key", "phrases").maybeSingle()
      .then(({ data }) => {
        if (data?.value) setPhrases(data.value as Record<string, Record<string, string>>);
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from("settings").upsert({ key: "phrases", value: phrases }, { onConflict: "key" });
    if (error) toast.error(error.message);
    else toast.success("Frases atualizadas!");
    setSaving(false);
  }

  function updatePhrase(lang: string, key: string, value: string) {
    setPhrases((prev) => ({
      ...prev,
      [lang]: { ...(prev[lang] || {}), [key]: value },
    }));
  }

  if (loading) return <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />;

  const keys = ["welcome", "subtitle"];

  return (
    <div className="max-w-2xl">
      <div className="bg-card border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Languages className="h-5 w-5 text-accent" /> Frases do ecrã principal
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Personaliza as frases que aparecem no ecrã inicial do quiosque.
        </p>

        <div className="flex gap-2 mb-6 flex-wrap">
          {langs.map((l) => (
            <button
              key={l}
              onClick={() => setActiveLang(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeLang === l ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {langLabels[l]}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {keys.map((key) => (
            <div key={key}>
              <label className="block text-sm font-medium text-foreground mb-1.5 capitalize">{key}</label>
              <input
                value={phrases[activeLang]?.[key] || ""}
                onChange={(e) => updatePhrase(activeLang, key, e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-input bg-background text-base focus:border-accent focus:ring-1 focus:ring-accent outline-none"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 kiosk-btn bg-accent text-accent-foreground px-6 py-3 text-sm font-bold disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? "A guardar..." : "Guardar frases"}
        </button>
      </div>
    </div>
  );
}

/* ─── Theme Tab ─── */

const THEMES = [
  { label: "Clássico (azul + laranja)", primary: "navy", accent: "orange", primaryColor: "oklch(0.32 0.10 265)", accentColor: "oklch(0.72 0.17 55)" },
  { label: "Verde + dourado", primary: "green", accent: "gold", primaryColor: "oklch(0.35 0.12 145)", accentColor: "oklch(0.75 0.15 85)" },
  { label: "Roxo + rosa", primary: "purple", accent: "pink", primaryColor: "oklch(0.30 0.15 290)", accentColor: "oklch(0.65 0.20 340)" },
  { label: "Azul claro + coral", primary: "sky", accent: "coral", primaryColor: "oklch(0.40 0.10 235)", accentColor: "oklch(0.70 0.18 25)" },
  { label: "Cinzento + amarelo", primary: "slate", accent: "yellow", primaryColor: "oklch(0.30 0.05 260)", accentColor: "oklch(0.75 0.15 95)" },
];

function ThemeTab() {
  const [selected, setSelected] = useState<string>("navy");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("settings").select("value").eq("key", "theme").maybeSingle()
      .then(({ data }) => {
        if (data?.value) setSelected((data.value as any).primary || "navy");
        setLoading(false);
      });
  }, []);

  async function handleSave(primary: string, accent: string) {
    setSelected(primary);
    setSaving(true);
    const { error } = await supabase.from("settings").upsert({ key: "theme", value: { primary, accent } }, { onConflict: "key" });
    if (error) toast.error(error.message);
    else toast.success("Tema guardado! Aplica-se após atualizar a página.");
    setSaving(false);
  }

  if (loading) return <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />;

  return (
    <div className="max-w-2xl">
      <div className="bg-card border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-accent" /> Tema do quiosque
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Escolhe o esquema de cores do quiosque.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {THEMES.map((theme) => (
            <button
              key={theme.primary}
              onClick={() => handleSave(theme.primary, theme.accent)}
              disabled={saving}
              className={`group relative bg-card border-2 rounded-2xl p-4 text-left transition-all hover:scale-[1.02] ${
                selected === theme.primary ? "border-accent shadow-md" : "border-border hover:border-accent/50"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex gap-1">
                  <div className="h-6 w-6 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
                  <div className="h-6 w-6 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                </div>
                <span className="font-semibold text-sm">{theme.label}</span>
              </div>
              {selected === theme.primary && (
                <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
