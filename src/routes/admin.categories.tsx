import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  type: "product" | "problem";
  description: string | null;
  active: boolean;
};

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

function AdminCategories() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"product" | "problem">("product");
  const [active, setActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: rows = [] } = useQuery<CategoryRow[]>({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("type")
        .order("name");
      if (error) throw error;
      return data as CategoryRow[];
    },
  });

  function resetForm() {
    setName("");
    setDescription("");
    setType("product");
    setActive(true);
    setEditingId(null);
  }

  function edit(row: CategoryRow) {
    setEditingId(row.id);
    setName(row.name);
    setDescription(row.description ?? "");
    setType(row.type);
    setActive(row.active);
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setBusy(true);
    const slug = name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-");
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      type,
      slug,
      active,
    };
    const { error } = editingId
      ? await supabase.from("categories").update(payload).eq("id", editingId)
      : await supabase.from("categories").insert(payload);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      resetForm();
      toast.success(editingId ? "Categoria atualizada" : "Categoria adicionada");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    }
  }
  async function remove(id: string) {
    if (!confirm("Apagar esta categoria?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Categoria apagada");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-primary mb-6">Categorias</h1>

      <div className="bg-card border rounded-2xl p-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4 items-end mb-6">
        <div className="flex-1 min-w-48">
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Canalização" />
        </div>
        <div className="lg:col-span-2">
          <Label>Descrição</Label>
          <Textarea
            rows={1}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição interna da categoria"
          />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select
            value={type}
            onValueChange={(v) => setType(v === "problem" ? "problem" : "product")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product">Produto</SelectItem>
              <SelectItem value="problem">Problema</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-3 pb-2">
          <Switch checked={active} onCheckedChange={setActive} />
          <span className="text-sm">Ativa</span>
        </label>
        <div className="flex gap-2 lg:col-span-3">
          <Button onClick={save} disabled={busy}>
            <Plus className="h-4 w-4 mr-2" />
            {busy ? "..." : editingId ? "Guardar categoria" : "Adicionar"}
          </Button>
          {editingId && (
            <Button variant="ghost" onClick={resetForm}>
              Cancelar edição
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Estado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((c) => (
              <tr key={c.id}>
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-muted-foreground">
                  {c.type === "product" ? "Produto" : "Problema"}
                </td>
                <td className="p-3 text-muted-foreground">{c.active ? "Ativa" : "Inativa"}</td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => edit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Sem categorias.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
