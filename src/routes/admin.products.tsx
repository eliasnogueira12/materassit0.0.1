import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Upload, X, Scan, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { formatPrice } from "@/lib/format";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { lookupBarcode } from "@/lib/barcode.functions";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type ProductRow = {
  id: string;
  name: string;
  category: string | null;
  section: string | null;
  aisle: string | null;
  shelf: string | null;
  description: string | null;
  keywords: string | null;
  image_url: string | null;
  active: boolean;
  stock: number;
  stock_visible: boolean;
  price: number | null;
  internal_code: string | null;
  promotion_price: number | null;
  promotion_active: boolean;
  featured: boolean;
  barcode: string | null;
};

function AdminProducts() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<ProductRow> | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const { data: products = [] } = useQuery({
    queryKey: ["admin", "products", q],
    queryFn: async () => {
      let query = supabase.from("products").select("*").order("name");
      if (q.trim()) {
        const t = `%${q.trim()}%`;
        query = query.or(
          `name.ilike.${t},category.ilike.${t},keywords.ilike.${t},internal_code.ilike.${t},barcode.ilike.${t}`,
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as ProductRow[];
    },
  });

  async function toggleActive(p: ProductRow) {
    const { error } = await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Atualizado");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
    }
  }
  async function remove(p: ProductRow) {
    if (!confirm(`Apagar "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Apagado");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-primary">Produtos</h1>
        <Button onClick={() => setEditing({ active: true, stock_visible: true, stock: 0 })}>
          <Plus className="h-4 w-4 mr-2" />
          Novo produto
        </Button>
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Procurar produto, código, categoria..."
          className="pl-9"
        />
      </div>
      {(() => {
        const groupedProducts = products.reduce(
          (acc, p) => {
            const cat = p.category?.trim() || "Sem categoria";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(p);
            return acc;
          },
          {} as Record<string, ProductRow[]>,
        );

        const categories = Object.keys(groupedProducts).sort();

        return products.length === 0 ? (
          <div className="bg-card border rounded-2xl p-10 text-center text-muted-foreground">
            Sem produtos.
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((cat) => {
              const catProducts = groupedProducts[cat];
              const isCollapsed = collapsed[cat] ?? false;

              return (
                <div key={cat} className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))}
                    className="w-full flex items-center justify-between p-4 bg-muted/40 hover:bg-muted/60 transition font-bold text-lg text-primary text-left border-b border-border cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      {cat}
                      <span className="text-xs font-normal text-muted-foreground bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                        {catProducts.length} {catProducts.length === 1 ? "produto" : "produtos"}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-accent hover:underline">
                      {isCollapsed ? "Mostrar" : "Ocultar"}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/20 text-left border-b border-border">
                          <tr>
                            <th className="p-3">Nome</th>
                            <th className="p-3">Preço</th>
                            <th className="p-3">Stock</th>
                            <th className="p-3">Localização</th>
                            <th className="p-3">Estado</th>
                            <th className="p-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {catProducts.map((p) => (
                            <tr key={p.id} className="hover:bg-muted/10">
                              <td className="p-3 font-medium">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {p.name}
                                  {p.featured && (
                                    <span className="text-[10px] uppercase bg-accent/30 text-accent-foreground px-1.5 py-0.5 rounded font-bold">
                                      Destaque
                                    </span>
                                  )}
                                  {p.promotion_active && (
                                    <span className="text-[10px] uppercase bg-destructive/15 text-destructive px-1.5 py-0.5 rounded font-bold">
                                      Promo
                                    </span>
                                  )}
                                </div>
                                {p.internal_code && (
                                  <div className="text-[11px] text-muted-foreground mt-0.5">
                                    #{p.internal_code}
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                {p.promotion_active && p.promotion_price != null ? (
                                  <div>
                                    <span className="font-semibold text-destructive">
                                      {formatPrice(p.promotion_price)}
                                    </span>
                                    {p.price != null && (
                                      <span className="ml-2 text-xs line-through text-muted-foreground">
                                        {formatPrice(p.price)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span>{formatPrice(p.price) ?? "—"}</span>
                                )}
                              </td>
                              <td className="p-3">{p.stock_visible ? p.stock : "—"}</td>
                              <td className="p-3 text-muted-foreground">
                                {[p.section, p.aisle && `C${p.aisle}`, p.shelf && `P${p.shelf}`]
                                  .filter(Boolean)
                                  .join(" · ") || "—"}
                              </td>
                              <td className="p-3">
                                <Switch
                                  checked={p.active}
                                  onCheckedChange={() => toggleActive(p)}
                                />
                              </td>
                              <td className="p-3 text-right">
                                <div className="inline-flex gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => remove(p)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {editing && (
        <ProductDialog
          initial={editing}
          allProducts={products}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin", "products"] });
          }}
        />
      )}
    </div>
  );
}

function ProductDialog({
  initial,
  allProducts,
  onClose,
  onSaved,
}: {
  initial: Partial<ProductRow>;
  allProducts: ProductRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<ProductRow>>(initial);
  const [busy, setBusy] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  const { data: dbCategories = [] } = useQuery({
    queryKey: ["admin", "categories-product-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("name")
        .eq("type", "product")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    dbCategories.forEach((c) => set.add(c.name));
    if (form.category) {
      set.add(form.category);
    }
    return Array.from(set).sort();
  }, [dbCategories, form.category]);

  const { data: relations = [], refetch: refetchRelations } = useQuery({
    queryKey: ["product-relations", form.id],
    enabled: !!form.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_relations")
        .select("id, related_product_id")
        .eq("product_id", form.id!);
      if (error) throw error;
      return data ?? [];
    },
  });

  function set<K extends keyof ProductRow>(k: K, v: ProductRow[K] | null) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadImage(file: File) {
    setBusy(true);
    try {
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-z0-9.-]/gi, "_")}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      set("image_url", data.publicUrl);
      toast.success("Imagem carregada");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar imagem");
    } finally {
      setBusy(false);
    }
  }

  async function addRelation(relatedId: string) {
    if (!form.id || !relatedId || relatedId === form.id) return;
    const { error } = await supabase
      .from("product_relations")
      .insert({ product_id: form.id, related_product_id: relatedId });
    if (error) toast.error(error.message);
    else refetchRelations();
  }
  async function removeRelation(id: string) {
    const { error } = await supabase.from("product_relations").delete().eq("id", id);
    if (error) toast.error(error.message);
    else refetchRelations();
  }

  async function save() {
    if (!form.name?.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setBusy(true);
    const toNum = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const payload = {
      name: form.name,
      category: form.category ?? null,
      section: form.section ?? null,
      aisle: form.aisle ?? null,
      shelf: form.shelf ?? null,
      description: form.description ?? null,
      keywords: form.keywords ?? null,
      image_url: form.image_url ?? null,
      active: form.active ?? true,
      stock: Number.isFinite(Number(form.stock)) ? Number(form.stock) : 0,
      stock_visible: form.stock_visible ?? true,
      price: toNum(form.price),
      internal_code: form.internal_code?.trim() || null,
      promotion_price: toNum(form.promotion_price),
      promotion_active: form.promotion_active ?? false,
      featured: form.featured ?? false,
      barcode: form.barcode?.trim() || null,
    };
    const { error } = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert(payload);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Guardado");
      onSaved();
    }
  }

  const relatedIds = new Set(relations.map((r) => r.related_product_id));
  const availableRelated = allProducts.filter((p) => p.id !== form.id && !relatedIds.has(p.id));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Nome</Label>
            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label>Código interno</Label>
            <Input
              value={form.internal_code ?? ""}
              onChange={(e) => set("internal_code", e.target.value)}
              placeholder="PAR-M8"
            />
          </div>
          <div>
            <Label>Código de barras</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={form.barcode ?? ""}
                onChange={(e) => set("barcode", e.target.value)}
                placeholder="5901234123457"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                type="button"
                onClick={() => setShowScanner(true)}
                title="Ler código de barras com câmara"
              >
                <Scan className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <BarcodeScanner
            open={showScanner}
            onDetected={async (code) => {
              set("barcode", code);
              setShowScanner(false);
              setLookingUp(true);
              try {
                const { data: local } = await supabase
                  .from("products")
                  .select("*")
                  .eq("barcode", code)
                  .maybeSingle();
                if (local) {
                  set("name", local.name);
                  set("category", local.category);
                  set("section", local.section);
                  set("aisle", local.aisle);
                  set("shelf", local.shelf);
                  set("description", local.description);
                  set("keywords", local.keywords);
                  set("image_url", local.image_url);
                  set("price", local.price);
                  set("internal_code", local.internal_code);
                  set("stock", local.stock);
                  set("promotion_price", local.promotion_price);
                  set("promotion_active", local.promotion_active);
                  set("featured", local.featured);
                  toast.success("Produto encontrado na base de dados local");
                  return;
                }
                const result = await lookupBarcode({ barcode: code });
                if (result?.name && !form.name) {
                  set("name", result.name);
                }
                if (result?.category && !form.category) {
                  set("category", result.category);
                }
                if (result?.description && !form.description) {
                  set("description", result.description);
                }
                if (result?.image && !form.image_url) {
                  set("image_url", result.image);
                }
                if (result?.name) {
                  toast.success("Produto encontrado na base de dados global");
                }
              } catch {
                /* lookup failed, admin fills manually */
              } finally {
                setLookingUp(false);
              }
            }}
            onClose={() => setShowScanner(false)}
          />
          <div>
            <Label>Categoria</Label>
            {showCustomCategory ? (
              <div className="flex gap-2 mt-1">
                <Input
                  value={customCategory}
                  onChange={(e) => {
                    setCustomCategory(e.target.value);
                    set("category", e.target.value);
                  }}
                  placeholder="Nome da categoria..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCustomCategory(false);
                    set("category", categoryOptions[0] || "");
                  }}
                >
                  Selecionar
                </Button>
              </div>
            ) : (
              <select
                value={form.category ?? ""}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setShowCustomCategory(true);
                    setCustomCategory("");
                  } else {
                    set("category", e.target.value || null);
                  }
                }}
                className="w-full h-10 border rounded-lg px-3 bg-background mt-1 text-sm outline-none"
              >
                <option value="">-- Sem Categoria --</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__custom__" className="text-accent font-semibold">
                  + Definir categoria personalizada...
                </option>
              </select>
            )}
          </div>
          <div>
            <Label>Preço (€)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.price ?? ""}
              onChange={(e) => set("price", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Preço promocional (€)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.promotion_price ?? ""}
              onChange={(e) =>
                set("promotion_price", e.target.value === "" ? null : Number(e.target.value))
              }
            />
          </div>
          <div className="col-span-2 flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.promotion_active ?? false}
                onCheckedChange={(v) => set("promotion_active", v)}
              />
              Promoção ativa
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.featured ?? false}
                onCheckedChange={(v) => set("featured", v)}
              />
              Destaque na homepage
            </label>
          </div>
          <div>
            <Label>Secção</Label>
            <Input value={form.section ?? ""} onChange={(e) => set("section", e.target.value)} />
          </div>
          <div>
            <Label>Corredor</Label>
            <Input
              value={form.aisle ?? ""}
              onChange={(e) => set("aisle", e.target.value)}
              placeholder="4"
            />
          </div>
          <div>
            <Label>Prateleira</Label>
            <Input
              value={form.shelf ?? ""}
              onChange={(e) => set("shelf", e.target.value)}
              placeholder="B2"
            />
          </div>
          <div>
            <Label>Stock</Label>
            <Input
              type="number"
              min="0"
              value={form.stock ?? 0}
              onChange={(e) => set("stock", Number(e.target.value))}
            />
          </div>
          <div className="flex items-end gap-3 pb-2">
            <Switch
              checked={form.stock_visible ?? true}
              onCheckedChange={(v) => set("stock_visible", v)}
            />
            <span>Stock visível</span>
          </div>
          <div className="col-span-2">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Label>Palavras-chave</Label>
            <Input
              value={form.keywords ?? ""}
              onChange={(e) => set("keywords", e.target.value)}
              placeholder="água, fuga, torneira, vedar"
            />
          </div>
          <div className="col-span-2">
            <Label>Imagem</Label>
            <div className="flex items-center gap-3 mt-1">
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover border"
                />
              )}
              <label className="kiosk-btn bg-secondary text-secondary-foreground px-4 py-2 cursor-pointer text-sm">
                <Upload className="h-4 w-4 mr-2" /> Carregar
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
                />
              </label>
              {form.image_url && (
                <Button variant="ghost" size="sm" onClick={() => set("image_url", null)}>
                  Remover
                </Button>
              )}
            </div>
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <Switch checked={form.active ?? true} onCheckedChange={(v) => set("active", v)} />
            <span>Ativo (visível ao cliente)</span>
          </div>

          {form.id && (
            <div className="col-span-2 border-t pt-4 mt-2">
              <Label>Produtos relacionados</Label>
              <div className="flex flex-wrap gap-2 mt-2 mb-2">
                {relations.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum relacionado.</p>
                )}
                {relations.map((r) => {
                  const name = allProducts.find((p) => p.id === r.related_product_id)?.name ?? "?";
                  return (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1 bg-muted px-2.5 py-1 rounded-lg text-sm"
                    >
                      {name}
                      <button
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeRelation(r.id)}
                        type="button"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
              <select
                className="w-full border rounded-lg px-3 py-2 bg-background"
                onChange={(e) => {
                  if (e.target.value) {
                    addRelation(e.target.value);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
              >
                <option value="">+ Adicionar produto relacionado…</option>
                {availableRelated.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
