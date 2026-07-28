"use client";

import { useEffect, useMemo, useState } from "react";
import { computeProfit } from "@/lib/profit";
import { MARKETPLACES } from "@/lib/marketplaces";

export function ProfitCalculator({
  salePrice,
  initialPurchasePrice = 0,
  initialShipping = 0,
  initialPackaging = 0,
  initialMarketplace = "ebay",
  onChange,
}: {
  salePrice: number;
  initialPurchasePrice?: number;
  initialShipping?: number;
  initialPackaging?: number;
  initialMarketplace?: string;
  onChange?: (values: {
    purchasePrice: number;
    shippingCost: number;
    packagingCost: number;
    marketplace: string;
  }) => void;
}) {
  const [purchasePrice, setPurchasePrice] = useState(initialPurchasePrice);
  const [shippingCost, setShippingCost] = useState(initialShipping);
  const [packagingCost, setPackagingCost] = useState(initialPackaging);
  const [marketplace, setMarketplace] = useState(initialMarketplace);

  const feePercent = MARKETPLACES.find((m) => m.key === marketplace)?.feePercent ?? 10;

  const result = useMemo(
    () =>
      computeProfit({
        salePrice,
        purchasePrice,
        shippingCost,
        packagingCost,
        marketplaceFeePercent: feePercent,
      }),
    [salePrice, purchasePrice, shippingCost, packagingCost, feePercent]
  );

  useEffect(() => {
    onChange?.({ purchasePrice, shippingCost, packagingCost, marketplace });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchasePrice, shippingCost, packagingCost, marketplace]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Purchase price" value={purchasePrice} onChange={setPurchasePrice} />
        <Field label="Shipping cost" value={shippingCost} onChange={setShippingCost} />
        <Field label="Packaging cost" value={packagingCost} onChange={setPackagingCost} />
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Marketplace fees</label>
          <select
            value={marketplace}
            onChange={(e) => setMarketplace(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          >
            {MARKETPLACES.map((m) => (
              <option key={m.key} value={m.key}>
                {m.name} ({m.feePercent}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl bg-surface-muted p-3 text-sm space-y-1.5">
        <Row label="Sale price" value={`$${salePrice.toFixed(2)}`} />
        <Row label="Platform fees" value={`-$${result.platformFees.toFixed(2)}`} />
        <Row label="Shipping + packaging" value={`-$${(shippingCost + packagingCost).toFixed(2)}`} />
        <Row label="Purchase price" value={`-$${purchasePrice.toFixed(2)}`} />
        <div className="border-t border-border my-1.5" />
        <Row
          label="Estimated profit"
          value={`$${result.profit.toFixed(2)}`}
          bold
          tone={result.profit >= 0 ? "success" : "danger"}
        />
        <Row label="ROI" value={`${result.roi.toFixed(1)}%`} />
        <Row label="Profit margin" value={`${result.profitMargin.toFixed(1)}%`} />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full rounded-lg border border-border bg-background pl-5 pr-2 py-1.5 text-sm"
        />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: "success" | "danger";
}) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "";
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""} ${toneClass}`}>
      <span className={bold ? "" : "text-muted"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
