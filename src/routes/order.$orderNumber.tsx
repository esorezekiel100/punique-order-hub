import { createFileRoute, Link, useServerFn } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Check, Clock, MessageCircle, Printer } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getOrderByNumber } from "@/lib/orders.functions";
import { formatNaira, formatDate } from "@/lib/format";
import { ORDER_STATUS_LABEL, ORDER_STATUS_STEPS, WHATSAPP_NUMBER } from "@/lib/config";

export const Route = createFileRoute("/order/$orderNumber")({
  head: ({ params }) => ({
    meta: [
      { title: `Order ${params.orderNumber} — PUNIQUE KITCHEN` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { orderNumber } = Route.useParams();
  const fetchOrder = useServerFn(getOrderByNumber);

  const q = useQuery({
    queryKey: ["order", orderNumber],
    queryFn: () => fetchOrder({ data: { order_number: orderNumber } }),
    refetchInterval: 15_000,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderNumber}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `order_number=eq.${orderNumber}` },
        () => q.refetch(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderNumber, q]);

  const order = q.data;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-10">
        {q.isLoading && <p className="text-center text-muted-foreground">Loading order…</p>}
        {!q.isLoading && !order && (
          <div className="rounded-2xl border border-border p-8 text-center">
            <h1 className="font-display text-2xl font-bold">Order not found</h1>
            <p className="mt-2 text-muted-foreground">Double-check your order number.</p>
            <Button asChild className="mt-4"><Link to="/track">Try again</Link></Button>
          </div>
        )}
        {order && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-warm">
              <p className="text-sm font-medium uppercase tracking-widest opacity-80">Order</p>
              <h1 className="font-display text-3xl font-bold">{order.order_number}</h1>
              <p className="mt-1 text-sm opacity-90">Placed {formatDate(order.created_at)}</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-sm font-semibold">
                <Clock className="h-3.5 w-3.5" /> {ORDER_STATUS_LABEL[order.status] ?? order.status}
              </div>
            </div>

            <StatusTracker current={order.status} />

            <section className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-border">
              <h2 className="font-display text-lg font-semibold">Items</h2>
              <ul className="mt-3 divide-y divide-border">
                {(order.items ?? []).map((it: any) => (
                  <li key={it.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium">{it.name_snapshot} <span className="text-muted-foreground">× {it.quantity}</span></p>
                      {Array.isArray(it.addons) && it.addons.length > 0 && (
                        <p className="text-xs text-muted-foreground">+ {it.addons.map((a: any) => a.name).join(", ")}</p>
                      )}
                    </div>
                    <span className="font-semibold">{formatNaira(Number(it.price_at_time) * it.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
                <Row label="Subtotal" value={formatNaira(Number(order.subtotal))} />
                <Row label="Delivery" value={formatNaira(Number(order.delivery_fee))} />
                <div className="flex justify-between border-t border-border pt-2 font-display text-lg font-bold">
                  <span>Total</span><span>{formatNaira(Number(order.total))}</span>
                </div>
                <p className="mt-2 text-xs">
                  Payment: <span className={order.payment_status === "paid" ? "font-semibold text-forest" : "font-semibold text-primary"}>{order.payment_status}</span>
                </p>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <Button asChild variant="outline" className="gap-2">
                <a href={buildWhatsAppLink(order)} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" /> Share on WhatsApp
                </a>
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print receipt
              </Button>
            </section>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function StatusTracker({ current }: { current: string }) {
  if (current === "cancelled") {
    return <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">This order was cancelled.</div>;
  }
  const currentIdx = ORDER_STATUS_STEPS.indexOf(current as any);
  return (
    <ol className="grid grid-cols-5 gap-1 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border">
      {ORDER_STATUS_STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const label = ORDER_STATUS_LABEL[step].replace(" your food", "").replace(" for ", "\n");
        return (
          <li key={step} className="flex flex-col items-center gap-2 text-center">
            <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`text-[10px] leading-tight sm:text-xs ${done ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}

function buildWhatsAppLink(order: any) {
  const lines = [
    `Hi PUNIQUE KITCHEN, here's my order:`,
    `Order: ${order.order_number}`,
    `Name: ${order.customer_name}`,
    order.delivery_type === "delivery" ? `Delivery to: ${order.area ?? ""} — ${order.address ?? ""}` : `Pickup`,
    ``,
    ...(order.items ?? []).map((i: any) => `• ${i.name_snapshot} × ${i.quantity}`),
    ``,
    `Total: ₦${Number(order.total).toLocaleString()}`,
    `Payment: ${order.payment_status}`,
  ];
  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}