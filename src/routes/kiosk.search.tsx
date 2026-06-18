import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, Paintbrush, Zap, Hammer, Droplet, ChevronRight, Search,
  ArrowUpDown, X,
} from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import type { RecommendedProduct } from "@/lib/assistant.functions";

export const Route = createFileRoute("/kiosk/search")({
  component: SearchPage,
});

/* ─── helpers ─── */

function parseCategory(rawCat: string | null) {
  if (!rawCat) return { parent: "Geral", sub: "Outros" };
  if (rawCat.includes(" - ")) {
    const parts = rawCat.split(" - ");
    return { parent: parts[0].trim(), sub: parts[1].trim() };
  }
  if (rawCat.includes(",")) {
    const parts = rawCat.split(",").map(p => p.trim());
    const parent = parts.find(c => ["pintura", "pinturas", "materiais elétricos", "elétrico", "elétrica", "ferragens", "canalização"].includes(c.toLowerCase())) || parts[0];
    const sub = parts.find(c => c !== parent) || "Geral";
    return { parent: normCat(parent), sub };
  }
  return { parent: normCat(rawCat.trim()), sub: "Geral" };
}

function normCat(s: string) {
  const l = s.toLowerCase();
  if (l.startsWith("pintur")) return "Pintura";
  if (l.includes("elétr") || l.includes("eletri")) return "Materiais Elétricos";
  if (l.startsWith("ferrag")) return "Ferragens";
  if (l.startsWith("canaliza")) return "Canalização";
  return s;
}

function catColor(parent: string): string {
  const l = parent.toLowerCase();
  if (l.includes("pintur")) return "emerald";
  if (l.includes("elétr") || l.includes("eletri")) return "amber";
  if (l.includes("ferrag")) return "sky";
  if (l.includes("canaliza")) return "blue";
  return "slate";
}

function catGradient(parent: string): string {
  const m: Record<string, string> = {
    emerald: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    amber: "from-amber-500/20 via-amber-500/5 to-transparent",
    sky: "from-sky-500/20 via-sky-500/5 to-transparent",
    blue: "from-blue-500/20 via-blue-500/5 to-transparent",
    slate: "from-slate-500/20 via-slate-500/5 to-transparent",
  };
  return m[catColor(parent)] ?? m.slate;
}

function catIcon(parent: string, cls = "h-10 w-10") {
  const c = catColor(parent);
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-500", amber: "text-amber-500",
    sky: "text-sky-500", blue: "text-blue-500", slate: "text-muted-foreground",
  };
  const iconMap: Record<string, React.ReactNode> = {
    emerald: <Paintbrush className={`${cls} ${colorMap[c]}`} />,
    amber: <Zap className={`${cls} ${colorMap[c]}`} />,
    sky: <Hammer className={`${cls} ${colorMap[c]}`} />,
    blue: <Droplet className={`${cls} ${colorMap[c]}`} />,
  };
  return iconMap[c] ?? <Package className={`${cls} ${colorMap[c]}`} />;
}

function toRec(p: any): RecommendedProduct {
  return {
    id: p.id, name: p.name, category: p.category,
    location: [p.section, p.aisle, p.shelf].filter(Boolean).join(" · "),
    price: p.price != null ? Number(p.price) : null,
    promotion: p.promotion_active && p.promotion_price != null ? Number(p.promotion_price) : null,
    stock: p.stock_visible ? p.stock : null,
    image_url: p.image_url, description: p.description,
  };
}

const ALL_CATEGORIES = ["Pintura", "Materiais Elétricos", "Ferragens", "Canalização"];

/* ─── debounce hook ─── */

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/* ─── component ─── */

