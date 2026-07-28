"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { StatCard } from "@/components/StatCard";

interface AnalyticsData {
  revenue: number;
  profit: number;
  itemsSold: number;
  avgSalePrice: number;
  avgDaysListed: number;
  inventoryValue: number;
  byBrand: { name: string; value: number }[];
  byCategory: { name: string; value: number }[];
  bestMarketplace: { name: string; count: number } | null;
  monthlySeries: { month: string; revenue: number; profit: number }[];
  trend: { revenuePct: number; profitPct: number; currentMonth: string; previousMonth: string } | null;
}

function TrendBadge({ pct }: { pct: number }) {
  if (pct === 0) return <span className="text-muted"> flat vs last month</span>;
  const up = pct > 0;
  return (
    <span className={up ? "text-success" : "text-danger"}>
      {" "}
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}% vs last month
    </span>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <div className="p-8 text-muted">Loading…</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted">Sales performance across your whole business.</p>
      </div>

      {data.trend && (
        <p className="text-xs text-muted">
          {data.trend.currentMonth} vs {data.trend.previousMonth}: revenue<TrendBadge pct={data.trend.revenuePct} />,
          profit<TrendBadge pct={data.trend.profitPct} />
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue" value={`$${data.revenue.toFixed(2)}`} />
        <StatCard label="Profit" value={`$${data.profit.toFixed(2)}`} tone="success" />
        <StatCard label="Items Sold" value={String(data.itemsSold)} />
        <StatCard label="Avg Sale Price" value={`$${data.avgSalePrice.toFixed(2)}`} />
        <StatCard label="Avg Days Listed" value={data.itemsSold > 0 ? data.avgDaysListed.toFixed(1) : "—"} />
        <StatCard label="Inventory Value" value={`$${data.inventoryValue.toFixed(2)}`} />
        <StatCard label="Best Marketplace" value={data.bestMarketplace?.name ?? "—"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-semibold mb-3">Revenue &amp; Profit Over Time</h2>
          {data.monthlySeries.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted)" />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12 }} />
                <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={false} name="Revenue" />
                <Line type="monotone" dataKey="profit" stroke="#16a34a" strokeWidth={2} dot={false} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-semibold mb-3">Profit by Category</h2>
          {data.byCategory.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted)" />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12 }} />
                <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
          <h2 className="font-semibold mb-3">Profit by Brand</h2>
          {data.byBrand.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.byBrand} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--muted)" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted)" width={100} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12 }} />
                <Bar dataKey="value" fill="#16a34a" radius={[0, 6, 6, 0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return <div className="h-[260px] flex items-center justify-center text-sm text-muted">Not enough sales data yet.</div>;
}
