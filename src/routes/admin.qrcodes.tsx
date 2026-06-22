import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Printer, Package, Search, MapPin, Hash } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import QRCode from "@/components/QRCode";

export const Route = createFileRoute("/admin/qrcodes")({
  component: AdminQRCodes,
});

function AdminQRCodes() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin", "qrcodes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, category, section, aisle, shelf, active")
        .eq("active", true)
        .order("category")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (search) {
        const term = search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(term) &&
          !(p.category ?? "").toLowerCase().includes(term)
        )
          return false;
      }
      if (selectedCategory && p.category !== selectedCategory) return false;
      return true;
    });
  }, [products, search, selectedCategory]);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://materassist.vercel.app";

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 no-print">
        <h1 className="text-3xl font-bold text-primary">QR Codes</h1>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition"
        >
          <Printer className="h-4 w-4" /> Imprimir tudo
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 no-print">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar produto…"
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background text-sm outline-none focus:border-accent transition"
          />
        </div>
        <select
          value={selectedCategory ?? ""}
          onChange={(e) => setSelectedCategory(e.target.value || null)}
          className="h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none focus:border-accent transition"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} produto{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* QR Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <span className="h-8 w-8 rounded-full border-4 border-muted-foreground/20 border-t-accent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="h-16 w-16 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div
          ref={printRef}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        >
          {filtered.map((p) => {
            const url = `${origin}/kiosk/product/${p.id}`;
            const location = [p.section, p.aisle, p.shelf].filter(Boolean).join(" · ");
            return (
              <div
                key={p.id}
                className="bg-card border rounded-2xl p-3 flex flex-col items-center text-center print:border print:shadow-none print:rounded-none print:p-2"
              >
                <QRCode url={url} size={120} />
                <p className="mt-2 text-xs font-semibold text-primary leading-tight line-clamp-2 min-h-[2rem]">
                  {p.name}
                </p>
                {location && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" /> {location}
                  </p>
                )}
                {p.category && (
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5 truncate max-w-full">
                    {p.category}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 0.5cm; size: A4 portrait; }
          .no-print { display: none !important; }
          .print\\:border { border: 1px solid #ddd !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:p-2 { padding: 0.5rem !important; }
        }
      `}</style>
    </div>
  );
}
