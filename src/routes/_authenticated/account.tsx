import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { getMyOrders } from "@/lib/orders.functions";
import { formatNaira, formatDate } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { ORDER_STATUS_LABEL } from "@/lib/config";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "My account — PUNIQUE KITCHEN" }, { name: "robots", content: "noindex" }] }),
  component: AccountPage,
});

function AccountPage() {
  const fetchOrders = useServerFn(getMyOrders);
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ["my-orders"], queryFn: () => fetchOrders() });

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">My orders</h1>
          <Button variant="outline" onClick={signOut}>Sign out</Button>
        </div>
        {q.isLoading && <p className="mt-8 text-muted-foreground">Loading…</p>}
        {q.data && q.data.length === 0 && <p className="mt-8 text-muted-foreground">You haven't placed any orders yet.</p>}
        <ul className="mt-6 space-y-3">
          {(q.data ?? []).map((o: any) => (
            <li key={o.id}>
              <Link to="/order/$orderNumber" params={{ orderNumber: o.order_number }} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card hover:border-primary">
                <div>
                  <p className="font-semibold">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(o.created_at)} · {ORDER_STATUS_LABEL[o.status] ?? o.status}</p>
                </div>
                <span className="font-display text-lg font-bold text-primary">{formatNaira(Number(o.total))}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <SiteFooter />
    </div>
  );
}