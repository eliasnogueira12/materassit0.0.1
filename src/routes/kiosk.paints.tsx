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
  Info,
  Search,
  BookOpen,
  Lightbulb,
  Thermometer,
  Shield,
  Sun,
  Droplet,
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

const SURFACE_GUIDES: Record<string, { tip: string; preparation: string; why: string }> = {
  interior: {
    tip: "Ambientes interiores precisam de tintas com baixo odor e boa lavabilidade. Prefira mate para quartos e acetinado para cozinhas e corredores.",
    preparation: "Limpar a superfície, lixar imperfeições, aplicar primário se necessário. Proteger móveis e chão.",
    why: "As tintas para interior são formuladas para serem laváveis, não amarelarem com o tempo e terem baixo cheiro.",
  },
  exterior: {
    tip: "Fachadas sofrem com sol, chuva e variação de temperatura. Use tintas elastométricas ou acrílicas com proteção UV e resistência à humidade.",
    preparation: "Limpar com água e escova, remover bolor e ferrugem, aplicar primário selante. Pintar em dias secos (15-30°C).",
    why: "Tintas exteriores têm resinas especiais que formam uma película flexível, resistente a fissuras e à radiação UV.",
  },
  madeira: {
    tip: "A madeira precisa de proteção contra humidade, insetos e raios UV. Use vernizes, esmaltes ou stain para madeira.",
    preparation: "Lixar bem, remover pó, aplicar primário para madeira. Para exteriores, use produtos com proteção UV e fungicida.",
    why: "A madeira dilata e contrai com a humidade — as tintas para madeira têm elasticidade para acompanhar esse movimento sem fissurar.",
  },
  metal: {
    tip: "Superfícies metálicas oxidam se não protegidas. Use tinta anticorrosiva ou esmalte sintético com primário antioxidante.",
    preparation: "Remover ferrugem com escova de arame, lixar, desengordurar, aplicar primário anticorrosivo antes da tinta.",
    why: "O primário anticorrosivo cria uma barreira que impede a oxidação do metal. O acabamento brilhante é mais duro e resistente.",
  },
  teto: {
    tip: "Tetos exigem tinta antigotejamento e sem reflexos. Use tinta mate específica para tetos, que disfarça imperfeições.",
    preparation: "Proteger chão e móveis. Aplicar primário selante se houver manchas de humidade. Usar rolo de pelo alto.",
    why: "Tinta mate não reflete luz, disfarçando irregularidades. A fórmula antigotejamento evita pingos durante a aplicação.",
  },
};

const FINISH_GUIDES: Record<string, { desc: string; bestFor: string; avoid: string; maintenance: string }> = {
  mate: {
    desc: "Acabamento sem brilho que disfarça imperfeições da parede. Toque aveludado e elegante.",
    bestFor: "Quartos, salas de estar, tetos — locais com pouco tráfego e onde se quer um ambiente aconchegante.",
    avoid: "Cozinhas, casas de banho, corredores — áreas com muita humidade ou que precisam de lavagens frequentes.",
    maintenance: "Menos resistente a limpezas. Limpar com pano seco ou levemente húmido, sem esfregar.",
  },
  acetinado: {
    desc: "Brilho suave e sedoso. Fácil de limpar, ideal para áreas de uso moderado.",
    bestFor: "Cozinhas, casas de banho, corredores, quartos de criança — áreas que precisam de limpezas regulares.",
    avoid: "Tetos com imperfeições (o brilho suave pode realçar irregularidades) e exteriores muito expostos.",
    maintenance: "Resiste bem a limpezas com pano húmido e detergente suave. Ótimo custo-benefício.",
  },
  brilhante: {
    desc: "Alto brilho e reflexo. Acabamento duro, resistente e muito fácil de limpar.",
    bestFor: "Portas, rodapés, guarnições, móveis, exteriores — superfícies que precisam de alta resistência.",
    avoid: "Paredes interiores grandes (o brilho excessivo cansa a vista e realça imperfeições) e tetos.",
    maintenance: "Excelente resistência. Lava-se facilmente com água e sabão. Ideal para áreas de alto tráfego.",
  },
};