function SearchPage() {
  const [rawQ, setRawQ] = useState("");
  const q = useDebounce(rawQ, 250);
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "price">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", "kiosk-search", q],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("name");
      if (q.trim()) {
        const term = `%${q.trim()}%`;
        query = query.or(
          `name.ilike.${term},description.ilike.${term},keywords.ilike.${term},category.ilike.${term},section.ilike.${term}`,
        );
      }
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });

  const parsedProducts = useMemo(() => products.map(p => ({ ...p, parsedCat: parseCategory(p.category) })), [products]);

  const structure = useMemo(() => {
    const parentMap: Record<string, Set<string>> = {};
    parsedProducts.forEach(p => {
      const { parent, sub } = p.parsedCat;
      if (!parentMap[parent]) parentMap[parent] = new Set();
      parentMap[parent].add(sub);
    });
    return { parents: Object.keys(parentMap).sort(), parentMap };
  }, [parsedProducts]);

  const sortedProducts = useMemo(() => {
    const list = [...parsedProducts];
    list.sort((a, b) => {
      let cmp = a.name.localeCompare(b.name);
      if (sortBy === "price") {
        const pa = a.price ?? 0;
        const pb = b.price ?? 0;
        cmp = pa - pb;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [parsedProducts, sortBy, sortDir]);

  const chips = useMemo(() => {
    const cats = new Set<string>();
    parsedProducts.forEach(p => { if (p.parsedCat.parent) cats.add(p.parsedCat.parent); });
    return ALL_CATEGORIES.filter(c => cats.has(c));
  }, [parsedProducts]);

  const chipFiltered = useMemo(() => {
    if (!activeChip) return sortedProducts;
    return sortedProducts.filter(p => p.parsedCat.parent === activeChip);
  }, [sortedProducts, activeChip]);

  useEffect(() => { setActiveChip(null); }, [q]);

  /* ── render ── */

  return (
    <div className="min-h-[calc(100vh-7rem)] flex flex-col">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-primary/5 via-primary/[0.02] to-background border-b border-border/40">
        <div className="px-6 pt-10 pb-8 max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-primary">
            Catálogo
          </h1>
          <p className="text-lg text-muted-foreground mt-1 max-w-xl">
            Navegue por categorias ou pesquise o produto que precisa.
          </p>

          <div className="relative mt-6">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
            <input
              ref={inputRef}
              autoFocus
              value={rawQ}
              onChange={(e) => {
                setRawQ(e.target.value);
                if (e.target.value.trim()) {
                  setSelectedParent(null);
                  setSelectedSub(null);
                }
              }}
              placeholder="Pesquisar: tinta, rolo, lâmpada, torneira…"
              className="w-full h-16 pl-14 pr-14 text-xl rounded-2xl border-2 border-border bg-background/80 backdrop-blur-sm shadow-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
            />
            {rawQ && (
              <button
                onClick={() => { setRawQ(""); inputRef.current?.focus(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Quick chips */}
          {!rawQ.trim() && chips.length > 0 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setActiveChip(null)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                  !activeChip
                    ? "bg-accent text-accent-foreground border-accent shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:border-accent/50"
                }`}
              >
                Todas
              </button>
              {chips.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveChip(activeChip === cat ? null : cat)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all inline-flex items-center gap-2 ${
                    activeChip === cat
                      ? "bg-accent text-accent-foreground border-accent shadow-sm"
                      : "bg-card text-muted-foreground border-border hover:border-accent/50"
                  }`}
                >
                  {catIcon(cat, "h-4 w-4")}
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 px-6 py-6 max-w-6xl mx-auto w-full">
        {isLoading ? (
          <ProductSkeleton count={10} />
        ) : rawQ.trim() || activeChip ? (
          <SearchResults
            products={chipFiltered}
            query={rawQ.trim()}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={(b, d) => { setSortBy(b); setSortDir(d); }}
            onClearFilter={() => { setRawQ(""); setActiveChip(null); inputRef.current?.focus(); }}
          />
        ) : selectedParent && selectedSub ? (
          <SubcategoryProducts
            parent={selectedParent}
            sub={selectedSub}
            products={parsedProducts}
            onBack={() => setSelectedSub(null)}
            toRec={toRec}
          />
        ) : selectedParent ? (
          <Subcategories
            parent={selectedParent}
            products={parsedProducts}
            subs={Array.from(structure.parentMap[selectedParent] || []).sort()}
            onBack={() => { setSelectedParent(null); setSelectedSub(null); }}
            onSelect={setSelectedSub}
          />
        ) : (
          <CategoryGrid
            parents={structure.parents}
            products={parsedProducts}
            onSelect={setSelectedParent}
            icon={catIcon}
            gradient={catGradient}
          />
        )}
      </div>
    </div>
  );
}

/* ─── sub-components ─── */

function CategoryGrid({ parents, products, onSelect, icon, gradient }: {
  parents: string[];
  products: any[];
  onSelect: (p: string) => void;
  icon: (p: string) => React.ReactNode;
  gradient: (p: string) => string;
}) {
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-primary mb-6">Categorias</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {parents.map(pName => {
          const count = products.filter(p => p.parsedCat.parent === pName).length;
          return (
            <button
              key={pName}
              onClick={() => onSelect(pName)}
              className="group relative bg-card border border-border/70 rounded-3xl p-7 flex flex-col items-center text-center hover:scale-[1.03] hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient(pName)} opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative h-20 w-20 rounded-2xl bg-muted/70 group-hover:bg-background/80 flex items-center justify-center mb-4 transition-all duration-300 shadow-sm group-hover:shadow-md">
                {icon(pName)}
              </div>
              <span className="relative font-extrabold text-xl text-primary">{pName}</span>
              <span className="relative mt-2 text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground font-medium">
                {count} {count === 1 ? "produto" : "produtos"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Subcategories({ parent, products, subs, onBack, onSelect }: {
  parent: string;
  products: any[];
  subs: string[];
  onBack: () => void;
  onSelect: (s: string) => void;
}) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2.5 rounded-xl border hover:bg-muted transition text-muted-foreground shrink-0 cursor-pointer">
          <ChevronRight className="h-5 w-5 rotate-180" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-primary">{parent}</h2>
          <p className="text-sm text-muted-foreground">Escolha uma subcategoria.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {subs.map(sub => {
          const count = products.filter(p => p.parsedCat.parent === parent && p.parsedCat.sub === sub).length;
          return (
            <button
              key={sub}
              onClick={() => onSelect(sub)}
              className="group bg-card border border-border/60 hover:border-accent rounded-2xl p-6 flex flex-col items-start hover:scale-[1.02] hover:shadow-md transition-all duration-200 text-left cursor-pointer"
            >
              <span className="font-bold text-lg text-primary group-hover:text-accent transition-colors">{sub}</span>
              <span className="text-xs text-muted-foreground mt-2 bg-muted px-2.5 py-0.5 rounded-full font-medium">
                {count} {count === 1 ? "produto" : "produtos"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SubcategoryProducts({ parent, sub, products, onBack, toRec }: {
  parent: string;
  sub: string;
  products: any[];
  onBack: () => void;
  toRec: (p: any) => RecommendedProduct;
}) {
  const subProducts = products.filter(p => p.parsedCat.parent === parent && p.parsedCat.sub === sub);
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2.5 rounded-xl border hover:bg-muted transition text-muted-foreground shrink-0 cursor-pointer">
          <ChevronRight className="h-5 w-5 rotate-180" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-primary">{sub}</h2>
          <p className="text-sm text-muted-foreground">{parent} &rsaquo; {sub}</p>
        </div>
      </div>
      {subProducts.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center text-muted-foreground">Sem produtos disponíveis.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {subProducts.map(p => <ProductCard key={p.id} product={toRec(p)} showAddToCart />)}
        </div>
      )}
    </div>
  );
}

function SearchResults({ products, query, sortBy, sortDir, onSortChange, onClearFilter }: {
  products: any[];
  query: string;
  sortBy: "name" | "price";
  sortDir: "asc" | "desc";
  onSortChange: (b: "name" | "price", d: "asc" | "desc") => void;
  onClearFilter: () => void;
}) {
  function toggleSort() {
    if (sortBy === "name") onSortChange("price", "asc");
    else if (sortBy === "price" && sortDir === "asc") onSortChange("price", "desc");
    else onSortChange("name", "asc");
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-xl font-bold text-primary">
          {products.length === 0
            ? "Sem resultados"
            : `${products.length} ${products.length === 1 ? "resultado" : "resultados"}`}
          {query && (
            <span className="text-muted-foreground font-normal">
              {" para "}<span className="font-semibold text-accent-foreground bg-accent/15 px-2 py-0.5 rounded">"{query}"</span>
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSort}
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted transition inline-flex items-center gap-1.5"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortBy === "name" ? "Nome" : `Preço ${sortDir === "asc" ? "↑" : "↓"}`}
          </button>
          <button
            onClick={onClearFilter}
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted transition inline-flex items-center gap-1.5"
          >
            <X className="h-3.5 w-3.5" /> Limpar
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="bg-card border-2 border-dashed rounded-3xl p-16 text-center shadow-sm">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-xl font-medium text-foreground">Nada encontrado.</p>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Tente outros termos ou navegue pelas categorias acima.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map(p => (
            <ProductCard key={p.id} product={toRec(p)} showAddToCart />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-fade-in">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-card border overflow-hidden">
          <div className="aspect-square bg-muted animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
            <div className="h-5 bg-muted rounded animate-pulse w-1/3" />
            <div className="h-9 bg-muted rounded-xl animate-pulse mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
