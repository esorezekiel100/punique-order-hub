import { createFileRoute, useNavigate, useServerFn } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { verifyPaystack } from "@/lib/paystack.functions";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  reference: z.string().optional(),
  trxref: z.string().optional(),
  order: z.string().optional(),
});

export const Route = createFileRoute("/payment/callback")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Verifying payment…" }, { name: "robots", content: "noindex" }] }),
  component: CallbackPage,
});

function CallbackPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const doVerify = useServerFn(verifyPaystack);
  const [msg, setMsg] = useState("Verifying your payment…");

  useEffect(() => {
    const ref = search.reference || search.trxref;
    if (!ref || ref === "already_paid") {
      if (search.order) navigate({ to: "/order/$orderNumber", params: { orderNumber: search.order }, replace: true });
      return;
    }
    doVerify({ data: { reference: ref } })
      .then((r) => {
        const target = r.order_number || search.order;
        if (target) {
          navigate({ to: "/order/$orderNumber", params: { orderNumber: target }, replace: true });
        } else {
          setMsg("Payment verified. You can track your order from the Track page.");
        }
      })
      .catch((e) => setMsg(e?.message ?? "Verification failed. Contact support with your reference."));
  }, [search, doVerify, navigate]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{msg}</p>
      </div>
      <SiteFooter />
    </div>
  );
}