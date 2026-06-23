import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useCart } from "@/lib/useCart";
import { toast } from "sonner";
import {
  Paintbrush,
  Ruler,
  Droplets,
  Palette,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  ShoppingCart,
  Check,
  Heart,
  RotateCcw,
  Hash,
  Star,
  Info,
  Scan,
} from "lucide-react";

export const Route = createFileRoute("/kiosk/paints")({
  component: PaintsPage,
});

const FINISHES = [
  { id: "mate", label: "Mate", desc: "Sem brilho, aspeto aveludado" },
  { id: "acetinado", label: "Acetinado", desc: "Brilho suave, fácil de limpar" },
  { id: "brilhante", label: "Brilhante", desc: "Alto brilho, super resistente" },
];

const SURFACES = [
  { id: "interior", label: "Parede Interior", icon: "🏠" },
  { id: "exterior", label: "Parede Exterior", icon: "🌳" },
  { id: "madeira", label: "Madeira", icon: "🪵" },
  { id: "metal", label: "Metal", icon: "🔩" },
  { id: "teto", label: "Teto", icon: "⬆️" },
];

const SURFACE_FINISH_MAP: Record<string, string[]> = {
  interior: ["mate", "acetinado", "brilhante"],
  exterior: ["acetinado", "brilhante"],
  madeira: ["acetinado", "brilhante"],
  metal: ["brilhante"],
  teto: ["mate"],
};

const SURFACE_FINISH_HINTS: Record<string, Record<string, string>> = {
  interior: { mate: "Ótimo para salas e quartos" },
  exterior: { acetinado: "Resistente à chuva e sol" },
  madeira: { acetinado: "Protege e realça a madeira" },
  metal: { brilhante: "Acabamento duro e anti-corrosão" },
  teto: { mate: "Não reflete luz, disfarça imperfeições" },
};

const SWATCHES = [
  { name: "Branco Neve", hex: "#f5f5f0" },
  { name: "Branco Gelo", hex: "#f0f4f8" },
  { name: "Cinza Claro", hex: "#d0d0d0" },
  { name: "Cinza Pedra", hex: "#b0b0b0" },
  { name: "Grafite", hex: "#5a5a5a" },
  { name: "Preto Carvão", hex: "#2a2a2a" },
  { name: "Bege Areia", hex: "#e8dcc8" },
  { name: "Bege Natural", hex: "#d4c5a9" },
  { name: "Castanho", hex: "#8b6914" },
  { name: "Terracota", hex: "#c4623e" },
  { name: "Vermelho Tijolo", hex: "#a33b2b" },
  { name: "Rosa Antigo", hex: "#d4a0a0" },
  { name: "Rosa Bebé", hex: "#f4c2c2" },
  { name: "Lavanda", hex: "#c4b3d4" },
  { name: "Roxo", hex: "#7b4f8a" },
  { name: "Azul Sereno", hex: "#7ba7bc" },
  { name: "Azul Céu", hex: "#a8d5e2" },
  { name: "Azul Escuro", hex: "#2c4a6e" },
  { name: "Verde Menta", hex: "#a3d9b1" },
  { name: "Verde Campo", hex: "#7a9e7e" },
  { name: "Verde Escuro", hex: "#2d5a27" },
  { name: "Amarelo Sol", hex: "#e8c84a" },
  { name: "Amarelo Mostarda", hex: "#d4a843" },
  { name: "Vinho", hex: "#6b2f3a" },
];

type Step = "welcome" | "surface" | "finish" | "calculate" | "result";

function PaintsPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [surface, setSurface] = useState("");
  const [finish, setFinish] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [walls, setWalls] = useState("1");
  const [coats, setCoats] = useState("2");
  const [selectedColor, setSelectedColor] = useState("#f5f5f0");
  const [bgColor, setBgColor] = useState("#f5f5f0");
  const [customHex, setCustomHex] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("paintFavorites") || "[]");
    } catch { return []; }
  });
  const cart = useCart();
  const [animKey, setAnimKey] = useState(0);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  useEffect(() => {
    localStorage.setItem("paintFavorites", JSON.stringify(favorites));
  }, [favorites]);

  const colorPreviewRef = useRef<HTMLDivElement>(null);

  const availableFinishes = surface ? SURFACE_FINISH_MAP[surface] || [] : FINISHES.map((f) => f.id);
  const finishIncompatible = finish && !availableFinishes.includes(finish);

  const area = (Number(width) || 0) * (Number(height) || 0) * (Number(walls) || 1);
  const coveragePerLiter = surface === "exterior" ? 8 : surface === "madeira" || surface === "metal" ? 10 : 12;
  const totalLiters = area > 0 ? (area * (Number(coats) || 1)) / coveragePerLiter : 0;
  const cans5l = Math.ceil(totalLiters / 5);
  const cans1l = Math.max(0, Math.ceil((totalLiters - cans5l * 5) / 1));

  const surfaceLabel = SURFACES.find((s) => s.id === surface)?.label || surface;
  const finishLabel = FINISHES.find((f) => f.id === finish)?.label || finish;

  const { data: paintProducts = [] } = useQuery({
    queryKey: ["paint-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .ilike("category", "%pintur%")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  function goTo(s: Step) {
    setAnimKey((k) => k + 1);
    setStep(s);
  }

  function handleColorSelect(hex: string) {
    setSelectedColor(hex);
    setBgColor(hex);
    setCustomHex("");
    if (colorPreviewRef.current) {
      colorPreviewRef.current.style.backgroundColor = hex;
    }
  }

  function handleCustomHex(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setCustomHex(v);
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      handleColorSelect(v);
    }
  }

  function toggleFavorite(hex: string) {
    setFavorites((prev) =>
      prev.includes(hex) ? prev.filter((h) => h !== hex) : [...prev, hex],
    );
  }

  function reset() {
    goTo("welcome");
    setSurface("");
    setFinish("");
    setWidth("");
    setHeight("");
    setWalls("1");
    setCoats("2");
    setBgColor(selectedColor);
  }

  const STEP_LABELS = ["Superfície", "Acabamento", "Medidas", "Resultado"];

  function renderStepBar() {
    const order: Step[] = ["surface", "finish", "calculate", "result"];
    const idx = order.indexOf(step);
    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {order.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (i < idx) goTo(s);
              }}
              disabled={i > idx}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                i === idx
                  ? "bg-white text-gray-900 shadow-lg scale-110"
                  : i < idx
                    ? "bg-white/80 text-gray-900 cursor-pointer hover:bg-white"
                    : "bg-white/20 text-white/60 cursor-default"
              }`}
            >
              {i < idx ? <Check className="h-4 w-4" /> : i + 1}
            </button>
            {i < 3 && (
              <div
                className={`w-8 h-0.5 ${i < idx ? "bg-white/80" : "bg-white/20"}`}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={colorPreviewRef}
      className="min-h-screen transition-colors duration-700 flex flex-col"
      style={{ backgroundColor: bgColor }}
    >
      <div className="bg-black/20 backdrop-blur-sm text-white">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/kiosk/start" className="flex items-center gap-2 text-white/80 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-semibold">Voltar</span>
          </Link>
          <div className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5" />
            <span className="font-bold">Mundo das Tintas</span>
          </div>
          <button
            onClick={() => setShowBarcodeScanner(true)}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition"
          >
            <Scan className="h-4 w-4" />
            Scanear
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 md:py-8">
        {/* Dark overlay ensures text is readable on any background color */}
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        <div className="w-full max-w-2xl relative">
          {step !== "welcome" && renderStepBar()}

          <div key={animKey} className="animate-fade-in">
            {step === "welcome" && (
              <div className="text-center text-white">
                <div className="text-7xl mb-6">🎨</div>
                <h1 className="text-4xl md:text-6xl font-black mb-4 drop-shadow-2xl [text-shadow:0_2px_12px_rgba(0,0,0,0.3)]">
                  Encontre a Tinta Perfeita
                </h1>
                <p className="text-lg md:text-xl text-white/80 mb-8 max-w-lg mx-auto">
                  Descubra a tinta ideal para o seu projeto, calcule a quantidade certa e explore cores — tudo aqui.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {[
                    { icon: "🎯", title: "Produto Certo", desc: "Guia rápido para escolher" },
                    { icon: "📐", title: "Calculadora", desc: "Quantos litros precisa" },
                    { icon: "🎨", title: "Explorar Cores", desc: "Visualizar no ecrã" },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="bg-white/20 backdrop-blur rounded-2xl p-5 text-center border border-white/10"
                    >
                      <div className="text-3xl mb-2">{item.icon}</div>
                      <div className="font-bold text-sm">{item.title}</div>
                      <div className="text-xs text-white/60 mt-1">{item.desc}</div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => goTo("surface")}
                  className="bg-white text-gray-900 font-bold text-xl px-12 py-5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-transform"
                >
                  Começar <Sparkles className="inline h-5 w-5 ml-2" />
                </button>
              </div>
            )}

            {step === "surface" && (
              <div>
                <h2 className="text-3xl font-black text-white text-center mb-2">O que vais pintar?</h2>
                <p className="text-center text-white/60 mb-6">Escolhe a superfície para recomendarmos a tinta certa.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {SURFACES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSurface(s.id);
                        if (finish && !SURFACE_FINISH_MAP[s.id].includes(finish)) {
                          setFinish("");
                        }
                        goTo("finish");
                      }}
                      className={`p-6 rounded-2xl text-center transition-all duration-200 border-2 ${
                        surface === s.id
                          ? "bg-white text-gray-900 border-white scale-105 shadow-xl"
                          : "bg-white/20 text-white border-white/10 hover:bg-white/20"
                      }`}
                    >
                      <div className="text-4xl mb-2">{s.icon}</div>
                      <div className="font-bold">{s.label}</div>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-6">
                  <button onClick={() => goTo("welcome")} className="text-white/60 hover:text-white text-sm flex items-center gap-1">
                    <ArrowLeft className="h-4 w-4" /> Voltar
                  </button>
                </div>
              </div>
            )}

            {step === "finish" && (
              <div>
                <h2 className="text-3xl font-black text-white text-center mb-2">Acabamento pretendido?</h2>
                <p className="text-center text-white/60 mb-6">O aspeto final da pintura.</p>
                {finishIncompatible && (
                  <div className="bg-amber-400/20 border border-amber-400/30 text-amber-200 rounded-xl p-3 mb-4 text-sm flex items-center gap-2">
                    <Info className="h-4 w-4 shrink-0" />
                    "{finishLabel}" não é recomendado para {surfaceLabel}. Seleciona um acabamento compatível.
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {FINISHES.map((f) => {
                    const compatible = availableFinishes.includes(f.id);
                    const hint = SURFACE_FINISH_HINTS[surface]?.[f.id];
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          if (compatible) {
                            setFinish(f.id);
                            goTo("calculate");
                          }
                        }}
                        disabled={!compatible}
                        className={`p-6 rounded-2xl text-center transition-all duration-200 border-2 ${
                          finish === f.id
                            ? "bg-white text-gray-900 border-white scale-105 shadow-xl"
                            : compatible
                              ? "bg-white/20 text-white border-white/10 hover:bg-white/20"
                              : "bg-white/15 text-white/30 border-white/5 cursor-not-allowed"
                        }`}
                      >
                        <Droplets className={`h-8 w-8 mx-auto mb-2 ${finish === f.id ? "text-gray-900" : compatible ? "text-white/80" : "text-white/20"}`} />
                        <div className="font-bold">{f.label}</div>
                        <div className="text-xs mt-1">{compatible ? f.desc : "Não recomendado"}</div>
                        {hint && (
                          <div className="text-[10px] mt-1 opacity-60">{hint}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-6">
                  <button onClick={() => goTo("surface")} className="text-white/60 hover:text-white text-sm flex items-center gap-1">
                    <ArrowLeft className="h-4 w-4" /> Voltar
                  </button>
                </div>
              </div>
            )}

            {step === "calculate" && (
              <div>
                <h2 className="text-3xl font-black text-white text-center mb-2">Calculadora de Tinta</h2>
                <p className="text-center text-white/60 mb-6">Mede a área a pintar.</p>
                <div className="bg-white/20 backdrop-blur rounded-2xl p-6 border border-white/10 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/80 text-sm font-semibold block mb-1">
                        <Ruler className="h-4 w-4 inline mr-1" />
                        Largura (m)
                      </label>
                      <input
                        type="number"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        placeholder="ex: 4"
                        step="0.1"
                        min="0"
                        className="w-full bg-white/20 text-white placeholder-white/40 rounded-xl px-4 py-3 text-lg font-bold outline-none border border-white/10 focus:border-white/40"
                      />
                    </div>
                    <div>
                      <label className="text-white/80 text-sm font-semibold block mb-1">
                        <Ruler className="h-4 w-4 inline mr-1" />
                        Altura (m)
                      </label>
                      <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="ex: 2.5"
                        step="0.1"
                        min="0"
                        className="w-full bg-white/20 text-white placeholder-white/40 rounded-xl px-4 py-3 text-lg font-bold outline-none border border-white/10 focus:border-white/40"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/80 text-sm font-semibold block mb-1">Paredes</label>
                      <select
                        value={walls}
                        onChange={(e) => setWalls(e.target.value)}
                        className="w-full bg-white/20 text-white rounded-xl px-4 py-3 text-lg font-bold outline-none border border-white/10 focus:border-white/40"
                      >
                        {[1, 2, 3, 4].map((n) => (
                          <option key={n} value={n} className="bg-gray-800 text-white">
                            {n} parede{n > 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-white/80 text-sm font-semibold block mb-1">Demãos</label>
                      <select
                        value={coats}
                        onChange={(e) => setCoats(e.target.value)}
                        className="w-full bg-white/20 text-white rounded-xl px-4 py-3 text-lg font-bold outline-none border border-white/10 focus:border-white/40"
                      >
                        {[1, 2, 3].map((n) => (
                          <option key={n} value={n} className="bg-gray-800 text-white">
                            {n} demão{n > 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {area > 0 && (
                    <div className="bg-white/20 rounded-xl p-4 text-center">
                      <p className="text-white/60 text-xs">Área total</p>
                      <p className="text-white text-2xl font-bold">{area.toFixed(1)} m²</p>
                    </div>
                  )}

                  <button
                    onClick={() => goTo("result")}
                    disabled={!width || !height}
                    className="w-full bg-white text-gray-900 font-bold text-lg py-4 rounded-xl hover:scale-[1.02] transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Calcular <ArrowRight className="inline h-5 w-5 ml-1" />
                  </button>
                </div>
                <div className="flex justify-between mt-6">
                  <button onClick={() => goTo("finish")} className="text-white/60 hover:text-white text-sm flex items-center gap-1">
                    <ArrowLeft className="h-4 w-4" /> Voltar
                  </button>
                </div>
              </div>
            )}

            {step === "result" && (
              <div className="space-y-6">
                <div className="bg-white/20 backdrop-blur rounded-2xl p-6 border border-white/10 text-white text-center">
                  <div className="text-5xl mb-3">📐</div>
                  <h2 className="text-3xl font-black mb-1">Resultado</h2>
                  <p className="text-white/60 text-sm mb-4">{surfaceLabel} · {finishLabel}</p>

                  <div className="text-6xl font-black mb-2">
                    {totalLiters < 1 ? "< 1" : Math.ceil(totalLiters)}
                    <span className="text-2xl font-bold ml-1">L</span>
                  </div>
                  <p className="text-white/60 text-xs">{area.toFixed(1)} m² · {coats} demão{Number(coats) > 1 ? "s" : ""}</p>

                  <div className="flex justify-center gap-4 mt-6">
                    {cans5l > 0 && (
                      <div className="bg-white/20 rounded-xl p-4 text-center min-w-[100px] border border-white/10">
                        <div className="text-3xl mb-1">🪣</div>
                        <div className="text-2xl font-bold">{cans5l}x</div>
                        <div className="text-xs text-white/60">5L</div>
                      </div>
                    )}
                    {cans1l > 0 && (
                      <div className="bg-white/20 rounded-xl p-4 text-center min-w-[100px] border border-white/10">
                        <div className="text-2xl mb-1">🥫</div>
                        <div className="text-2xl font-bold">{cans1l}x</div>
                        <div className="text-xs text-white/60">1L</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Paint Products */}
                {paintProducts.length > 0 && (
                  <div className="bg-white/20 backdrop-blur rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                      <ShoppingCart className="h-5 w-5 text-white" />
                      <h3 className="text-lg font-bold text-white">Tintas Recomendadas</h3>
                    </div>
                    <div className="space-y-2">
                      {paintProducts.slice(0, 6).map((p) => (
                        <Link
                          key={p.id}
                          to="/kiosk/product/$id"
                          params={{ id: p.id }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/15 hover:bg-white/20 transition border border-white/5"
                        >
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                              <Paintbrush className="h-6 w-6 text-white/40" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white text-sm truncate">{p.name}</div>
                            {p.price != null && (
                              <div className="text-white/60 text-xs">
                                {p.price.toFixed(2).replace(".", ",")}€
                                {p.promotion_active && p.promotion_price != null && (
                                  <span className="text-emerald-300 ml-2">
                                    Promo: {p.promotion_price.toFixed(2).replace(".", ",")}€
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <ArrowRight className="h-4 w-4 text-white/40" />
                        </Link>
                      ))}
                    </div>
                    {paintProducts.length > 6 && (
                      <Link
                        to="/kiosk/search"
                        className="block text-center text-white/60 hover:text-white text-sm mt-3 pt-3 border-t border-white/10"
                      >
                        Ver todas as {paintProducts.length} tintas
                      </Link>
                    )}
                  </div>
                )}

                {/* Color Explorer */}
                <div className="bg-white/20 backdrop-blur rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-2 mb-4">
                    <Palette className="h-5 w-5 text-white" />
                    <h3 className="text-lg font-bold text-white">Explorar Cores</h3>
                  </div>

                  {/* Custom hex input */}
                  <div className="flex items-center gap-2 mb-4 bg-white/20 rounded-xl px-4 py-2 border border-white/10">
                    <Hash className="h-4 w-4 text-white/40" />
                    <input
                      type="text"
                      value={customHex}
                      onChange={handleCustomHex}
                      placeholder="Código de cor ex: ff5733"
                      maxLength={7}
                      className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-sm font-mono"
                    />
                    {customHex && /^#[0-9a-fA-F]{6}$/.test(customHex) && (
                      <div className="w-6 h-6 rounded border border-white/30" style={{ backgroundColor: customHex }} />
                    )}
                  </div>

                  <p className="text-white/60 text-xs mb-3">Toca numa cor para veres como fica no ecrã:</p>
                  <div className="flex flex-wrap gap-2">
                    {SWATCHES.map((s) => {
                      const isFav = favorites.includes(s.hex);
                      return (
                        <div key={s.hex} className="relative group">
                          <button
                            onClick={() => handleColorSelect(s.hex)}
                            className={`w-10 h-10 rounded-full border-2 transition-all duration-200 hover:scale-125 ${
                              selectedColor === s.hex ? "border-white scale-110 shadow-lg" : "border-white/30"
                            }`}
                            style={{ backgroundColor: s.hex }}
                            title={s.name}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(s.hex); }}
                            className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Heart className={`h-3 w-3 ${isFav ? "fill-red-400 text-red-400" : "text-white/60"}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Favorites section */}
                  {favorites.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-1 mb-2">
                        <Heart className="h-3 w-3 text-red-400 fill-red-400" />
                        <span className="text-white/60 text-xs">Favoritas</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {favorites.map((hex) => {
                          const swatch = SWATCHES.find((s) => s.hex === hex);
                          return (
                            <div key={hex} className="relative group">
                              <button
                                onClick={() => handleColorSelect(hex)}
                                className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-125 ${
                                  selectedColor === hex ? "border-white scale-110 shadow-lg" : "border-white/30"
                                }`}
                                style={{ backgroundColor: hex }}
                                title={swatch?.name || hex}
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(hex); }}
                                className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Star className="h-2.5 w-2.5 text-red-300" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                    <div>
                      <div className="text-white font-bold">{SWATCHES.find((s) => s.hex === selectedColor)?.name || "Personalizada"}</div>
                      <div className="text-white/60 text-xs">{selectedColor}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-12 h-12 rounded-xl border-2 border-white/30"
                        style={{ backgroundColor: selectedColor }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={reset}
                    className="flex-1 bg-white/20 text-white font-bold py-4 rounded-xl border border-white/20 hover:bg-white/20 transition flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="h-5 w-5" />
                    Recomeçar
                  </button>
                  <Link
                    to="/kiosk/start"
                    className="flex-1 bg-accent text-accent-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Ir para Compras
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <BarcodeScanner
        open={showBarcodeScanner}
        onDetected={async (barcode) => {
          setShowBarcodeScanner(false);
          const { data } = await supabase
            .from("products")
            .select("*")
            .eq("barcode", barcode)
            .eq("active", true)
            .maybeSingle();
          if (data) {
            cart.addProduct(data.id, data.name, data.price ?? 0, "Mundo das Tintas");
            toast(`"${data.name}" adicionado ao carrinho`);
          } else {
            toast("Produto não encontrado na base de dados.");
          }
        }}
        onClose={() => setShowBarcodeScanner(false)}
      />
    </div>
  );
}
