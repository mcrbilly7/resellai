"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhotoUploader } from "@/components/PhotoUploader";
import { ProfitCalculator } from "@/components/ProfitCalculator";
import { CONDITIONS, MARKETPLACES } from "@/lib/marketplaces";

interface Analysis {
  name: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  color: string | null;
  size: string | null;
  material: string | null;
  year: string | null;
  rarity: string | null;
  condition: string;
  conditionScore: number;
  conditionReason: string;
  aiConfidence: number;
  msrp: number;
  currentRetail: number;
  avgSoldPrice: number;
  lowestActive: number;
  highestSoldPrice: number;
  keywords: string[];
  mocked: boolean;
}

interface Tiers {
  fastPrice: number;
  normalPrice: number;
  maxPrice: number;
}

interface Listing {
  title: string;
  description: string;
  keywords: string[];
  itemSpecifics: Record<string, string>;
  mocked: boolean;
}

type Step = "upload" | "review" | "listing";

export default function ScannerPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [photos, setPhotos] = useState<string[]>([]);
  const [barcode, setBarcode] = useState("");
  const [note, setNote] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [tiers, setTiers] = useState<Tiers | null>(null);
  const [strategy, setStrategy] = useState<"fast" | "normal" | "max">("normal");
  const [profit, setProfit] = useState({ purchasePrice: 0, shippingCost: 0, packagingCost: 0, marketplace: "ebay" });

  const [generating, setGenerating] = useState(false);
  const [listing, setListing] = useState<Listing | null>(null);
  const [marketplaces, setMarketplaces] = useState<string[]>(["ebay"]);
  const [saving, setSaving] = useState(false);

  const price = tiers ? tiers[`${strategy}Price` as keyof Tiers] : 0;

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: photos, barcode, note }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Analysis failed");
      const data = await res.json();
      setAnalysis(data.analysis);
      setTiers(data.tiers);
      setStep("review");
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  function updateAnalysis<K extends keyof Analysis>(key: K, value: Analysis[K]) {
    setAnalysis((a) => (a ? { ...a, [key]: value } : a));
  }

  async function handleGenerateListing() {
    if (!analysis) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/listings/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: analysis.name,
          brand: analysis.brand,
          model: analysis.model,
          category: analysis.category,
          color: analysis.color,
          size: analysis.size,
          material: analysis.material,
          year: analysis.year,
          condition: analysis.condition,
          conditionReason: analysis.conditionReason,
          price,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Listing generation failed");
      const data = await res.json();
      setListing(data.listing);
      setStep("listing");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Listing generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function updateListing<K extends keyof Listing>(key: K, value: Listing[K]) {
    setListing((l) => (l ? { ...l, [key]: value } : l));
  }

  async function handleSave(publish: boolean) {
    if (!analysis || !listing) return;
    setSaving(true);
    try {
      const marketplaceStatus: Record<string, string> = {};
      if (publish) for (const m of marketplaces) marketplaceStatus[m] = "pending";

      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: barcode || null,
          name: analysis.name,
          brand: analysis.brand,
          model: analysis.model,
          category: analysis.category,
          color: analysis.color,
          size: analysis.size,
          material: analysis.material,
          year: analysis.year,
          rarity: analysis.rarity,
          condition: analysis.condition,
          conditionScore: analysis.conditionScore,
          conditionReason: analysis.conditionReason,
          aiConfidence: analysis.aiConfidence,
          photos,
          purchasePrice: profit.purchasePrice || null,
          shippingCostEstimate: profit.shippingCost || null,
          packagingCost: profit.packagingCost || null,
          status: publish ? "listed" : "draft",
          msrp: analysis.msrp,
          currentRetail: analysis.currentRetail,
          avgSoldPrice: analysis.avgSoldPrice,
          lowestActive: analysis.lowestActive,
          highestSoldPrice: analysis.highestSoldPrice,
          fastPrice: tiers?.fastPrice,
          normalPrice: tiers?.normalPrice,
          maxPrice: tiers?.maxPrice,
          listingPrice: price,
          pricingStrategy: strategy,
          title: listing.title,
          description: listing.description,
          keywords: listing.keywords,
          itemSpecifics: listing.itemSpecifics,
          marketplaces: publish ? marketplaces : [],
          marketplaceStatus,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      const data = await res.json();
      router.push(`/inventory/${data.item.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStep("upload");
    setPhotos([]);
    setBarcode("");
    setNote("");
    setAnalysis(null);
    setTiers(null);
    setListing(null);
    setMarketplaces(["ebay"]);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Scan Item</h1>
        <p className="text-sm text-muted">Photo → AI identification → pricing → listing, in minutes.</p>
      </div>

      <Steps current={step} />

      {step === "upload" && (
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <PhotoUploader photos={photos} onChange={setPhotos} />
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Barcode (UPC / EAN / ISBN)</label>
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or type a barcode"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Notes (optional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything the AI should know"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          {analyzeError && <p className="text-sm text-danger">{analyzeError}</p>}
          <button
            onClick={handleAnalyze}
            disabled={photos.length === 0 || analyzing}
            className="w-full rounded-xl bg-accent text-accent-foreground py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {analyzing ? "Analyzing with AI…" : "Analyze with AI"}
          </button>
        </div>
      )}

      {step === "review" && analysis && tiers && (
        <div className="space-y-6">
          {analysis.mocked && (
            <div className="rounded-xl bg-warning/10 border border-warning/30 text-warning text-sm px-3 py-2">
              Demo mode: no ANTHROPIC_API_KEY configured, showing sample AI output.
            </div>
          )}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
              <h2 className="font-semibold">AI Identification</h2>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Name" value={analysis.name} onChange={(v) => updateAnalysis("name", v)} full />
                <TextField label="Brand" value={analysis.brand ?? ""} onChange={(v) => updateAnalysis("brand", v)} />
                <TextField label="Model" value={analysis.model ?? ""} onChange={(v) => updateAnalysis("model", v)} />
                <TextField label="Category" value={analysis.category ?? ""} onChange={(v) => updateAnalysis("category", v)} />
                <TextField label="Color" value={analysis.color ?? ""} onChange={(v) => updateAnalysis("color", v)} />
                <TextField label="Size" value={analysis.size ?? ""} onChange={(v) => updateAnalysis("size", v)} />
                <TextField label="Material" value={analysis.material ?? ""} onChange={(v) => updateAnalysis("material", v)} />
                <TextField label="Year" value={analysis.year ?? ""} onChange={(v) => updateAnalysis("year", v)} />
              </div>
              <p className="text-xs text-muted">AI confidence: {analysis.aiConfidence}%</p>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
              <h2 className="font-semibold">Condition Grading</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Condition</label>
                  <select
                    value={analysis.condition}
                    onChange={(e) => updateAnalysis("condition", e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <TextField
                  label="Condition score (0-100)"
                  value={String(analysis.conditionScore)}
                  onChange={(v) => updateAnalysis("conditionScore", Number(v) || 0)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Reason</label>
                <textarea
                  value={analysis.conditionReason}
                  onChange={(e) => updateAnalysis("conditionReason", e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <h2 className="font-semibold">Pricing Engine</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              <Stat label="MSRP" value={analysis.msrp} />
              <Stat label="Current Retail" value={analysis.currentRetail} />
              <Stat label="Avg Sold" value={analysis.avgSoldPrice} />
              <Stat label="Lowest Active" value={analysis.lowestActive} />
              <Stat label="Highest Sold" value={analysis.highestSoldPrice} />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <PriceCard
                title="Fast Sale"
                subtitle="Sell within 1-7 days"
                price={tiers.fastPrice}
                selected={strategy === "fast"}
                onSelect={() => setStrategy("fast")}
              />
              <PriceCard
                title="Normal Sale"
                subtitle="Maximum balance"
                price={tiers.normalPrice}
                selected={strategy === "normal"}
                onSelect={() => setStrategy("normal")}
              />
              <PriceCard
                title="Max Profit"
                subtitle="Highest return"
                price={tiers.maxPrice}
                selected={strategy === "max"}
                onSelect={() => setStrategy("max")}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-semibold mb-4">Profit Calculator</h2>
            <ProfitCalculator salePrice={price} onChange={setProfit} />
          </div>

          <div className="flex justify-between">
            <button onClick={reset} className="text-sm text-muted hover:text-foreground">
              ← Start over
            </button>
            <button
              onClick={handleGenerateListing}
              disabled={generating}
              className="rounded-xl bg-accent text-accent-foreground px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {generating ? "Generating listing…" : "Generate Listing →"}
            </button>
          </div>
        </div>
      )}

      {step === "listing" && listing && analysis && (
        <div className="space-y-6">
          {listing.mocked && (
            <div className="rounded-xl bg-warning/10 border border-warning/30 text-warning text-sm px-3 py-2">
              Demo mode: no ANTHROPIC_API_KEY configured, showing a template-generated listing.
            </div>
          )}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <h2 className="font-semibold">Listing Preview</h2>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Title</label>
              <input
                value={listing.title}
                onChange={(e) => updateListing("title", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Description</label>
              <textarea
                value={listing.description}
                onChange={(e) => updateListing("description", e.target.value)}
                rows={8}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Keywords</label>
              <input
                value={listing.keywords.join(", ")}
                onChange={(e) => updateListing("keywords", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-2">Item Specifics</label>
              <div className="grid sm:grid-cols-2 gap-3">
                {Object.entries(listing.itemSpecifics).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-[11px] text-muted mb-0.5">{key}</label>
                    <input
                      value={value}
                      onChange={(e) =>
                        updateListing("itemSpecifics", { ...listing.itemSpecifics, [key]: e.target.value })
                      }
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg bg-surface-muted px-3 py-2 text-sm font-semibold">
              Listing price: ${price.toFixed(2)} ({strategy} sale)
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-semibold mb-3">Publish To</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {MARKETPLACES.map((m) => (
                <label key={m.key} className="flex items-center gap-2 text-sm rounded-lg border border-border px-2.5 py-1.5">
                  <input
                    type="checkbox"
                    checked={marketplaces.includes(m.key)}
                    onChange={(e) =>
                      setMarketplaces((prev) =>
                        e.target.checked ? [...prev, m.key] : prev.filter((k) => k !== m.key)
                      )
                    }
                  />
                  {m.name}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <button onClick={() => setStep("review")} className="text-sm text-muted hover:text-foreground">
              ← Back
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving || marketplaces.length === 0}
                className="rounded-xl bg-accent text-accent-foreground px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {saving ? "Publishing…" : "Approve & Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Steps({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: "1. Scan" },
    { key: "review", label: "2. Review & Price" },
    { key: "listing", label: "3. Listing & Approve" },
  ];
  const order: Step[] = ["upload", "review", "listing"];
  const currentIndex = order.indexOf(current);

  return (
    <div className="flex gap-2 text-xs font-medium">
      {steps.map((s, i) => (
        <div
          key={s.key}
          className={`flex-1 rounded-full px-3 py-1.5 text-center ${
            i <= currentIndex ? "bg-accent text-accent-foreground" : "bg-surface-muted text-muted"
          }`}
        >
          {s.label}
        </div>
      ))}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="block text-xs font-medium text-muted mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-muted px-3 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="font-semibold">${value.toFixed(2)}</div>
    </div>
  );
}

function PriceCard({
  title,
  subtitle,
  price,
  selected,
  onSelect,
}: {
  title: string;
  subtitle: string;
  price: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left rounded-xl border p-4 transition-colors ${
        selected ? "border-accent bg-accent/10" : "border-border hover:bg-surface-muted"
      }`}
    >
      <div className="text-xs font-semibold text-muted uppercase">{title}</div>
      <div className="text-xl font-bold mt-1">${price.toFixed(2)}</div>
      <div className="text-xs text-muted mt-1">{subtitle}</div>
    </button>
  );
}
