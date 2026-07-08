import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Clock, MapPin, Sparkles, UtensilsCrossed } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { MenuImage } from "@/components/menu-image";
import { getMenu } from "@/lib/menu.functions";
import { formatNaira } from "@/lib/format";
import { BRAND, TAGLINE } from "@/lib/config";
import heroImg from "@/assets/hero-food.jpg";
import jollof from "@/assets/dish-jollof.jpg";
import egusi from "@/assets/dish-egusi.jpg";
import sandwich from "@/assets/dish-sandwich.jpg";

const menuQuery = {
  queryKey: ["menu"],
  queryFn: () => getMenu(),
};

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(menuQuery),
  component: HomePage,
});

const FEATURED_IMAGES: Record<string, string> = {
  "Smokey Jollof Rice": jollof,
  "Egusi Soup": egusi,
  "Creamy Beef Sandwich": sandwich,
};

function HomePage() {
  const { data } = useSuspenseQuery(menuQuery);
  const settings = data.settings;
  const featured = data.items.slice(0, 6);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {settings?.announcement && (
        <div className="bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-2 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            <span>{settings.announcement}</span>
          </div>
        </div>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-primary-foreground"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-medium">
              <MapPin className="h-3 w-3" /> Yenagoa, Bayelsa
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              {BRAND}
            </h1>
            <p className="mt-4 max-w-lg text-lg text-primary-foreground/85">
              {TAGLINE}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-primary text-primary-foreground shadow-warm hover:bg-primary/90">
                <Link to="/menu">Order now <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/track">Track your order</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-primary-foreground/80">
              <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> 30-45 min delivery</div>
              <div className="flex items-center gap-2"><UtensilsCrossed className="h-4 w-4" /> Freshly cooked to order</div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-3xl bg-gradient-warm opacity-30 blur-2xl" />
            <img
              src={heroImg}
              alt="Nigerian food spread including jollof rice, egusi soup and plantain"
              width={1024}
              height={1024}
              className="relative aspect-square w-full rounded-3xl object-cover shadow-warm ring-1 ring-primary-foreground/20"
            />
          </motion.div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Chef's picks</p>
            <h2 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Today at the kitchen</h2>
          </div>
          <Button asChild variant="outline">
            <Link to="/menu">View full menu</Link>
          </Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((item, idx) => {
            const staticImg = FEATURED_IMAGES[item.name];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="group overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border transition-all hover:-translate-y-1 hover:shadow-warm"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  {staticImg ? (
                    <img src={staticImg} alt={item.name} loading="lazy" width={1024} height={768} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <MenuImage src={item.image_url} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-xl font-semibold">{item.name}</h3>
                    <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">{formatNaira(item.price)}</span>
                  </div>
                  {item.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-secondary/60 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">How it works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { title: "Browse the menu", body: "From smokey jollof to egusi soup — pick what you're craving today." },
              { title: "Pay securely", body: "Pay online with card, bank transfer or USSD via Paystack." },
              { title: "Pickup or delivery", body: "Track your order live from our kitchen to your door." },
            ].map((s, i) => (
              <div key={s.title} className="rounded-2xl bg-card p-6 shadow-card">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-warm font-display text-lg font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}