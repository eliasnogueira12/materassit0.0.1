import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/useCart";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { toast } from "sonner";
import {
  Search,
  Scan,
  X,
  ChevronLeft,
  ShoppingCart,
  Droplets,
  Ruler,
  Paintbrush,
  ChevronRight,
  Check,
  Plus,
  Minus,
  Palette,
} from "lucide-react";

export const Route = createFileRoute("/kiosk/paints")({
  component: PaintsPage,
});

const SURFACE_TYPES = [
  { id: "interior", label: "Parede Interior", icon: "🏠", coverage: 12 },
  { id: "exterior", label: "Parede Exterior", icon: "🏛️", coverage: 8 },
  { id: "wood", label: "Madeira", icon: "🪵", coverage: 10 },
  { id: "metal", label: "Metal", icon: "⚙️", coverage: 10 },
  { id: "ceiling", label: "Teto", icon: "⬆️", coverage: 12 },
] as const;

const FINISH_TYPES = [
  { id: "mate", label: "Mate", desc: "Sem brilho, aspeto natural" },
  { id: "acetinado", label: "Acetinado", desc: "Brilho suave, fácil limpeza" },
  { id: "semi-brilho", label: "Semi-Brilho", desc: "Médio brilho, resistente" },
  { id: "brilho", label: "Brilho", desc: "Alto brilho, muito resistente" },
] as const;

const SWATCHES = [
  { name: "Branco Neve", hex: "#FFFFFF" },
  { name: "Branco Natural", hex: "#F5F0E8" },
  { name: "Areia", hex: "#E8D5B7" },
  { name: "Bege Claro", hex: "#D4C5A9" },
  { name: "Cinza Claro", hex: "#D0D0D0" },
  { name: "Cinza Médio", hex: "#A0A0A0" },
  { name: "Cinza Escuro", hex: "#505050" },
  { name: "Preto", hex: "#1A1A1A" },
  { name: "Azul Claro", hex: "#A8C8E8" },
  { name: "Azul Médio", hex: "#5B8DB8" },
  { name: "Azul Escuro", hex: "#1B3A5C" },
  { name: "Azul Marinho", hex: "#0D1B2A" },
  { name: "Verde Menta", hex: "#B8D4C8" },
  { name: "Verde Oliva", hex: "#7B8D6E" },
  { name: "Verde Escuro", hex: "#2D4A3E" },
  { name: "Terracota", hex: "#C86A4A" },
  { name: "Vermelho Tijolo", hex: "#8B3A3A" },
  { name: "Rosa Claro", hex: "#F0C8C8" },
  { name: "Rosa Quente", hex: "#E89898" },
  { name: "Amarelo Sol", hex: "#F0D878" },
  { name: "Laranja", hex: "#E89840" },
  { name: "Marrom", hex: "#6B4423" },
  { name: "Lavanda", hex: "#C8B8E8" },
  { name: "Burgundy", hex: "#6B2030" },
] as const;

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
}

type PaintTab = "colors" | "calculator" | "products" | "scan";

function PaintsPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const [tab, setTab] = useState<PaintTab>("products");
  const [searchQ, setSearchQ] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  const [surface, setSurface] = useState<string | null>(null);
  const [finish, setFinish] = useState<string | null>(null);
  const [area, setArea] = useState<number>(20);
  const [coats, setCoats] = useState(2);
  const [selectedSwatch, setSelectedSwatch] = useState<string | null>(null);
  const [customHex, setCustomHex] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["products", "paints", searchQ, activeCategory],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .contains("category", "Pintura")
        .order("name");
      if (searchQ.trim()) {
        const term = `%${searchQ.trim()}%`;
        query = query.or(
          `name.ilike.${term},description.ilike.${term},keywords.ilike.${term},category.ilike.${term}`,
        );
      }
      if (activeCategory) {
        query = query.ilike("category", `%${activeCategory}%`);
      }
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p: any) => {
      const cat = p.category?.replace("Pintura - ", "") || "Pintura";
      set.add(cat);
    });
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products as any[];
  }, [products]);

  const coverage = SURFACE_TYPES.find((s) => s.id === surface);
  const neededLiters = coverage
    ? Math.ceil((area / coverage.coverage) * coats)
    : null;
  const calculatedCans = neededLiters
    ? { "1L": Math.ceil(neededLiters / 1), "5L": Math.ceil(neededLiters / 5), "15L": Math.ceil(neededLiters / 15) }
    : null;

  return (
    <div className="min-h-[calc(100vh-7rem)] bg-gradient-to-b from-white to-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-16 gap-3">
            <button
              onClick={() => navigate({ to: "/kiosk/start" })}
              className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition text-gray-600"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-700 flex items-center justify-center">
                <Paintbrush className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">Casa das Tintas</h1>
                <p className="text-xs text-gray-500 leading-tight">NEUCE · Tintas e Revestimentos</p>
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBarcodeScanner(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-xl hover:bg-red-800 transition text-sm font-semibold shadow-sm"
              >
                <Scan className="h-4 w-4" />
                <span className="hidden sm:inline">Scanear</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
          {([
            { id: "products", label: "Produtos", icon: Search },
            { id: "colors", label: "Cores", icon: Palette },
            { id: "calculator", label: "Calculadora", icon: Ruler },
          ] as { id: PaintTab; label: string; icon: any }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border transition-all ${
                tab === t.id
                  ? "bg-red-700 text-white border-red-700 shadow-md"
                  : "bg-white text-gray-700 border-gray-200 hover:border-red-300 hover:text-red-700"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "products" && (
          <div>
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Pesquisar tintas, primários, vernizes..."
                className="w-full h-12 pl-12 pr-10 text-base rounded-2xl border-2 border-gray-200 bg-white shadow-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
              />
              {searchQ && (
                <button
                  onClick={() => setSearchQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {!searchQ && categories.length > 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    !activeCategory
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  Todas
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                      activeCategory === cat
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {filteredProducts.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-16 text-center">
                <Droplets className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl font-semibold text-gray-900 mb-2">
                  {searchQ ? "Nenhum produto encontrado" : "Nenhum produto disponível"}
                </p>
                <p className="text-gray-500 max-w-md mx-auto">
                  {searchQ
                    ? "Tente outros termos de pesquisa."
                    : "Importe os produtos NEUCE nas definições da loja."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredProducts.map((p: any) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onAddToCart={() => {
                      cart.addProduct(p.id, p.name, p.price ?? 0, "Casa das Tintas");
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "colors" && (
          <div>
            <p className="text-gray-600 mb-4 text-sm">
              Escolha uma cor ou insira um código hexadecimal personalizado.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                value={customHex}
                onChange={(e) => {
                  setCustomHex(e.target.value);
                  setSelectedSwatch(null);
                }}
                placeholder="#FF0000"
                className="w-32 h-10 px-3 text-sm rounded-xl border-2 border-gray-200 bg-white focus:border-red-500 outline-none font-mono uppercase"
                maxLength={7}
              />
              {customHex.length === 7 && (
                <div
                  className="w-10 h-10 rounded-xl border-2 border-gray-200 shadow-sm"
                  style={{ backgroundColor: customHex }}
                />
              )}
              {selectedSwatch && (
                <div className="flex items-center gap-2 ml-2 text-sm text-gray-600">
                  <div
                    className="w-6 h-6 rounded-lg border border-gray-200"
                    style={{ backgroundColor: selectedSwatch }}
                  />
                  <span className="font-mono text-xs uppercase">{selectedSwatch}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {SWATCHES.map((s) => {
                const selected = selectedSwatch === s.hex;
                return (
                  <button
                    key={s.hex}
                    onClick={() => {
                      setSelectedSwatch(s.hex);
                      setCustomHex("");
                    }}
                    className={`group relative aspect-square rounded-xl border-2 transition-all ${
                      selected
                        ? "border-gray-900 shadow-lg scale-105"
                        : "border-gray-100 hover:border-gray-300 hover:shadow-md"
                    }`}
                    style={{ backgroundColor: s.hex }}
                    title={s.name}
                  >
                    <div
                      className={`absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                        getContrastColor(s.hex) === "#ffffff"
                          ? "bg-black/20"
                          : "bg-white/20"
                      }`}
                    >
                      {selected && (
                        <Check
                          className="h-5 w-5 drop-shadow-lg"
                          style={{ color: getContrastColor(s.hex) }}
                        />
                      )}
                    </div>
                    {selected && (
                      <Check
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 drop-shadow-lg"
                        style={{ color: getContrastColor(s.hex) }}
                      />
                    )}
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap drop-shadow-md px-1 py-0.5 rounded"
                      style={{
                        color: getContrastColor(s.hex),
                        backgroundColor:
                          getContrastColor(s.hex) === "#ffffff"
                            ? "rgba(0,0,0,0.4)"
                            : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {s.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === "calculator" && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de Superfície
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SURFACE_TYPES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSurface(s.id)}
                      className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium border transition-all ${
                        surface === s.id
                          ? "bg-red-700 text-white border-red-700"
                          : "bg-white text-gray-700 border-gray-200 hover:border-red-300"
                      }`}
                    >
                      <span>{s.icon}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de Acabamento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FINISH_TYPES.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFinish(f.id)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${
                        finish === f.id
                          ? "bg-red-700 text-white border-red-700"
                          : "bg-white text-gray-700 border-gray-200 hover:border-red-300"
                      }`}
                    >
                      <div className="font-semibold">{f.label}</div>
                      <div className="text-xs opacity-80">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Área (m²)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setArea(Math.max(1, area - 5))}
                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition text-gray-600"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    value={area}
                    onChange={(e) => setArea(Math.max(1, Number(e.target.value) || 1))}
                    className="flex-1 h-12 text-center text-xl font-bold rounded-xl border-2 border-gray-200 bg-white focus:border-red-500 outline-none"
                    min={1}
                  />
                  <button
                    onClick={() => setArea(Math.min(1000, area + 5))}
                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition text-gray-600"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <input
                  type="range"
                  min={1}
                  max={500}
                  value={area}
                  onChange={(e) => setArea(Number(e.target.value))}
                  className="w-full mt-3 accent-red-700"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Demãos: {coats}
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setCoats(n)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        coats === n
                          ? "bg-red-700 text-white border-red-700"
                          : "bg-white text-gray-600 border-gray-200 hover:border-red-300"
                      }`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
              </div>

              {surface && (
                <div className="bg-gradient-to-br from-red-50 to-white rounded-xl border border-red-100 p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Resultado</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Rendimento:</span>
                      <span className="font-semibold">{coverage?.coverage} m²/L</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Necessário:</span>
                      <span className="font-semibold text-red-700 text-lg">
                        {neededLiters} L
                      </span>
                    </div>
                    {calculatedCans && (
                      <div className="border-t border-red-100 pt-2 mt-2">
                        <p className="text-xs text-gray-500 mb-2">Latas recomendadas:</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">1 L</span>
                            <span className="font-semibold">{calculatedCans["1L"]} lata(s)</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">5 L</span>
                            <span className="font-semibold">{calculatedCans["5L"]} lata(s)</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">15 L</span>
                            <span className="font-semibold">{calculatedCans["15L"]} lata(s)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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
            cart.addProduct(data.id, data.name, data.price ?? 0, "Casa das Tintas");
          } else {
            toast("Produto não encontrado na base de dados.");
          }
        }}
        onClose={() => setShowBarcodeScanner(false)}
      />
    </div>
  );
}

function ProductCard({
  product,
  onAddToCart,
}: {
  product: any;
  onAddToCart: () => void;
}) {
  const [added, setAdded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
      <div className="aspect-square bg-gray-50 relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Droplets className="h-12 w-12 text-gray-200" />
          </div>
        )}
        {product.promotion_active && product.promotion_price != null && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm">
            PROMO
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <h3 className="text-xs font-bold text-gray-900 leading-tight line-clamp-2 min-h-[2em]">
          {product.name}
        </h3>
        <div className="text-[10px] text-gray-500 line-clamp-1">
          {product.internal_code && `#${product.internal_code}`}
        </div>
        <div className="flex items-center justify-between">
          <div>
            {product.promotion_active && product.promotion_price != null ? (
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-red-700">
                  €{Number(product.promotion_price).toFixed(2)}
                </span>
                <span className="text-[10px] text-gray-400 line-through">
                  €{Number(product.price).toFixed(2)}
                </span>
              </div>
            ) : product.price != null && product.price > 0 ? (
              <span className="text-sm font-bold text-gray-900">
                €{Number(product.price).toFixed(2)}
              </span>
            ) : (
              <span className="text-[10px] text-gray-400">Sob consulta</span>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            onAddToCart();
            setAdded(true);
            setTimeout(() => setAdded(false), 1500);
          }}
          className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            added
              ? "bg-emerald-600 text-white"
              : "bg-gray-900 text-white hover:bg-gray-800"
          }`}
        >
          {added ? (
            <>
              <Check className="h-3.5 w-3.5" /> Adicionado
            </>
          ) : (
            <>
              <ShoppingCart className="h-3.5 w-3.5" /> Adicionar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
