import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Menu as MenuIcon, User, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CartDrawer } from "@/components/cart-drawer";
import { useAuth } from "@/hooks/use-auth";
import { BRAND } from "@/lib/config";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/menu", label: "Menu" },
  { to: "/track", label: "Track order" },
];

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-warm font-display text-lg font-bold text-primary-foreground shadow-warm">P</span>
          <span className="font-display text-lg font-bold tracking-tight sm:text-xl">{BRAND}</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${pathname === n.to ? "text-primary" : "text-foreground/80 hover:text-foreground"}`}
            >
              {n.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className="rounded-md px-3 py-2 text-sm font-medium text-forest hover:text-primary">
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <CartDrawer />
          {user ? (
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link to="/account"><User className="h-4 w-4" />Account</Link>
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className="ml-1 grid h-9 w-9 place-items-center rounded-md border border-border md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={open ? "close" : "menu"} initial={{ opacity: 0, rotate: -45, scale: 0.7 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: 45, scale: 0.7 }} transition={{ duration: 0.18 }}>
                {open ? <X className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden border-t border-border bg-background md:hidden">
          <nav className="flex flex-col p-2">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                {n.label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-forest hover:bg-muted">Admin</Link>
            )}
          </nav>
        </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}