const PAINT_TIPS = [
  {
    icon: <Thermometer className="h-5 w-5" />,
    title: "Temperatura ideal",
    text: "Pinte entre 15°C e 30°C. Evite pintar em dias de chuva ou muito vento (exterior) ou com humidade >80%.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Primário primeiro",
    text: "Aplicar primário antes da tinta melhora a aderência, cobre manchas e reduz o número de demãos necessárias.",
  },
  {
    icon: <Sun className="h-5 w-5" />,
    title: "Secagem entre demãos",
    text: "Espere 4-6h entre demãos para tintas aquosas, 8-12h para esmaltes sintéticos. Respeitar os tempos evita bolhas.",
  },
  {
    icon: <Droplet className="h-5 w-5" />,
    title: "Diluição correta",
    text: "Não dilua em excesso. A maioria das tintas aquosas leva 10-15% de água. Esmaltes sintéticos usam diluente próprio.",
  },
];

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

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreProduct(queryWords: string[], p: any): number {
  const name = normalize(p.name || "");
  const desc = normalize(p.description || "");
  const cat = normalize(p.category || "");
  const kw = normalize(p.keywords || "");

  let score = 0;
  const textFields = [
    { text: name, weight: 3 },
    { text: kw, weight: 2.5 },
    { text: cat, weight: 2 },
    { text: desc, weight: 1.5 },
  ];

  for (const q of queryWords) {
    for (const { text, weight } of textFields) {
      if (text.includes(q)) {
        score += weight;
        continue;
      }
      const words = text.split(/\s+/);
      if (words.some((w: string) => w.startsWith(q) || q.startsWith(w))) {
        score += weight * 0.5;
      }
    }
  }

  const bigrams = queryWords.slice(0, -1).map((_, i) => queryWords[i] + " " + queryWords[i + 1]);
  for (const bg of bigrams) {
    if (name.includes(bg)) score += 5;
    if (desc.includes(bg)) score += 3;
    if (cat.includes(bg)) score += 2;
  }

  if (p.featured) score *= 1.15;

  return score;
}

