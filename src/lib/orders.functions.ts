import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function serverSupabase() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const cartItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  addons: z
    .array(z.object({ name: z.string(), price: z.number() }))
    .default([]),
  notes: z.string().max(300).optional(),
});

const placeOrderSchema = z.object({
  customer_name: z.string().min(1).max(120),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional().or(z.literal("")),
  delivery_type: z.enum(["pickup", "delivery"]),
  address: z.string().max(400).optional().or(z.literal("")),
  area: z.string().max(80).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
  items: z.array(cartItemSchema).min(1).max(50),
});

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => placeOrderSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = serverSupabase();
    const { data: rows, error } = await supabase.rpc("create_order", {
      p_customer_name: data.customer_name,
      p_phone: data.phone,
      p_email: data.email || (null as unknown as string),
      p_delivery_type: data.delivery_type,
      p_address: data.address || (null as unknown as string),
      p_area: data.area || (null as unknown as string),
      p_notes: data.notes || (null as unknown as string),
      p_items: data.items,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) throw new Error("Failed to create order");
    return row as { id: string; order_number: string; total: number };
  });

export const getOrderByNumber = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ order_number: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const supabase = serverSupabase();
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, phone, delivery_type, address, area, status, subtotal, delivery_fee, total, notes, payment_status, created_at",
      )
      .eq("order_number", data.order_number)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) return null;
    const { data: items } = await supabase
      .from("order_items")
      .select("id, name_snapshot, price_at_time, quantity, addons, notes")
      .eq("order_id", order.id);
    return { ...order, items: items ?? [] };
  });

// ------- Authenticated: customer order history --------
export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, order_number, status, total, delivery_type, created_at, payment_status")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ------- Admin --------
async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z.string().optional(),
        delivery_type: z.enum(["pickup", "delivery"]).optional(),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    let q: any = context.supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.delivery_type) q = q.eq("delivery_type", data.delivery_type);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminGetOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: items } = await context.supabase
      .from("order_items")
      .select("*")
      .eq("order_id", data.id);
    return { ...order, items: items ?? [] };
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum([
          "received",
          "preparing",
          "ready",
          "out_for_delivery",
          "delivered",
          "cancelled",
        ]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data: orders, error } = await context.supabase
      .from("orders")
      .select("id, total, status, created_at, payment_status")
      .gte("created_at", since.toISOString());
    if (error) throw new Error(error.message);
    const list = orders ?? [];
    const today = new Date().toDateString();
    const todaysOrders = list.filter(
      (o: any) => new Date(o.created_at).toDateString() === today,
    );
    const paid = list.filter((o: any) => o.payment_status === "paid");
    const totalRevenue = paid.reduce((s: number, o: any) => s + Number(o.total), 0);
    const todaysRevenue = todaysOrders
      .filter((o: any) => o.payment_status === "paid")
      .reduce((s: number, o: any) => s + Number(o.total), 0);
    const pending = list.filter(
      (o: any) => !["delivered", "cancelled"].includes(o.status),
    ).length;
    // Daily revenue for chart
    const buckets = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const o of paid) {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + Number(o.total));
    }
    const daily = Array.from(buckets.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));
    return {
      todaysOrdersCount: todaysOrders.length,
      todaysRevenue,
      totalRevenue,
      pendingCount: pending,
      totalOrders: list.length,
      daily,
    };
  });