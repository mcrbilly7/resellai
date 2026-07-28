"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhotoUploader } from "@/components/PhotoUploader";

interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  include: boolean;
}

export default function ReceiptsPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [mocked, setMocked] = useState(false);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [importing, setImporting] = useState(false);

  async function scan() {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch("/api/receipts/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: photos }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Scan failed");
      const data = await res.json();
      setStoreName(data.receipt.storeName);
      setMocked(data.receipt.mocked);
      setItems(data.receipt.items.map((i: { name: string; price: number; quantity: number }) => ({ ...i, include: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  function updateItem(index: number, patch: Partial<ReceiptItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  async function importItems() {
    setImporting(true);
    try {
      const toImport = items.filter((i) => i.include);
      for (const item of toImport) {
        for (let q = 0; q < item.quantity; q++) {
          await fetch("/api/inventory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: item.name,
              purchasePrice: item.price,
              purchaseDate: new Date().toISOString(),
              status: "needs_photos",
              location: storeName ? `From receipt: ${storeName}` : "From receipt",
            }),
          });
        }
      }
      router.push("/inventory?status=needs_photos");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Receipt Scanning</h1>
        <p className="text-sm text-muted">
          Photograph a purchase receipt and AI extracts line items into draft inventory rows with the purchase price
          prefilled — add photos later from Inventory.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
        <PhotoUploader photos={photos} onChange={setPhotos} />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          onClick={scan}
          disabled={photos.length === 0 || scanning}
          className="w-full rounded-xl bg-accent text-accent-foreground py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {scanning ? "Reading receipt…" : "Scan Receipt"}
        </button>
      </div>

      {items.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          {mocked && (
            <div className="rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs px-3 py-2">
              Demo mode: no ANTHROPIC_API_KEY configured, showing sample extracted items.
            </div>
          )}
          <h2 className="font-semibold">
            {storeName ? `Items from ${storeName}` : "Extracted Items"} ({items.length})
          </h2>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={item.include} onChange={(e) => updateItem(i, { include: e.target.checked })} />
                <input
                  value={item.name}
                  onChange={(e) => updateItem(i, { name: e.target.value })}
                  className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5"
                />
                <div className="relative w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-xs">$</span>
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => updateItem(i, { price: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-border bg-background pl-5 pr-2 py-1.5"
                  />
                </div>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                  className="w-16 rounded-lg border border-border bg-background px-2 py-1.5"
                  title="Quantity"
                />
              </div>
            ))}
          </div>
          <button
            onClick={importItems}
            disabled={importing || items.every((i) => !i.include)}
            className="w-full rounded-xl bg-accent text-accent-foreground py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {importing ? "Importing…" : `Import ${items.filter((i) => i.include).reduce((s, i) => s + i.quantity, 0)} item(s)`}
          </button>
        </div>
      )}
    </div>
  );
}