function searchPaintsByDescription(query: string, products: any[]) {
  if (!query.trim()) return [];
  const q = normalize(query);
  const queryWords = q.split(/\s+/).filter((w) => w.length > 1);
  if (queryWords.length === 0) return [];

  const scored = products
    .map((p) => ({ product: p, score: scoreProduct(queryWords, p) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 8);
}

type Step = "welcome" | "describe" | "surface" | "finish" | "calculate" | "result";

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
  const [describeQuery, setDescribeQuery] = useState("");
  const [showGuide, setShowGuide] = useState(false);

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

  const [debouncedDescribe, setDebouncedDescribe] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedDescribe(describeQuery), 300);
    return () => clearTimeout(t);
  }, [describeQuery]);

  const describedResults = useMemo(() => {
    if (!debouncedDescribe.trim() || paintProducts.length === 0) return [];
    return searchPaintsByDescription(debouncedDescribe, paintProducts);
  }, [debouncedDescribe, paintProducts]);

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
    setDescribeQuery("");
    setShowGuide(false);
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
            {(["describe", "surface", "finish", "calculate", "result"] as Step[]).map((s, i) => {
              const order: Step[] = ["describe", "surface", "finish", "calculate", "result"];
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
                  {i < 4 && <div className={`w-8 h-0.5 ${i < idx ? "" : "bg-gray-200"}`} style={{ backgroundColor: i < idx ? NEUCE_RED : undefined }} />}
                </div>
              );
            })}
          </div>
        )}

        <div key={animKey} className="animate-fade-in">
          {step === "welcome" && (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg" style={{ backgroundColor: NEUCE_RED }}>
                <Paintbrush className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-4xl font-black text-gray-900 mb-3">
                Encontre a Tinta Perfeita
              </h1>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Descubra a tinta ideal para o seu projeto, calcule a quantidade certa e explore cores.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-lg mx-auto">
                <button
                  onClick={() => goTo("describe")}
                  className="group bg-gray-50 rounded-2xl p-6 text-center border-2 border-gray-100 hover:border-rose-200 hover:shadow-lg transition-all hover:-translate-y-1"
                >
                  <div className="text-4xl mb-3">🔍</div>
                  <div className="font-bold text-lg text-gray-900">Descreva o seu projeto</div>
                  <div className="text-sm text-gray-500 mt-1">Diga o que precisa e nós recomendamos</div>
                </button>
                <button
                  onClick={() => goTo("surface")}
                  className="group bg-gray-50 rounded-2xl p-6 text-center border-2 border-gray-100 hover:border-rose-200 hover:shadow-lg transition-all hover:-translate-y-1"
                >
                  <div className="text-4xl mb-3">🎯</div>
                  <div className="font-bold text-lg text-gray-900">Guia rápido</div>
                  <div className="text-sm text-gray-500 mt-1">Escolha superfície e acabamento</div>
                </button>
                <button
                  onClick={() => { setSurface("interior"); setShowGuide(true); goTo("surface"); }}
                  className="group bg-gray-50 rounded-2xl p-6 text-center border-2 border-gray-100 hover:border-rose-200 hover:shadow-lg transition-all hover:-translate-y-1"
                >
                  <div className="text-4xl mb-3">📖</div>
                  <div className="font-bold text-lg text-gray-900">Guias de pintura</div>
                  <div className="text-sm text-gray-500 mt-1">Dicas, preparação e truques</div>
                </button>
                <button
                  onClick={() => { setSurface("interior"); goTo("calculate"); }}
                  className="group bg-gray-50 rounded-2xl p-6 text-center border-2 border-gray-100 hover:border-rose-200 hover:shadow-lg transition-all hover:-translate-y-1"
                >
                  <div className="text-4xl mb-3">📐</div>
                  <div className="font-bold text-lg text-gray-900">Calculadora</div>
                  <div className="text-sm text-gray-500 mt-1">Quantos litros precisa</div>
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {["Interior", "Exterior", "Madeira", "Metal", "Teto"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      const id = tag.toLowerCase();
                      setSurface(id);
                      setFinish("");
                      goTo("finish");
                    }}
                    className="px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-rose-100 hover:text-rose-700 transition border border-gray-200"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "describe" && (
            <div>
              <h2 className="text-2xl font-black text-gray-900 text-center mb-2">Descreva o seu projeto</h2>
              <p className="text-center text-gray-500 mb-6 max-w-sm mx-auto">
                Conte-nos o que quer pintar e nós encontramos os produtos ideais para si.
              </p>
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-4">
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 mb-4">
                  <Search className="h-5 w-5 text-gray-400 shrink-0" />
                  <input
                    autoFocus
                    value={describeQuery}
                    onChange={(e) => setDescribeQuery(e.target.value)}
                    placeholder="Ex: tinta branca para cozinha, verniz para madeira exterior, pintar portão de ferro..."
                    className="flex-1 bg-transparent text-gray-900 outline-none text-base placeholder-gray-400"
                  />
                  {describeQuery && (
                    <button onClick={() => setDescribeQuery("")} className="text-gray-400 hover:text-gray-600">
                      ✕
                    </button>
                  )}
                </div>
                {describeQuery && !debouncedDescribe && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <span className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
                    A pesquisar...
                  </div>
                )}
                {describedResults.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-3 font-semibold">
                      {describedResults.length} produto{describedResults.length > 1 ? "s" : ""} encontrado{describedResults.length > 1 ? "s" : ""}:
                    </p>
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                      {describedResults.map(({ product: p, score }) => (
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
                            <div className="font-bold text-gray-900 text-sm">{p.name}</div>
                            {p.description && (
                              <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {p.price != null && (
                                <span className="text-xs font-semibold text-gray-700">
                                  {p.price.toFixed(2).replace(".", ",")}€
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400">{p.category}</span>
                              <span className="text-[10px] text-gray-400 ml-auto">
                                relevância {Math.round(score)}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {debouncedDescribe && describedResults.length === 0 && (
                  <div className="text-center py-8">
                    <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Nenhum produto encontrado.</p>
                    <p className="text-gray-400 text-sm mt-1">Tente descrever com outras palavras ou use o guia rápido.</p>
                  </div>
                )}
              </div>
              <div className="flex justify-between">
                <button onClick={() => goTo("welcome")} className="text-gray-500 hover:text-gray-900 text-sm flex items-center gap-1 font-semibold">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </button>
                <button
                  onClick={() => goTo("surface")}
                  className="text-sm font-semibold flex items-center gap-1 hover:opacity-80"
                  style={{ color: NEUCE_RED }}
                >
                  Ou use o guia rápido <ArrowRight className="h-4 w-4" />
                </button>
              </div>
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

              {surface && SURFACE_GUIDES[surface] && (
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => setShowGuide(!showGuide)}
                    className="w-full flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 hover:bg-gray-100 transition"
                  >
                    <BookOpen className="h-4 w-4" />
                    {showGuide ? "Ocultar" : "Ver"} guia para {surfaceLabel}
                    <span className="ml-auto">{showGuide ? "▲" : "▼"}</span>
                  </button>
                  {showGuide && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3 animate-fade-in">
                      <div className="flex gap-3">
                        <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-800 text-sm">Dica</span>
                          <p className="text-amber-700 text-sm mt-0.5">{SURFACE_GUIDES[surface].tip}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-800 text-sm">Preparação</span>
                          <p className="text-amber-700 text-sm mt-0.5">{SURFACE_GUIDES[surface].preparation}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Shield className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-800 text-sm">Porquê?</span>
                          <p className="text-amber-700 text-sm mt-0.5">{SURFACE_GUIDES[surface].why}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button onClick={() => goTo("describe")} className="text-gray-500 hover:text-gray-900 text-sm flex items-center gap-1 font-semibold">
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

              {finish && FINISH_GUIDES[finish] && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowGuide(!showGuide)}
                    className="w-full flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 hover:bg-gray-100 transition"
                  >
                    <BookOpen className="h-4 w-4" />
                    {showGuide ? "Ocultar" : "Ver"} guia detalhado — {finishLabel}
                    <span className="ml-auto">{showGuide ? "▲" : "▼"}</span>
                  </button>
                  {showGuide && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3 animate-fade-in">
                      <div className="flex gap-3">
                        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-blue-800 text-sm">Descrição</span>
                          <p className="text-blue-700 text-sm mt-0.5">{FINISH_GUIDES[finish].desc}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Lightbulb className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-blue-800 text-sm">Melhor para</span>
                          <p className="text-blue-700 text-sm mt-0.5">{FINISH_GUIDES[finish].bestFor}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-blue-800 text-sm">Evitar em</span>
                          <p className="text-blue-700 text-sm mt-0.5">{FINISH_GUIDES[finish].avoid}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Droplet className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-blue-800 text-sm">Manutenção</span>
                          <p className="text-blue-700 text-sm mt-0.5">{FINISH_GUIDES[finish].maintenance}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

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

              {/* Usage guide summary */}
              {surface && SURFACE_GUIDES[surface] && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-5 w-5 text-emerald-600" />
                    <h3 className="font-bold text-emerald-800 text-sm">Dica para {surfaceLabel}</h3>
                  </div>
                  <p className="text-emerald-700 text-sm">{SURFACE_GUIDES[surface].tip}</p>
                </div>
              )}

              {/* Description-based search results (if used) */}
              {describedResults.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Search className="h-5 w-5" style={{ color: NEUCE_RED }} />
                    <h3 className="text-lg font-bold text-gray-900">Produtos recomendados para si</h3>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">Resultados ordenados por relevância à sua descrição</p>
                  <div className="space-y-2">
                    {describedResults.map(({ product: p, score }) => (
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
                          <div className="font-bold text-gray-900 text-sm">{p.name}</div>
                          {p.description && (
                            <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {p.price != null && (
                              <span className="text-xs font-semibold text-gray-700">
                                {p.price.toFixed(2).replace(".", ",")}€
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400">{p.category}</span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Category-based recommendations */}
              {recommendedProducts.length > 0 && describedResults.length === 0 && (
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
                          {p.description && (
                            <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.description}</div>
                          )}
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

              {/* Paint tips */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className="w-full flex items-center gap-2 text-sm font-semibold text-gray-700"
                >
                  <BookOpen className="h-4 w-4" />
                  Dicas de pintura
                  <span className="ml-auto">{showGuide ? "▲" : "▼"}</span>
                </button>
                {showGuide && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                    {PAINT_TIPS.map((tip, i) => (
                      <div key={i} className="flex gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="text-blue-600 shrink-0 mt-0.5">{tip.icon}</div>
                        <div>
                          <span className="font-bold text-gray-800 text-sm">{tip.title}</span>
                          <p className="text-gray-500 text-xs mt-0.5">{tip.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
    </div>
  );
}
