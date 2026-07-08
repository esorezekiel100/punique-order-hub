import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MenuImage } from "@/components/menu-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getMenu } from "@/lib/menu.functions";
import { useCart, type Addon } from "@/lib/cart-store";
import { formatNaira } from "@/lib/format";

const menuQuery = { queryKey: ["menu"], queryFn: () => getMenu() };

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — PUNIQUE KITCHEN" },
      { name: "description", content: "Browse jollof rice, egusi soup, sandwiches, curry sauces and more from PUNIQUE KITCHEN Yenagoa." },
      { property: "og:title", content: "Menu — PUNIQUE KITCHEN" },
      { property: "og:description", content: "Browse our menu and order online in Yenagoa." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(menuQuery),
  component: MenuPage,
});

function MenuPage() {
  const { data } = useSuspenseQuery(menuQuery);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string | "all">("all");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.items.filter((i) => {
      if (activeCat !== "all" && i.category_id !== activeCat) return false;
      if (!term) return true;
      return (
        i.name.toLowerCase().includes(term) ||
        (i.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [data.items, q, activeCat]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const item of filtered) {
      const key = item.category_id ?? "other";
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return map;
  }, [filtered]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="bg-gradient-warm text-primary-foreground">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Our menu</h1>
          <p className="mt-2 max-w-xl text-primary-foreground/85">Fresh, hearty Nigerian food cooked to order. Add what you love to your basket.</p>
          <div className="relative mt-6 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-foreground/70" />
            <Input
              placeholder="Search dishes..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border-primary-foreground/30 bg-primary-foreground/10 pl-9 text-primary-foreground placeholder:text-primary-foreground/60"
            />
          </div>
        </div>
      </section>

      <div className="sticky top-[57px] z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          <FilterChip active={activeCat === "all"} onClick={() => setActiveCat("all")}>All</FilterChip>
          {data.categories.map((c) => (
            <FilterChip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
              {c.name}
            </FilterChip>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {data.categories.map((cat) => {
          const items = grouped.get(cat.id);
          if (!items || items.length === 0) return null;
          return (
            <section key={cat.id} id={cat.slug} className="mb-12">
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold sm:text-3xl">{cat.name}</h2>
                  {cat.description && <p className="text-sm text-muted-foreground">{cat.description}</p>}
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => <MenuCard key={item.id} item={item} />)}
              </div>
            </section>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-16 text-center text-muted-foreground">No dishes match your search.</p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground/80 hover:border-primary/40"}`}
    >
      {children}
    </button>
  );
}

function MenuCard({ item }: { item: any }) {
  const addItem = useCart((s) => s.addItem);
  const [addons, setAddons] = useState<Addon[]>([]);
  const proteins = (item.protein_options ?? []) as Addon[];
  const outOfStock = !item.in_stock;
  const linePrice = item.price + addons.reduce((s, a) => s + a.price, 0);

  function toggleAddon(a: Addon) {
    setAddons((cur) => cur.find((x) => x.name === a.name) ? cur.filter((x) => x.name !== a.name) : [...cur, a]);
  }

  function add() {
    addItem({
      menu_item_id: item.id,
      name: item.name,
      base_price: Number(item.price),
      image_url: item.image_url,
      addons,
    });
    toast.success(`${item.name} added to basket`);
    setAddons([]);
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border">
      <div className="relative aspect-[4/3] overflow-hidden">
        <MenuImage src={item.image_url} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {item.is_special && (
          <Badge className="absolute left-3 top-3 gap-1 bg-accent text-accent-foreground shadow-warm">
            <Sparkles className="h-3 w-3" /> Today's special
          </Badge>
        )}
        {outOfStock && (
          <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
            <span className="rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">Out of stock</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-tight">{item.name}</h3>
          <span className="shrink-0 font-bold text-primary">{formatNaira(item.price)}</span>
        </div>
        {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
        {proteins.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add protein</p>
            <div className="flex flex-wrap gap-1.5">
              {proteins.map((p) => {
                const on = !!addons.find((x) => x.name === p.name);
                return (
                  <button
                    key={p.name}
                    onClick={() => toggleAddon(p)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground/70 hover:border-primary/40"}`}
                  >
                    {p.name} +{formatNaira(p.price)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-auto flex items-center gap-3 pt-4">
          <span className="font-display text-lg font-semibold">{formatNaira(linePrice)}</span>
          <Button
            className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            disabled={outOfStock}
            onClick={add}
          >
            Add to basket
          </Button>
        </div>
      </div>
    </article>
  );
}