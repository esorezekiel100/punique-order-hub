import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track your order — PUNIQUE KITCHEN" },
      { name: "description", content: "Enter your order number to see live status." },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const [order, setOrder] = useState("");
  const navigate = useNavigate();
  function go(e: React.FormEvent) {
    e.preventDefault();
    const n = order.trim().toUpperCase();
    if (n) navigate({ to: "/order/$orderNumber", params: { orderNumber: n } });
  }
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-md px-6 py-16">
        <h1 className="font-display text-3xl font-bold">Track your order</h1>
        <p className="mt-2 text-muted-foreground">Enter your order number (starts with <b>PK-</b>).</p>
        <form onSubmit={go} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="ord">Order number</Label>
            <Input id="ord" value={order} onChange={(e) => setOrder(e.target.value)} placeholder="PK-1001" />
          </div>
          <Button type="submit" className="w-full"><Search className="mr-2 h-4 w-4" />Find order</Button>
        </form>
      </div>
      <SiteFooter />
    </div>
  );
}