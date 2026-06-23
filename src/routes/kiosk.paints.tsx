import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  Search,
} from "lucide-react";

export const Route = createFileRoute("/kiosk/paints")({
  component: PaintsPage,
});

const NEUCE_RED = "#ba0031";

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

const SURFACE_CATEGORY_MAP: Record<string, string[]> = {
  interior: ["Tintas Decorativas", "Tintas para Madeira"],
  exterior: ["Tintas Decorativas", "Impermeabilizantes"],
  madeira: ["Tintas para Madeira", "Proteção de Madeira"],
  metal: ["Anticorrosivos", "Tintas Decorativas"],
  teto: ["Tintas Decorativas"],
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
  const [customHex, setCustomHex] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("paintFavorites") || "[]"); } catch { return []; }
  });
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    localStorage.setItem("paintFavorites", JSON.stringify(favorites));
  }, [favorites]);

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

  const recommendedProducts = useMemo(() => {
    if (!surface || paintProducts.length === 0) return [];
    const cats = SURFACE_CATEGORY_MAP[surface] || [];
    return paintProducts.filter((p: any) =>
      cats.some((c) => (p.category || "").toLowerCase().includes(c.toLowerCase())),
    ).slice(0, 6);
  }, [surface, paintProducts]);

  const cartRed = useRef<HTMLDivElement>(null);

  function goTo(s: Step) {
    setAnimKey((k) => k + 1);
    setStep(s);
  }

  function handleColorSelect(hex: string) {
    setSelectedColor(hex);
    setCustomHex("");
  }

  function handleCustomHex(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setCustomHex(v);
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      setSelectedColor(v);
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
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/kiosk/start" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-semibold">Voltar</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md" style={{ backgroundColor: NEUCE_RED }}>
              <Paintbrush className="h-4 w-4 text-white m-auto" style={{ display: 'block', paddingTop: 3 }} />
            </div>
            <span className="font-bold text-gray-900">NEUCE</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {step !== "welcome" && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {(["surface", "finish", "calculate", "result"] as Step[]).map((s, i) => {
              const order: Step[] = ["surface", "finish", "calculate", "result"];
              const idx = order.indexOf(step);
              return (
                <div key={s} className="flex items-center gap-2">
                  <button
                    onClick={() => { if (i < idx) goTo(s); }}
                    disabled={i > idx}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      i === idx
                        ? "text-white shadow-lg scale-110"
                        : i < idx
                          ? "text-white cursor-pointer"
                          : "bg-gray-100 text-gray-300 cursor-default"
                    }`}
                    style={{
                      backgroundColor: i <= idx ? NEUCE_RED : undefined,
                    }}
                  >
                    {i < idx ? <Check className="h-4 w-4" /> : i + 1}
                  </button>
                  {i < 3 && <div className={`w-8 h-0.5 ${i < idx ? "" : "bg-gray-200"}`} style={{ backgroundColor: i < idx ? NEUCE_RED : undefined }} />}
                </div>
              );
            })}
          </div>
        )}

        <div key={animKey} className="animate-fade-in">
          {step === "welcome" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg" style={{ backgroundColor: NEUCE_RED }}>
                <Paintbrush className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-4xl font-black text-gray-900 mb-3">
                Encontre a Tinta Perfeita
              </h1>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Descubra a tinta ideal para o seu projeto, calcule a quantidade certa e explore cores.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                {[
                  { icon: "🎯", title: "Produto Certo", desc: "Guia rápido para escolher" },
                  { icon: "📐", title: "Calculadora", desc: "Quantos litros precisa" },
                  { icon: "🎨", title: "Explorar Cores", desc: "Visualizar no ecrã" },
                ].map((item) => (
                  <div key={item.title} className="bg-gray-50 rounded-2xl p-5 text-center border border-gray-100">
                    <div className="text-3xl mb-2">{item.icon}</div>
                    <div className="font-bold text-sm text-gray-900">{item.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => goTo("surface")}
                className="text-white font-bold text-xl px-12 py-5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-transform"
                style={{ backgroundColor: NEUCE_RED }}
              >
                Começar <Sparkles className="inline h-5 w-5 ml-2" />
              </button>
            </div>
          )}

          {step === "surface" && (
            <div>
              <h2 className="text-2xl font-black text-gray-900 text-center mb-2">O que vais pintar?</h2>
              <p className="text-center text-gray-500 mb-6">Escolhe a superfície para recomendarmos a tinta certa.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SURFACES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSurface(s.id);
                      if (finish && !SURFACE_FINISH_MAP[s.id].includes(finish)) setFinish("");
                      goTo("finish");
                    }}
                    className="p-6 rounded-2xl text-center transition-all duration-200 border-2 bg-white hover:shadow-md"
                    style={{
                      borderColor: surface === s.id ? NEUCE_RED : "#e5e7eb",
                      backgroundColor: surface === s.id ? "#fff" : "white",
                    }}
                  >
                    <div className="text-4xl mb-2">{s.icon}</div>
                    <div className="font-bold text-gray-900">{s.label}</div>
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={() => goTo("welcome")} className="text-gray-500 hover:text-gray-900 text-sm flex items-center gap-1 font-semibold">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </button>
              </div>
            </div>
          )}

          {step === "finish" && (
            <div>
              <h2 className="text-2xl font-black text-gray-900 text-center mb-2">Acabamento pretendido?</h2>
              <p className="text-center text-gray-500 mb-6">O aspeto final da pintura.</p>
              {finishIncompatible && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 mb-4 text-sm flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0 text-amber-600" />
                  "{finishLabel}" não é recomendado para {surfaceLabel}.
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {FINISHES.map((f) => {
                  const compatible = availableFinishes.includes(f.id);
                  const hint = SURFACE_FINISH_HINTS[surface]?.[f.id];
                  const selected = finish === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => { if (compatible) { setFinish(f.id); goTo("calculate"); } }}
                      disabled={!compatible}
                      className="p-6 rounded-2xl text-center transition-all border-2"
                      style={{
                        borderColor: selected ? NEUCE_RED : compatible ? "#e5e7eb" : "#f3f4f6",
                        backgroundColor: selected ? "#fff" : compatible ? "white" : "#f9fafb",
                        opacity: compatible ? 1 : 0.5,
                      }}
                    >
                      <Droplets className={`h-8 w-8 mx-auto mb-2 ${selected ? "" : compatible ? "text-gray-600" : "text-gray-300"}`} style={{ color: selected ? NEUCE_RED : undefined }} />
                      <div className="font-bold text-gray-900">{f.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{compatible ? f.desc : "Não recomendado"}</div>
                      {hint && <div className="text-[10px] mt-1 text-gray-400">{hint}</div>}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={() => goTo("surface")} className="text-gray-500 hover:text-gray-900 text-sm flex items-center gap-1 font-semibold">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </button>
              </div>
            </div>
          )}

          {step === "calculate" && (
            <div>
              <h2 className="text-2xl font-black text-gray-900 text-center mb-2">Calculadora de Tinta</h2>
              <p className="text-center text-gray-500 mb-6">Mede a área a pintar.</p>
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-700 text-sm font-semibold block mb-1">
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
                      className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 text-lg font-bold outline-none border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    />
                  </div>
                  <div>
                    <label className="text-gray-700 text-sm font-semibold block mb-1">
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
                      className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 text-lg font-bold outline-none border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-700 text-sm font-semibold block mb-1">Paredes</label>
                    <select
                      value={walls}
                      onChange={(e) => setWalls(e.target.value)}
                      className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 text-lg font-bold outline-none border border-gray-200 focus:border-red-500"
                    >
                      {[1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>{n} parede{n > 1 ? "s" : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-700 text-sm font-semibold block mb-1">Demãos</label>
                    <select
                      value={coats}
                      onChange={(e) => setCoats(e.target.value)}
                      className="w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 text-lg font-bold outline-none border border-gray-200 focus:border-red-500"
                    >
                      {[1, 2, 3].map((n) => (
                        <option key={n} value={n}>{n} demão{n > 1 ? "s" : ""}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {area > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                    <p className="text-gray-500 text-xs">Área total</p>
                    <p className="text-2xl font-bold text-gray-900">{area.toFixed(1)} m²</p>
                  </div>
                )}
                <button
                  onClick={() => goTo("result")}
                  disabled={!width || !height}
                  className="w-full text-white font-bold text-lg py-4 rounded-xl hover:scale-[1.02] transition disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: NEUCE_RED }}
                >
                  Calcular <ArrowRight className="inline h-5 w-5 ml-1" />
                </button>
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={() => goTo("finish")} className="text-gray-500 hover:text-gray-900 text-sm flex items-center gap-1 font-semibold">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </button>
              </div>
            </div>
          )}

          {step === "result" && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm text-center">
                <div className="text-5xl mb-3">📐</div>
                <h2 className="text-2xl font-black text-gray-900 mb-1">Resultado</h2>
                <p className="text-gray-500 text-sm mb-4">{surfaceLabel} · {finishLabel}</p>
                <div className="text-6xl font-black text-gray-900 mb-2">
                  {totalLiters < 1 ? "< 1" : Math.ceil(totalLiters)}
                  <span className="text-2xl font-bold ml-1">L</span>
                </div>
                <p className="text-gray-400 text-xs">{area.toFixed(1)} m² · {coats} demão{Number(coats) > 1 ? "s" : ""}</p>
                <div className="flex justify-center gap-4 mt-6">
                  {cans5l > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4 text-center min-w-[100px] border border-gray-100">
                      <div className="text-3xl mb-1">🪣</div>
                      <div className="text-2xl font-bold text-gray-900">{cans5l}x</div>
                      <div className="text-xs text-gray-500">5L</div>
                    </div>
                  )}
                  {cans1l > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4 text-center min-w-[100px] border border-gray-100">
                      <div className="text-2xl mb-1">🥫</div>
                      <div className="text-2xl font-bold text-gray-900">{cans1l}x</div>
                      <div className="text-xs text-gray-500">1L</div>
                    </div>
                  )}
                </div>
              </div>

              {recommendedProducts.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <ShoppingCart className="h-5 w-5" style={{ color: NEUCE_RED }} />
                    <h3 className="text-lg font-bold text-gray-900">Recomendados para {surfaceLabel}</h3>
                  </div>
                  <div className="space-y-2">
                    {recommendedProducts.map((p: any) => (
                      <Link
                        key={p.id}
                        to="/kiosk/product/$id"
                        params={{ id: p.id }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition border border-gray-100"
                      >
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-14 h-14 rounded-lg object-contain bg-white border border-gray-100" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Paintbrush className="h-7 w-7 text-gray-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 text-sm truncate">{p.name}</div>
                          {p.price != null && (
                            <div className="text-gray-500 text-xs mt-0.5">
                              {p.price.toFixed(2).replace(".", ",")}€
                              {p.promotion_active && p.promotion_price != null && (
                                <span className="ml-2 font-semibold" style={{ color: NEUCE_RED }}>
                                  Promo: {p.promotion_price.toFixed(2).replace(".", ",")}€
                                </span>
                              )}
                            </div>
                          )}
                          <div className="text-[10px] text-gray-400 mt-0.5 truncate">{p.category}</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="h-5 w-5" style={{ color: NEUCE_RED }} />
                  <h3 className="text-lg font-bold text-gray-900">Explorar Cores</h3>
                </div>
                <div className="flex items-center gap-2 mb-4 bg-gray-50 rounded-xl px-4 py-2 border border-gray-200">
                  <Hash className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={customHex}
                    onChange={handleCustomHex}
                    placeholder="Código de cor ex: ff5733"
                    maxLength={7}
                    className="flex-1 bg-transparent text-gray-900 outline-none text-sm font-mono placeholder-gray-400"
                  />
                  {customHex && /^#[0-9a-fA-F]{6}$/.test(customHex) && (
                    <div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: customHex }} />
                  )}
                </div>
                <p className="text-gray-500 text-xs mb-3">Escolhe uma cor:</p>
                <div className="flex flex-wrap gap-2">
                  {SWATCHES.map((s) => {
                    const isFav = favorites.includes(s.hex);
                    const selected = selectedColor === s.hex;
                    return (
                      <div key={s.hex} className="relative group">
                        <button
                          onClick={() => handleColorSelect(s.hex)}
                          className="w-10 h-10 rounded-full border-2 transition-all duration-200 hover:scale-125"
                          style={{
                            backgroundColor: s.hex,
                            borderColor: selected ? NEUCE_RED : "#e5e7eb",
                            boxShadow: selected ? `0 0 0 2px white, 0 0 0 4px ${NEUCE_RED}` : undefined,
                          }}
                          title={s.name}
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(s.hex); }}
                          className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Heart className={`h-3 w-3 ${isFav ? "fill-red-400 text-red-400" : "text-gray-400"}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                {favorites.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1 mb-2">
                      <Heart className="h-3 w-3 text-red-400 fill-red-400" />
                      <span className="text-gray-500 text-xs">Favoritas</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {favorites.map((hex) => {
                        const swatch = SWATCHES.find((s) => s.hex === hex);
                        return (
                          <button
                            key={hex}
                            onClick={() => handleColorSelect(hex)}
                            className="w-8 h-8 rounded-full border-2 transition-all hover:scale-125"
                            style={{
                              backgroundColor: hex,
                              borderColor: selectedColor === hex ? NEUCE_RED : "#e5e7eb",
                            }}
                            title={swatch?.name || hex}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <div className="font-bold text-gray-900">{SWATCHES.find((s) => s.hex === selectedColor)?.name || "Personalizada"}</div>
                    <div className="text-gray-500 text-xs">{selectedColor}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl border-2 border-gray-200 shadow-sm" style={{ backgroundColor: selectedColor }} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="flex-1 font-bold py-4 rounded-xl border-2 transition flex items-center justify-center gap-2 text-gray-700 border-gray-200 hover:bg-gray-50"
                >
                  <RotateCcw className="h-5 w-5" />
                  Recomeçar
                </button>
                <Link
                  to="/kiosk/search"
                  className="flex-1 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
                  style={{ backgroundColor: NEUCE_RED }}
                >
                  <Search className="h-5 w-5" />
                  Ver Catálogo
                </Link>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
