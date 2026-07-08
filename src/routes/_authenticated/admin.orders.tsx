import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminListOrders, adminUpdateOrderStatus } from "@/lib/orders.functions";
import { formatNaira, formatDate } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORDER_STATUS_LABEL } from "@/lib/config";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrdersPage,
});

const STATUSES = ["received", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"] as const;

function AdminOrdersPage() {
  const fetchOrders = useServerFn(adminListOrders);
  const updateStatus = useServerFn(adminUpdateOrderStatus);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-orders"], queryFn: () => fetchOrders({ data: {} }), refetchInterval: 15_000 });

  useEffect(() => {
    const ch = supabase.channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-orders"] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  async function setStatus(id: string, status: any) {
    try {
      await updateStatus({ data: { id, status } });
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (e: any) { toast.error(e?.message ?? "Update failed"); }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Orders</h1>
      <div className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Placed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(q.data ?? []).map((o: any) => (
              <tr key={o.id}>
                <td className="px-4 py-3 font-semibold">{o.order_number}</td>
                <td className="px-4 py-3"><div>{o.customer_name}</div><div className="text-xs text-muted-foreground">{o.phone}</div></td>
                <td className="px-4 py-3 capitalize">{o.delivery_type}{o.area ? ` · ${o.area}` : ""}</td>
                <td className="px-4 py-3 font-semibold">{formatNaira(Number(o.total))}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${o.payment_status === "paid" ? "bg-forest/10 text-forest" : "bg-muted text-muted-foreground"}`}>{o.payment_status}</span>
                </td>
                <td className="px-4 py-3 min-w-40">
                  <Select value={o.status} onValueChange={(v) => setStatus(o.id, v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{ORDER_STATUS_LABEL[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(o.created_at)}</td>
              </tr>
            ))}
            {q.data?.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}