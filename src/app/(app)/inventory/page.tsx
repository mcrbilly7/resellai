"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { InventoryItemDTO } from "@/lib/types";
import { STATUS_PIPELINE, STATUS_LABELS, CONDITIONS } from "@/lib/marketplaces";
import { StatusBadge } from "@/components/StatusBadge";
import { apiFetch } from "@/lib/offline";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const res = await fetch(`/api/inventory?${params.toString()}`);
    const data = await res.json();
    setItems(data.items);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter(Boolean))] as string[],
    [items]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} item(s)? This can't be undone.`)) return;
    await Promise.all([...selected].map((id) => apiFetch(`/api/inventory/${id}`, { method: "DELETE" })));
    setSelected(new Set());
    load();
  }

  async function handleImport(file: File) {
    const csv = await file.text();
    const res = await fetch("/api/inventory/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    const data = await res.json();
    setImportResult(
      `Imported ${data.created} item(s)${data.skippedDuplicates ? `, skipped ${data.skippedDuplicates} duplicate(s)` : ""}.`
    );
    load();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Inventory</h1>
          <p className="text-sm text-muted">{items.length} item(s)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInput}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
          />
          <button
            onClick={() => fileInput.current?.click()}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
          >
            Import CSV
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not an app route */}
          <a
            href="/api/inventory/export?kind=inventory"
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
          >
            Export CSV
          </a>
          <button
            onClick={() => setShowQuickAdd((s) => !s)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
          >
            + Quick Add
          </button>
          <Link
            href="/scanner"
            className="rounded-lg bg-accent text-accent-foreground px-3 py-1.5 text-sm font-semibold"
          >
            + Scan Item
          </Link>
        </div>
      </div>

      {importResult && (
        <div className="rounded-lg bg-accent/10 text-accent text-sm px-3 py-2">{importResult}</div>
      )}

      {showQuickAdd && (
        <QuickAddForm
          onDone={() => {
            setShowQuickAdd(false);
            load();
          }}
        />
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search name, brand, SKU, barcode…"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm w-64"
        />
        <button onClick={load} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-muted">
          Search
        </button>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          {STATUS_PIPELINE.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {selected.size > 0 && (
          <button onClick={bulkDelete} className="rounded-lg border border-danger text-danger px-3 py-1.5 text-sm">
            Delete {selected.size} selected
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted uppercase">
              <th className="px-3 py-2 w-8"></th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Condition</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-right">Profit</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted">
                  No items yet. <Link href="/scanner" className="text-accent underline">Scan your first item</Link>.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-muted">
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
                </td>
                <td className="px-3 py-2">
                  <Link href={`/inventory/${item.id}`} className="flex items-center gap-2">
                    {item.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.photos[0]} alt="" className="h-9 w-9 rounded-md object-cover border border-border" />
                    ) : (
                      <div className="h-9 w-9 rounded-md bg-surface-muted" />
                    )}
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted">{item.brand}</div>
                    </div>
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted">{item.sku}</td>
                <td className="px-3 py-2">{item.category ?? "—"}</td>
                <td className="px-3 py-2">{item.condition ?? "—"}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-3 py-2 text-right">
                  {item.status === "sold" ? `$${(item.salePrice ?? 0).toFixed(2)}` : item.listingPrice ? `$${item.listingPrice.toFixed(2)}` : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  {item.profit != null ? (
                    <span className={item.profit >= 0 ? "text-success" : "text-danger"}>${item.profit.toFixed(2)}</span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {categories.length > 0 && (
        <p className="text-xs text-muted">Categories on this page: {categories.join(", ")}</p>
      )}
    </div>
  );
}

function QuickAddForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [condition, setCondition] = useState<string>(CONDITIONS[2]);
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    try {
      await apiFetch("/api/inventory", {
        method: "POST",
        body: { name, purchasePrice: purchasePrice || null, condition, location: location || null, status: "needs_photos" },
      });
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-4 space-y-3">
      <p className="text-xs text-muted">
        Manually add an item without AI — works offline (add photos and generate a listing later from the item page).
      </p>
      <div className="grid sm:grid-cols-4 gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          className="sm:col-span-2 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
        />
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-xs">$</span>
          <input
            type="number"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(Number(e.target.value) || 0)}
            placeholder="Purchase price"
            className="w-full rounded-lg border border-border bg-background pl-5 pr-2 py-1.5 text-sm"
          />
        </div>
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
        >
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location (e.g. Shelf A1, Bin 4)"
        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={submitting || !name}
        className="rounded-lg bg-accent text-accent-foreground px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add Item"}
      </button>
    </form>
  );
}
