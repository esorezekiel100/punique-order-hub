import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminStats } from "@/lib/orders.functions";
import { formatNaira } from "@/lib/format";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const fetchStats = useServerFn(adminStats);
  const q = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchStats(), refetchInterval: 30_000 });
  const s = q.data;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Today's orders" value={s?.todaysOrdersCount ?? "—"} />
        <Stat label="Today's revenue" value={s ? formatNaira(s.todaysRevenue) : "—"} accent />
        <Stat label="Pending orders" value={s?.pendingCount ?? "—"} />
        <Stat label="30-day revenue" value={s ? formatNaira(s.totalRevenue) : "—"} />
      </div>
      <div className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-border">
        <h2 className="mb-4 font-display text-xl font-semibold">Revenue (last 30 days)</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={s?.daily ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatNaira(v)} />
              <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 shadow-card ring-1 ring-border ${accent ? "bg-gradient-warm text-primary-foreground" : "bg-card"}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${accent ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{label}</p>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}