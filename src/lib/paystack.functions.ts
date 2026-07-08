import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function serverSupabase() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const initPaystack = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        order_number: z.string().min(1),
        callback_url: z.string().url(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Payment gateway not configured");
    const supabase = serverSupabase();
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, order_number, total, email, phone, customer_name, payment_status")
      .eq("order_number", data.order_number)
      .single();
    if (error || !order) throw new Error("Order not found");
    if (order.payment_status === "paid") {
      return { authorization_url: data.callback_url + "?reference=already_paid", reference: null };
    }

    const reference = `PK_${order.order_number}_${Date.now()}`;
    const email = order.email || `${order.phone.replace(/\D/g, "")}@guest.puniquekitchen.com`;
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round(Number(order.total) * 100), // kobo
        reference,
        currency: "NGN",
        callback_url: data.callback_url,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
        },
      }),
    });
    const json = (await res.json()) as any;
    if (!res.ok || !json.status) {
      throw new Error(json.message || "Failed to start payment");
    }
    // Save reference on the order via admin client
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("orders")
      .update({ payment_reference: reference })
      .eq("id", order.id);
    return {
      authorization_url: json.data.authorization_url as string,
      reference,
    };
  });

export const verifyPaystack = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ reference: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Payment gateway not configured");
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    const json = (await res.json()) as any;
    if (!res.ok || !json.status) {
      throw new Error(json.message || "Verification failed");
    }
    const txn = json.data;
    const orderNumber = txn?.metadata?.order_number as string | undefined;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (orderNumber) {
      if (txn.status === "success") {
        await supabaseAdmin
          .from("orders")
          .update({
            payment_status: "paid",
            paystack_reference: data.reference,
          })
          .eq("order_number", orderNumber);
      } else if (txn.status === "failed") {
        await supabaseAdmin
          .from("orders")
          .update({ payment_status: "failed" })
          .eq("order_number", orderNumber);
      }
    }
    return {
      status: txn.status as string,
      order_number: orderNumber,
      amount: txn.amount / 100,
    };
  });