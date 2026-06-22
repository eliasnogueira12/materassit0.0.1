import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/admin/problems")({
  component: AdminProblems,
});

type Row = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  solution: string | null;
  steps: string | null;
  safety_warning: string | null;
  keywords: string | null;
  active: boolean;
};

function AdminProblems() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Row> | null>(null);

  const { data: rows = [] } = useQuery({
    queryKey: ["admin", "problems"],
    queryFn: async () => {
      const { data, error } = await supabase.from("problems").select("*").order("title");
      if (error) throw error;
      return data as Row[];
    },
  });

  async function remove(r: Row) {
    if (!confirm(`Apagar "${r.title}"?`)) return;
    const { error } = await supabase.from("problems").delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Apagado");
      qc.invalidateQueries({ queryKey: ["admin", "problems"] });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-primary">Problemas & soluções</h1>
        <Button onClick={() => setEditing({ active: true })}>
          <Plus className="h-4 w-4 mr-2" />
          Novo problema
        </Button>
      </div>
      <div className="bg-card border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Título</th>
              <th className="p-3">Categoria</th>
              <th className="p-3">Estado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="p-3 font-medium">{r.title}</td>
                <td className="p-3 text-muted-foreground">{r.category ?? "—"}</td>
                <td className="p-3">
                  {r.active ? (
                    <span className="text-xs bg-accent/20 px-2 py-1 rounded">ativo</span>
                  ) : (
                    <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                      inativo
                    </span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Sem problemas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProblemDialog
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin", "problems"] });
          }}
        />
      )}
    </div>
  );
}

function ProblemDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: Partial<Row>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Row>>(initial);
  const [busy, setBusy] = useState(false);

  const { data: allProducts = [] } = useQuery({
    queryKey: ["admin", "all-products"],
    queryFn: async () =>
      (await supabase.from("products").select("id,name,category").order("name")).data ?? [],
  });
  const { data: linkedIds = [] } = useQuery({
    queryKey: ["problem-links", form.id ?? "new"],
    queryFn: async () => {
      if (!form.id) return [] as string[];
      const { data } = await supabase
        .from("problem_products")
        .select("product_id")
        .eq("problem_id", form.id);
      return (data ?? []).map((x) => x.product_id);
    },
  });
  const [selected, setSelected] = useState<string[] | null>(null);
  const currentSelection = selected ?? linkedIds;

  function set<K extends keyof Row>(k: K, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function toggle(id: string) {
    const base = selected ?? linkedIds;
    setSelected(base.includes(id) ? base.filter((x) => x !== id) : [...base, id]);
  }

  async function save() {
    if (!form.title?.trim()) {
      toast.error("Título obrigatório");
      return;
    }
    setBusy(true);
    const payload = {
      title: form.title,
      category: form.category ?? null,
      description: form.description ?? null,
      solution: form.solution ?? null,
      steps: form.steps ?? null,
      safety_warning: form.safety_warning ?? null,
      keywords: form.keywords ?? null,
      active: form.active ?? true,
    };
    let id = form.id;
    if (id) {
      const { error } = await supabase.from("problems").update(payload).eq("id", id);
      if (error) {
        setBusy(false);
        toast.error(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase.from("problems").insert(payload).select("id").single();
      if (error || !data) {
        setBusy(false);
        toast.error(error?.message ?? "Erro");
        return;
      }
      id = data.id;
    }
    // sync links
    await supabase.from("problem_products").delete().eq("problem_id", id!);
    if (currentSelection.length > 0) {
      const rows = currentSelection.map((pid, i) => ({
        problem_id: id!,
        product_id: pid,
        display_order: i,
      }));
      const { error } = await supabase.from("problem_products").insert(rows);
      if (error) {
        setBusy(false);
        toast.error(error.message);
        return;
      }
    }
    setBusy(false);
    toast.success("Guardado");
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar problema" : "Novo problema"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Título</Label>
            <Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Categoria</Label>
            <Input value={form.category ?? ""} onChange={(e) => set("category", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Label>Solução recomendada</Label>
            <Textarea
              rows={3}
              value={form.solution ?? ""}
              onChange={(e) => set("solution", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Label>Passos (um por linha)</Label>
            <Textarea
              rows={4}
              value={form.steps ?? ""}
              onChange={(e) => set("steps", e.target.value)}
              placeholder="1. Limpe a zona&#10;2. Aplique a massa"
            />
          </div>
          <div className="col-span-2">
            <Label>Aviso de segurança</Label>
            <Textarea
              rows={2}
              value={form.safety_warning ?? ""}
              onChange={(e) => set("safety_warning", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Label>Palavras-chave</Label>
            <Input value={form.keywords ?? ""} onChange={(e) => set("keywords", e.target.value)} />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <Switch checked={form.active ?? true} onCheckedChange={(v) => set("active", v)} />
            <span>Ativo</span>
          </div>
          <div className="col-span-2">
            <Label>Produtos recomendados</Label>
            <div className="mt-2 max-h-64 overflow-y-auto border rounded-lg p-2 space-y-1">
              {allProducts.length === 0 && (
                <p className="text-sm text-muted-foreground p-2">Adicione produtos primeiro.</p>
              )}
              {allProducts.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={currentSelection.includes(p.id)}
                    onCheckedChange={() => toggle(p.id)}
                  />
                  <span>{p.name}</span>
                  {p.category && (
                    <span className="text-xs text-muted-foreground">— {p.category}</span>
                  )}
                </label>
              ))}
            </div>
          </div>
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
