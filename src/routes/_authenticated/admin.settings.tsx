import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getPublicSettings } from "@/lib/menu.functions";
import { adminUpdateSettings } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const fetchSettings = useServerFn(getPublicSettings);
  const update = useServerFn(adminUpdateSettings);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["settings"], queryFn: () => fetchSettings() });
  const [form, setForm] = useState<any>({ delivery_fee: 1000, min_order_amount: 0, is_open: true, announcement: "", whatsapp_number: "2348083163956" });

  useEffect(() => { if (q.data) setForm(q.data); }, [q.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update({ data: {
        delivery_fee: Number(form.delivery_fee),
        min_order_amount: Number(form.min_order_amount),
        is_open: !!form.is_open,
        announcement: form.announcement ?? "",
        whatsapp_number: form.whatsapp_number,
      }});
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <form onSubmit={save} className="space-y-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-border">
        <label className="flex items-center gap-3"><Switch checked={!!form.is_open} onCheckedChange={(v) => setForm({ ...form, is_open: v })} /><span>Accepting orders</span></label>
        <div><Label>Delivery fee (₦)</Label><Input type="number" value={form.delivery_fee ?? 0} onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })} /></div>
        <div><Label>Minimum order (₦)</Label><Input type="number" value={form.min_order_amount ?? 0} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} /></div>
        <div><Label>WhatsApp number</Label><Input value={form.whatsapp_number ?? ""} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} /></div>
        <div><Label>Announcement banner (optional)</Label><Textarea value={form.announcement ?? ""} onChange={(e) => setForm({ ...form, announcement: e.target.value })} /></div>
        <Button type="submit">Save settings</Button>
      </form>
    </div>
  );
}