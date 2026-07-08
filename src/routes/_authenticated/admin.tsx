import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Settings as SettingsIcon, Home } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — PUNIQUE KITCHEN" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const LINKS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

function AdminLayout() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && user && !isAdmin) navigate({ to: "/", replace: true });
  }, [loading, user, isAdmin, navigate]);

  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!isAdmin) return <div className="grid min-h-screen place-items-center text-muted-foreground">Admin access required.</div>;

  return (
    <div className="min-h-screen bg-secondary/40">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-sidebar text-sidebar-foreground md:block">
        <Link to="/" className="flex items-center gap-2 border-b border-sidebar-border px-6 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-warm font-display font-bold text-primary-foreground">P</span>
          <span className="font-display font-bold">PUNIQUE</span>
        </Link>
        <nav className="p-3">
          {LINKS.map((l) => {
            const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
            return (
              <Link key={l.to} to={l.to} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"}`}>
                <l.icon className="h-4 w-4" />{l.label}
              </Link>
            );
          })}
          <Link to="/" className="mt-6 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/50">
            <Home className="h-4 w-4" />Back to site
          </Link>
        </nav>
      </aside>
      <div className="md:pl-60">
        <header className="border-b border-border bg-background/90 backdrop-blur md:hidden">
          <div className="flex items-center gap-2 overflow-x-auto px-4 py-2">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">{l.label}</Link>
            ))}
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-6"><Outlet /></main>
      </div>
    </div>
  );
}