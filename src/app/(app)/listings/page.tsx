"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InventoryItemDTO } from "@/lib/types";
import { MARKETPLACES } from "@/lib/marketplaces";
import type { RepricingCandidate } from "@/lib/repricing";

export default function ListingsPage() {
  const [drafts, setDrafts] = useState<InventoryItemDTO[]>([]);
  const [live, setLive] = useState<InventoryItemDTO[]>([]);
  const [suggestions, setSuggestions] = useState<RepricingCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [d, l, r] = await Promise.all([
      fetch("/api/inventory?status=draft").then((r) => r.json()),
      fetch("/api/inventory?status=listed").then((r) => r.json()),
      fetch("/api/repricing").then((r) => r.json()),
    ]);
    setDrafts(d.items);
    setLive(l.items);
    setSuggestions(r.suggestions);
    setLoading(false);
  }

  async function applyReprice(candidate: RepricingCandidate) {
    await fetch(`/api/inventory/${candidate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingPrice: candidate.suggestedPrice }),
    });
    load();
  }

  function dismissReprice(id: string) {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function publish(item: InventoryItemDTO) {
    const marketplaces = item.marketplaces.length > 0 ? item.marketplaces : ["ebay"];
    const res = await fetch(`/api/inventory/${item.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketplaces }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(`Publishing failed: ${err.error ?? "unknown error"}`);
    }
    load();
  }

  async function reject(item: InventoryItemDTO) {
    if (!confirm(`Reject and delete draft "${item.name}"?`)) return;
    await fetch(`/api/inventory/${item.id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <div className="p-8 text-muted">Loading…</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Listings</h1>
        <p className="text-sm text-muted">Approve drafts and manage what&apos;s live across marketplaces.</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Pending Approval ({drafts.length})</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-muted">No drafts waiting. Scan an item to create one.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {drafts.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-surface p-4 space-y-2">
                <div className="flex gap-3">
                  {item.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photos[0]} alt="" className="h-14 w-14 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-surface-muted" />
                  )}
                  <div className="min-w-0">
                    <Link href={`/inventory/${item.id}`} className="font-medium truncate block hover:text-accent">
                      {item.title || item.name}
                    </Link>
                    <div className="text-xs text-muted">${item.listingPrice?.toFixed(2) ?? "—"}</div>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => publish(item)}
                    className="flex-1 rounded-lg bg-accent text-accent-foreground text-xs font-semibold py-1.5"
                  >
                    Approve & Publish
                  </button>
                  <button
                    onClick={() => reject(item)}
                    className="rounded-lg border border-border text-xs font-semibold px-2.5"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {suggestions.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Repricing Suggestions ({suggestions.length})</h2>
          <div className="rounded-2xl border border-border bg-surface divide-y divide-border">
            {suggestions.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link href={`/inventory/${s.id}`} className="font-medium hover:text-accent">
                    {s.name}
                  </Link>
                  <p className="text-xs text-muted">{s.reason}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm">
                    ${s.listingPrice.toFixed(2)} → <span className="text-warning font-semibold">${s.suggestedPrice.toFixed(2)}</span>
                  </span>
                  <button
                    onClick={() => applyReprice(s)}
                    className="rounded-lg bg-accent text-accent-foreground text-xs font-semibold px-3 py-1.5"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => dismissReprice(s.id)}
                    className="rounded-lg border border-border text-xs font-semibold px-2.5 py-1.5"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Live Listings ({live.length})</h2>
        {live.length === 0 ? (
          <p className="text-sm text-muted">Nothing published yet.</p>
        ) : (
          <div className="rounded-2xl border border-border bg-surface divide-y divide-border">
            {live.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 p-4">
                <Link href={`/inventory/${item.id}`} className="font-medium hover:text-accent">
                  {item.title || item.name}
                </Link>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {item.marketplaces.map((m) => (
                    <span key={m} className="rounded-full bg-surface-muted px-2 py-0.5 text-xs">
                      {MARKETPLACES.find((x) => x.key === m)?.name ?? m}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
