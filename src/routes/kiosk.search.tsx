import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Package, Paintbrush, Zap, Hammer, Droplet, ArrowLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/kiosk/search")({
  component: SearchPage,
});

function parseCategory(rawCat: string | null) {
  if (!rawCat) return { parent: "Geral", sub: "Outros" };
  if (rawCat.includes(" - ")) {
    const parts = rawCat.split(" - ");
    return { parent: parts[0].trim(), sub: parts[1].trim() };
  }
  if (rawCat.includes(",")) {
    const parts = rawCat.split(",");
    const cleaned = parts.map(p => p.trim());
    const parent = cleaned.find(c => ["pintura", "pinturas", "materiais elétricos", "elétrico", "elétrica", "ferragens", "canalização"].includes(c.toLowerCase())) || cleaned[0];
    const sub = cleaned.find(c => c !== parent) || "Geral";
    
    let normalizedParent = parent;
    if (parent.toLowerCase().startsWith("pintur")) normalizedParent = "Pintura";
    else if (parent.toLowerCase().includes("elétr") || parent.toLowerCase().includes("eletri")) normalizedParent = "Materiais Elétricos";
    else if (parent.toLowerCase().startsWith("ferrag")) normalizedParent = "Ferragens";
    else if (parent.toLowerCase().startsWith("canaliza")) normalizedParent = "Canalização";
    
    return { parent: normalizedParent, sub };
  }
  
  let parent = rawCat.trim();
  let normalizedParent = parent;
  if (parent.toLowerCase().startsWith("pintur")) normalizedParent = "Pintura";
  else if (parent.toLowerCase().includes("elétr") || parent.toLowerCase().includes("eletri")) normalizedParent = "Materiais Elétricos";
  else if (parent.toLowerCase().startsWith("ferrag")) normalizedParent = "Ferragens";
  else if (parent.toLowerCase().startsWith("canaliza")) normalizedParent = "Canalização";
  
  return { parent: normalizedParent, sub: "Geral" };
}

function getCategoryIcon(parent: string) {
  const name = parent.toLowerCase();
  if (name.includes("pintur")) return <Paintbrush className="h-10 w-10 text-emerald-500" />;
  if (name.includes("elétr") || name.includes("eletri")) return <Zap className="h-10 w-10 text-amber-500" />;
  if (name.includes("ferrag")) return <Hammer className="h-10 w-10 text-sky-500" />;
  if (name.includes("canaliza")) return <Droplet className="h-10 w-10 text-blue-500" />;
  return <Package className="h-10 w-10 text-muted-foreground" />;
}

