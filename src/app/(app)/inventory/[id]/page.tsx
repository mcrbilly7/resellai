"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { InventoryItemDTO } from "@/lib/types";
import { STATUS_PIPELINE, STATUS_LABELS, MARKETPLACES } from "@/lib/marketplaces";
import { StatusBadge } from "@/components/StatusBadge";
import { computeProfit } from "@/lib/profit";
import { apiFetch } from "@/lib/offline";

export default function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [item, setItem] = useState<InventoryItemDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [salePrice, setSalePrice] = useState<number>(0);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/inventory/${id}`);
    if (res.ok) {
      const data = await res.json();
      setItem(data.item);
      setSalePrice(data.item.listingPrice ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    const res = await apiFetch(`/api/inventory/${id}`, { method: "PATCH", body });
    const data = await res.json();
    if (data.queued) {
      setItem((prev) => (prev ? { ...prev, ...body } as InventoryItemDTO : prev));
    } else {
      setItem(data.item);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${item?.name}"? This can't be undone.`)) return;
    await apiFetch(`/api/inventory/${id}`, { method: "DELETE" });
    router.push("/inventory");
  }

  if (loading) return <div className="p-8 text-muted">Loading…</div>;
  if (!item) return <div className="p-8 text-muted">Item not found.</div>;

  const projectedProfit =
    item.listingPrice != null
      ? computeProfit({
          salePrice,
          purchasePrice: item.purchasePrice ?? 0,
          shippingCost: item.shippingCostEstimate ?? 0,
          packagingCost: item.packagingCost ?? 0,
          marketplaceFeePercent: MARKETPLACES.find((m) => m.key === item.marketplaces[0])?.feePercent ?? 10,
        })
      : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/inventory" className="text-sm text-muted hover:text-foreground">
          ← Back to Inventory
        </Link>
        <button onClick={handleDelete} className="text-sm text-danger hover:underline">
          Delete item
        </button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{item.title || item.name}</h1>
          <p className="text-sm text-muted">
            SKU {item.sku} {item.barcode && `· Barcode ${item.barcode}`}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      {item.authenticityRisk && item.authenticityRisk !== "low" && (
        <div
          className={`rounded-xl px-3 py-2 text-sm ${
            item.authenticityRisk === "high"
              ? "bg-danger/10 text-danger border border-danger/30"
              : "bg-warning/10 text-warning border border-warning/30"
          }`}
        >
          <span className="font-semibold uppercase text-xs">{item.authenticityRisk} authenticity risk</span>
          {item.authenticityNotes && <p className="mt-0.5">{item.authenticityNotes}</p>}
        </div>
      )}

      {item.photos.length > 0 && (
        <div className="flex gap-3 overflow-x-auto">
          {item.photos.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="h-28 w-28 rounded-lg object-cover border border-border shrink-0" />
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <h2 className="font-semibold">Details</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Brand" value={item.brand} />
              <Detail label="Model" value={item.model} />
              <Detail label="Category" value={item.category} />
              <Detail label="Color" value={item.color} />
              <Detail label="Size" value={item.size} />
              <Detail label="Material" value={item.material} />
              <Detail label="Condition" value={item.condition} />
              <Detail label="Condition score" value={item.conditionScore != null ? `${item.conditionScore}%` : null} />
              <Detail label="Location" value={item.location} />
              <Detail label="Purchase price" value={item.purchasePrice != null ? `$${item.purchasePrice.toFixed(2)}` : null} />
            </dl>
          </div>

          {item.description && (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="font-semibold mb-2">Description</h2>
              <p className="text-sm whitespace-pre-wrap text-foreground/90">{item.description}</p>
            </div>
          )}

          {item.marketplaces.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="font-semibold mb-3">Marketplace Status</h2>
              <div className="space-y-2">
                {item.marketplaces.map((m) => {
                  const def = MARKETPLACES.find((x) => x.key === m);
                  const listing = item.marketplaceListings[m];
                  const status = item.marketplaceStatus[m] ?? "pending";
                  return (
                    <div key={m} className="flex items-center justify-between text-sm">
                      <span>{def?.name ?? m}</span>
                      <span className="flex items-center gap-2">
                        <span
                          className={
                            status.startsWith("published")
                              ? "text-success"
                              : status === "error"
                                ? "text-danger"
                                : "text-muted"
                          }
                        >
                          {status}
                        </span>
                        {listing?.url && (
                          <a href={listing.url} target="_blank" rel="noreferrer" className="text-accent underline text-xs">
                            view
                          </a>
                        )}
                        {listing?.error && <span className="text-xs text-danger">({listing.error})</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <h2 className="font-semibold">Pipeline Status</h2>
            <select
              value={item.status}
              onChange={(e) => patch({ status: e.target.value })}
              disabled={saving}
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            >
              {STATUS_PIPELINE.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          {item.status !== "sold" ? (
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
              <h2 className="font-semibold">Mark as Sold</h2>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Sale price</label>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                />
              </div>
              {projectedProfit && (
                <div className="text-xs text-muted space-y-1">
                  <div>Projected profit: <span className="font-semibold text-success">${projectedProfit.profit.toFixed(2)}</span></div>
                  <div>ROI: {projectedProfit.roi.toFixed(1)}% · Margin: {projectedProfit.profitMargin.toFixed(1)}%</div>
                </div>
              )}
              <button
                onClick={() => patch({ status: "sold", salePrice })}
                disabled={saving}
                className="w-full rounded-xl bg-success text-white py-2 text-sm font-semibold disabled:opacity-50"
              >
                Confirm Sale
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-2">
              <h2 className="font-semibold">Sale Summary</h2>
              <dl className="text-sm space-y-1">
                <Row label="Sale price" value={`$${(item.salePrice ?? 0).toFixed(2)}`} />
                <Row label="Platform fees" value={`$${(item.platformFees ?? 0).toFixed(2)}`} />
                <Row label="Profit" value={`$${(item.profit ?? 0).toFixed(2)}`} tone="success" />
                <Row label="ROI" value={`${(item.roi ?? 0).toFixed(1)}%`} />
                <Row label="Days listed" value={String(item.daysListed ?? "—")} />
              </dl>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface p-5 space-y-1.5 text-sm">
            <h2 className="font-semibold mb-2">Pricing</h2>
            <Row label="Fast" value={item.fastPrice != null ? `$${item.fastPrice.toFixed(2)}` : "—"} />
            <Row label="Normal" value={item.normalPrice != null ? `$${item.normalPrice.toFixed(2)}` : "—"} />
            <Row label="Max" value={item.maxPrice != null ? `$${item.maxPrice.toFixed(2)}` : "—"} />
            <Row label="Listing price" value={item.listingPrice != null ? `$${item.listingPrice.toFixed(2)}` : "—"} bold />
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

function Row({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: "success" }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""} ${tone === "success" ? "text-success" : ""}`}>
      <span className={bold ? "" : "text-muted"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
