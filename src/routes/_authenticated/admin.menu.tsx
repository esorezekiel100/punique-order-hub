import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { getMenu } from "@/lib/menu.functions";
import { adminUpsertMenuItem, adminDeleteMenuItem, adminUpsertCategory } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatNaira } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/menu")({
  component: AdminMenuPage,
});

function AdminMenuPage() {
  const fetchMenu = useServerFn(getMenu);
  const upsert = useServerFn(adminUpsertMenuItem);
  const del = useServerFn(adminDeleteMenuItem);
  const upsertCat = useServerFn(adminUpsertCategory);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["menu"], queryFn: () => fetchMenu() });
  const { user } = useAuth();
  const [editing, setEditing] = useState<any | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", slug: "" });

  async function save(form: any) {
    try {
      let image_url = form.image_url ?? null;
      if (form._file instanceof File && user) {
        const path = `${crypto.randomUUID()}-${form._file.name.replace(/\s+/g, "_")}`;
        const up = await supabase.storage.from("menu-images").upload(path, form._file, { upsert: true });
        if (up.error) throw up.error;
        image_url = path;
      }
      await upsert({ data: {
        id: form.id,
        category_id: form.category_id || null,
        name: form.name,
        description: form.description ?? "",
        price: Number(form.price),
        image_url,
        in_stock: !!form.in_stock,
        is_special: !!form.is_special,
        protein_options: form.protein_options ?? [],
        display_order: Number(form.display_order ?? 0),
      }});
      toast.success("Saved");
      setEditing(null); setOpenDialog(false);
      qc.invalidateQueries({ queryKey: ["menu"] });
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this item?")) return;
    try { await del({ data: { id } }); toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["menu"] }); }
    catch (e: any) { toast.error(e?.message ?? "Delete failed"); }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    try {
      await upsertCat({ data: { name: newCat.name, slug: newCat.slug || newCat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), display_order: 99 } });
      toast.success("Category added");
      setNewCat({ name: "", slug: "" });
      qc.invalidateQueries({ queryKey: ["menu"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Menu management</h1>
        <Dialog open={openDialog} onOpenChange={(o) => { setOpenDialog(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ in_stock: true, is_special: false, protein_options: [], price: 0 })}>
              <Plus className="mr-1 h-4 w-4" />New item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing?.id ? "Edit item" : "New menu item"}</DialogTitle></DialogHeader>
            {editing && <ItemForm categories={q.data?.categories ?? []} value={editing} onChange={setEditing} onSave={() => save(editing)} />}
          </DialogContent>
        </Dialog>
      </div>

      <form onSubmit={addCategory} className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-4">
        <div className="flex-1 min-w-40">
          <Label>New category name</Label>
          <Input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder="e.g. Drinks" required />
        </div>
        <div className="flex-1 min-w-40">
          <Label>Slug (optional)</Label>
          <Input value={newCat.slug} onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })} placeholder="drinks" />
        </div>
        <Button type="submit" variant="outline">Add category</Button>
      </form>

      <div className="grid gap-4">
        {(q.data?.items ?? []).map((it: any) => {
          const cat = q.data?.categories.find((c: any) => c.id === it.category_id);
          return (
            <div key={it.id} className="flex items-center justify-between gap-4 rounded-xl bg-card p-4 shadow-card ring-1 ring-border">
              <div>
                <p className="font-semibold">{it.name} <span className="text-xs text-muted-foreground">· {cat?.name ?? "Uncategorised"}</span></p>
                <p className="text-sm text-muted-foreground line-clamp-1">{it.description}</p>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="font-semibold text-primary">{formatNaira(it.price)}</span>
                  {!it.in_stock && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">Out of stock</span>}
                  {it.is_special && <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">Special</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => { setEditing({ ...it }); setOpenDialog(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => remove(it.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ItemForm({ value, onChange, onSave, categories }: any) {
  return (
    <div className="space-y-3">
      <div><Label>Name</Label><Input value={value.name ?? ""} onChange={(e) => onChange({ ...value, name: e.target.value })} /></div>
      <div><Label>Description</Label><Textarea value={value.description ?? ""} onChange={(e) => onChange({ ...value, description: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Price (₦)</Label><Input type="number" value={value.price ?? 0} onChange={(e) => onChange({ ...value, price: e.target.value })} /></div>
        <div><Label>Display order</Label><Input type="number" value={value.display_order ?? 0} onChange={(e) => onChange({ ...value, display_order: e.target.value })} /></div>
      </div>
      <div>
        <Label>Category</Label>
        <Select value={value.category_id ?? ""} onValueChange={(v) => onChange({ ...value, category_id: v })}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Image (upload)</Label>
        <Input type="file" accept="image/*" onChange={(e) => onChange({ ...value, _file: e.target.files?.[0] ?? null })} />
        <p className="mt-1 text-xs text-muted-foreground">Or leave existing image.</p>
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2"><Switch checked={!!value.in_stock} onCheckedChange={(v) => onChange({ ...value, in_stock: v })} /><span className="text-sm">In stock</span></label>
        <label className="flex items-center gap-2"><Switch checked={!!value.is_special} onCheckedChange={(v) => onChange({ ...value, is_special: v })} /><span className="text-sm">Today's special</span></label>
      </div>
      <Button onClick={onSave} className="w-full">Save</Button>
    </div>
  );
}