function SearchPage() {
  const [q, setQ] = useState("");
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", "kiosk", q],
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

  // Dynamic nested categories mapping when search is empty
  const parsedProducts = useMemo(() => {
    return products.map(p => ({
      ...p,
      parsedCat: parseCategory(p.category)
    }));
  }, [products]);

  const structure = useMemo(() => {
    const parentMap: Record<string, Set<string>> = {};
    parsedProducts.forEach(p => {
      const { parent, sub } = p.parsedCat;
      if (!parentMap[parent]) parentMap[parent] = new Set();
      parentMap[parent].add(sub);
    });

    const parents = Object.keys(parentMap).sort();
    return { parents, parentMap };
  }, [parsedProducts]);

  function handleBackToParents() {
    setSelectedParent(null);
    setSelectedSub(null);
  }

  function handleBackToSubs() {
    setSelectedSub(null);
  }

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto flex flex-col min-h-[calc(100vh-7rem)]">
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-primary">Catálogo de Produtos</h1>
        <p className="text-lg text-muted-foreground">
          Navegue pelas categorias ou procure diretamente o produto pretendido.
        </p>
      </div>

      <div className="relative mb-8">
        <Input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (e.target.value.trim()) {
              // Bypass categories if searching
              setSelectedParent(null);
              setSelectedSub(null);
            }
          }}
          placeholder="Escreva para pesquisar: tinta, rolo, lâmpada, torneira..."
          className="h-16 text-xl rounded-2xl pl-6 pr-12 shadow-sm border-2 border-border focus:border-accent"
        />
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="h-10 w-10 rounded-full border-4 border-accent border-t-transparent animate-spin" />
        </div>
      ) : q.trim() ? (
        // Direct Search Results Layout
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-primary mb-4">
            Resultados da Pesquisa ({products.length})
          </h2>
          {products.length === 0 ? (
            <div className="bg-card border-2 border-dashed rounded-3xl p-16 text-center shadow-sm">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-xl font-medium text-foreground">Sem resultados encontrados.</p>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Tente usar palavras-chave diferentes ou chame um funcionário para assistência presencial.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.map((p) => (
                <ProductGridItem key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      ) : (
        // Nested Navigation Layout (Category -> Subcategory -> Product)
        <div className="flex-1 flex flex-col">
          {/* Breadcrumbs / Back button */}
          {(selectedParent || selectedSub) && (
            <div className="flex items-center gap-2 mb-6 text-sm flex-wrap">
              <button
                onClick={handleBackToParents}
                className="text-accent hover:underline font-semibold"
              >
                Categorias
              </button>
              {selectedParent && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <button
                    onClick={selectedSub ? handleBackToSubs : undefined}
                    className={`${selectedSub ? "text-accent hover:underline font-semibold" : "text-muted-foreground font-medium"}`}
                  >
                    {selectedParent}
                  </button>
                </>
              )}
              {selectedSub && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">{selectedSub}</span>
                </>
              )}
            </div>
          )}

          {/* Navigation Screens */}
          {!selectedParent && (
            // Screen 1: Top-level Categories Grid
            <div className="flex-1 animate-fade-in">
              <h2 className="text-2xl font-bold text-primary mb-6">Selecione uma Categoria</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {structure.parents.map((pName) => {
                  const count = parsedProducts.filter(p => p.parsedCat.parent === pName).length;
                  return (
                    <button
                      key={pName}
                      onClick={() => setSelectedParent(pName)}
                      className="group bg-card border border-border/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center hover:border-accent hover:scale-[1.03] transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                    >
                      <div className="h-20 w-20 rounded-2xl bg-muted/60 group-hover:bg-accent/10 flex items-center justify-center mb-4 transition-all duration-200">
                        {getCategoryIcon(pName)}
                      </div>
                      <span className="font-extrabold text-xl text-primary group-hover:text-accent transition-colors">
                        {pName}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1 bg-muted px-2 py-0.5 rounded-full">
                        {count} {count === 1 ? "produto" : "produtos"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedParent && !selectedSub && (
            // Screen 2: Subcategories Grid
            <div className="flex-1 animate-fade-in">
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={handleBackToParents}
                  className="p-2.5 rounded-xl border hover:bg-muted transition text-muted-foreground shrink-0 cursor-pointer"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-primary">{selectedParent}</h2>
                  <p className="text-sm text-muted-foreground">Escolha uma subcategoria para explorar.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Array.from(structure.parentMap[selectedParent] || []).sort().map((subName) => {
                  const count = parsedProducts.filter(
                    p => p.parsedCat.parent === selectedParent && p.parsedCat.sub === subName
                  ).length;
                  return (
                    <button
                      key={subName}
                      onClick={() => setSelectedSub(subName)}
                      className="group bg-card border border-border/60 hover:border-accent rounded-2xl p-6 flex flex-col items-start justify-center hover:scale-[1.02] transition-all duration-200 shadow-sm hover:shadow-md text-left cursor-pointer"
                    >
                      <span className="font-bold text-lg text-primary group-hover:text-accent transition-colors">
                        {subName}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1.5 bg-muted px-2.5 py-0.5 rounded-full font-medium">
                        {count} {count === 1 ? "produto" : "produtos"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedParent && selectedSub && (
            // Screen 3: Products in Subcategory Grid
            <div className="flex-1 animate-fade-in">
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={handleBackToSubs}
                  className="p-2.5 rounded-xl border hover:bg-muted transition text-muted-foreground shrink-0 cursor-pointer"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-primary">{selectedSub}</h2>
                  <p className="text-sm text-muted-foreground">
                    Lista de produtos disponíveis na categoria {selectedParent} &gt; {selectedSub}.
                  </p>
                </div>
              </div>

              {(() => {
                const subProducts = parsedProducts.filter(
                  p => p.parsedCat.parent === selectedParent && p.parsedCat.sub === selectedSub
                );
                return subProducts.length === 0 ? (
                  <div className="bg-card border rounded-2xl p-10 text-center text-muted-foreground">
                    Sem produtos disponíveis nesta subcategoria neste momento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {subProducts.map((p) => (
                      <ProductGridItem key={p.id} p={p} />
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductGridItem({ p }: { p: any }) {
  return (
    <Link
      to="/kiosk/product/$id"
      params={{ id: p.id }}
      className="kiosk-btn bg-card border border-border hover:border-accent rounded-2xl p-4 flex flex-col items-start text-left shadow-sm hover:shadow-md transition-all duration-200 group"
    >
      <div className="w-full aspect-square rounded-xl bg-muted overflow-hidden flex items-center justify-center mb-3">
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <Package className="h-12 w-12 text-muted-foreground/60" />
        )}
      </div>
      <h3 className="text-base font-bold text-primary line-clamp-2 min-h-[3rem] group-hover:text-accent transition-colors leading-snug">{p.name}</h3>
      <div className="mt-auto w-full">
        {p.price != null && (
          <div className="text-lg font-extrabold text-foreground mt-1 mb-2">
            {p.promotion_active && p.promotion_price != null ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-destructive font-black">€{Number(p.promotion_price).toFixed(2)}</span>
                <span className="text-xs line-through text-muted-foreground font-normal">€{Number(p.price).toFixed(2)}</span>
              </div>
            ) : (
              <span>€{Number(p.price).toFixed(2)}</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-accent-foreground bg-accent/5 border border-accent/10 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold w-full">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
          <span className="truncate">
            {[p.section, p.aisle && `C${p.aisle}`, p.shelf && `P${p.shelf}`]
              .filter(Boolean)
              .join(" · ") || "Loja"}
          </span>
        </div>
      </div>
    </Link>
  );
}
