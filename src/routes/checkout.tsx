import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CreditCard, MapPin, Store, Truck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MenuImage } from "@/components/menu-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCart } from "@/lib/cart-store";
import { formatNaira } from "@/lib/format";
import { DELIVERY_AREAS } from "@/lib/config";
import { placeOrder } from "@/lib/orders.functions";
import { initPaystack } from "@/lib/paystack.functions";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/menu.functions";

const settingsQuery = { queryKey: ["settings"], queryFn: () => getPublicSettings() };

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — PUNIQUE KITCHEN" },
      { name: "description", content: "Complete your PUNIQUE KITCHEN order." },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const deliveryType = useCart((s) => s.deliveryType);
  const setDeliveryType = useCart((s) => s.setDeliveryType);
  const clear = useCart((s) => s.clear);
  const navigate = useNavigate();
  const doPlaceOrder = useServerFn(placeOrder);
  const doInitPaystack = useServerFn(initPaystack);

  const [form, setForm] = useState({
    name: "", phone: "", email: "", address: "", area: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const deliveryFee = deliveryType === "delivery" ? Number(settings?.delivery_fee ?? 0) : 0;
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <h1 className="font-display text-3xl font-bold">Your basket is empty</h1>
          <p className="mt-2 text-muted-foreground">Add something delicious before checking out.</p>
          <Button asChild className="mt-6"><Link to="/menu">Browse menu</Link></Button>
        </div>
        <SiteFooter />
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await doPlaceOrder({
        data: {
          customer_name: form.name,
          phone: form.phone,
          email: form.email,
          delivery_type: deliveryType,
          address: deliveryType === "delivery" ? form.address : "",
          area: deliveryType === "delivery" ? form.area : "",
          notes: form.notes,
          items: items.map((i) => ({
            menu_item_id: i.menu_item_id,
            quantity: i.quantity,
            addons: i.addons,
            notes: i.notes,
          })),
        },
      });
      // Init Paystack
      const callback = `${window.location.origin}/payment/callback?order=${result.order_number}`;
      const pay = await doInitPaystack({
        data: { order_number: result.order_number, callback_url: callback },
      });
      clear();
      if (pay.authorization_url) {
        window.location.href = pay.authorization_url;
      } else {
        navigate({ to: "/order/$orderNumber", params: { orderNumber: result.order_number } });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1fr_380px]">
        <form onSubmit={submit} className="space-y-6">
          <h1 className="font-display text-3xl font-bold">Checkout</h1>

          <div>
            <Label className="mb-2 block">Delivery option</Label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setDeliveryType("pickup")}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${deliveryType === "pickup" ? "border-primary bg-primary/5" : "border-border"}`}>
                <Store className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold">Pickup</div>
                  <div className="text-xs text-muted-foreground">Free — collect from us</div>
                </div>
              </button>
              <button type="button" onClick={() => setDeliveryType("delivery")}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${deliveryType === "delivery" ? "border-primary bg-primary/5" : "border-border"}`}>
                <Truck className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold">Delivery</div>
                  <div className="text-xs text-muted-foreground">{formatNaira(Number(settings?.delivery_fee ?? 0))} across Yenagoa</div>
                </div>
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Full name *</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="phone">Phone (WhatsApp) *</Label>
              <Input id="phone" required inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0801 234 5678" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="email">Email (for receipt)</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>

          {deliveryType === "delivery" && (
            <div className="grid gap-4 rounded-xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4" /> Delivery address in Yenagoa</div>
              <div>
                <Label htmlFor="area">Area *</Label>
                <Select value={form.area} onValueChange={(v) => setForm({ ...form, area: v })}>
                  <SelectTrigger id="area"><SelectValue placeholder="Select area" /></SelectTrigger>
                  <SelectContent>
                    {DELIVERY_AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="address">Street address / landmark *</Label>
                <Textarea id="address" required={deliveryType === "delivery"} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House / plot number, street, closest landmark" />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes for the kitchen (optional)</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. extra pepper, no onions" />
          </div>
        </form>

        <aside className="lg:sticky lg:top-24 h-fit space-y-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-border">
          <h2 className="font-display text-xl font-bold">Order summary</h2>
          <ul className="space-y-3">
            {items.map((i) => {
              const line = (i.base_price + i.addons.reduce((s, a) => s + a.price, 0)) * i.quantity;
              return (
                <li key={i.key} className="flex gap-3">
                  <MenuImage src={i.image_url} alt={i.name} className="h-12 w-12 shrink-0 rounded-md object-cover" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium">{i.name} <span className="text-muted-foreground">× {i.quantity}</span></p>
                    {i.addons.length > 0 && <p className="text-xs text-muted-foreground">+ {i.addons.map((a) => a.name).join(", ")}</p>}
                  </div>
                  <span className="text-sm font-semibold">{formatNaira(line)}</span>
                </li>
              );
            })}
          </ul>
          <div className="space-y-1.5 border-t border-border pt-4 text-sm">
            <Row label="Subtotal" value={formatNaira(subtotal)} />
            <Row label="Delivery" value={deliveryType === "delivery" ? formatNaira(deliveryFee) : "Free (pickup)"} />
            <div className="flex items-center justify-between border-t border-border pt-2 font-display text-lg font-bold">
              <span>Total</span>
              <span>{formatNaira(total)}</span>
            </div>
          </div>
          <Button
            onClick={submit as any}
            disabled={submitting}
            className="mt-2 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            size="lg"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {submitting ? "Processing..." : `Pay ${formatNaira(total)}`}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Secure payment powered by Paystack</p>
        </aside>
      </div>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}