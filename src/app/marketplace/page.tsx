"use client";

import { useEffect, useState } from "react";
import { MarketplaceDef } from "@/lib/marketplaces";

interface Row extends MarketplaceDef {
  connected: boolean;
}

export default function MarketplacePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/marketplaces");
    const data = await res.json();
    setRows(data.marketplaces);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function toggle(key: string, connected: boolean) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, connected } : r)));
    await fetch("/api/marketplaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, connected }),
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Marketplace Connections</h1>
        <p className="text-sm text-muted">
          Connect the marketplaces you sell on. Cross-posting uses these connections to publish, sync inventory, and
          remove sold items everywhere automatically.
        </p>
      </div>

      <div className="rounded-xl bg-accent/10 border border-accent/20 text-sm px-3 py-2 text-foreground/80">
        This is a demo integration layer — connecting here enables the marketplace as a publish target in the Scanner
        and Listings flow. Wiring real OAuth + API credentials per marketplace is a follow-up integration step.
      </div>

      {loading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : (
        <div className="rounded-2xl border border-border bg-surface divide-y divide-border">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-muted">Est. fees: {r.feePercent}%</div>
              </div>
              <button
                onClick={() => toggle(r.key, !r.connected)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  r.connected ? "bg-success text-white" : "border border-border text-foreground/70"
                }`}
              >
                {r.connected ? "Connected" : "Connect"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
