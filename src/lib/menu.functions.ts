import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function serverSupabase() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const getMenu = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = serverSupabase();
  const [{ data: categories, error: catErr }, { data: items, error: itemsErr }, { data: settings }] =
    await Promise.all([
      supabase.from("categories").select("*").order("display_order"),
      supabase.from("menu_items").select("*").order("display_order"),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    ]);
  if (catErr) throw new Error(catErr.message);
  if (itemsErr) throw new Error(itemsErr.message);
  return { categories: categories ?? [], items: items ?? [], settings };
});

export const getPublicSettings = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = serverSupabase();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
  return data;
});