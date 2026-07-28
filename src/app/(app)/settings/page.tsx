"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

interface TaxSummary {
  year: number;
  grossSales: number;
  costOfGoods: number;
  fees: number;
  shippingPackaging: number;
  netProfit: number;
  itemCount: number;
  summary: string;
}

export default function SettingsPage() {
  const { theme, toggle } = useTheme();
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);
  const [loadingTax, setLoadingTax] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setAiConfigured(d.aiConfigured));
  }, []);

  async function loadTaxSummary() {
    setLoadingTax(true);
    try {
      const res = await fetch(`/api/tax-summary?year=${taxYear}`);
      setTaxSummary(await res.json());
    } finally {
      setLoadingTax(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">App preferences, AI configuration, and data tools.</p>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5 space-y-3">
        <h2 className="font-semibold">Appearance</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm">Theme</span>
          <button
            onClick={toggle}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-muted"
          >
            {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 space-y-3">
        <h2 className="font-semibold">AI Configuration</h2>
        {aiConfigured === null ? (
          <p className="text-sm text-muted">Checking…</p>
        ) : aiConfigured ? (
          <p className="text-sm text-success">ANTHROPIC_API_KEY is configured — live AI vision, listing generation, and assistant are active.</p>
        ) : (
          <div className="text-sm text-warning space-y-1">
            <p>No ANTHROPIC_API_KEY set. The AI Scanner, Listing Generator, and Assistant are running in demo mode with sample data.</p>
            <p className="text-muted">Set ANTHROPIC_API_KEY in your environment and restart the server to enable real AI analysis.</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 space-y-3">
        <h2 className="font-semibold">Data Export</h2>
        {/* eslint-disable @next/next/no-html-link-for-pages -- file downloads, not app routes */}
        <div className="flex flex-wrap gap-2">
          <a href="/api/inventory/export?kind=inventory" className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-muted">
            Inventory CSV
          </a>
          <a href="/api/inventory/export?kind=sales" className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-muted">
            Sales Report CSV
          </a>
          <a href="/api/inventory/export?kind=tax" className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-muted">
            Tax Report CSV
          </a>
        {/* eslint-enable @next/next/no-html-link-for-pages */}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 space-y-3">
        <h2 className="font-semibold">Tax Preparation Assistant</h2>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={taxYear}
            onChange={(e) => setTaxYear(Number(e.target.value) || new Date().getFullYear())}
            className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
          <button
            onClick={loadTaxSummary}
            disabled={loadingTax}
            className="rounded-lg bg-accent text-accent-foreground px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
          >
            {loadingTax ? "Generating…" : "Generate Summary"}
          </button>
        </div>
        {taxSummary && (
          <div className="rounded-xl bg-surface-muted p-3 text-sm space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <span>Items sold: {taxSummary.itemCount}</span>
              <span>Gross sales: ${taxSummary.grossSales.toFixed(2)}</span>
              <span>COGS: ${taxSummary.costOfGoods.toFixed(2)}</span>
              <span>Fees: ${taxSummary.fees.toFixed(2)}</span>
              <span>Shipping/packaging: ${taxSummary.shippingPackaging.toFixed(2)}</span>
              <span className="font-semibold">Net profit: ${taxSummary.netProfit.toFixed(2)}</span>
            </div>
            <p className="whitespace-pre-wrap text-foreground/90 pt-2 border-t border-border">{taxSummary.summary}</p>
          </div>
        )}
        <p className="text-xs text-muted">
          Not tax advice — an estimate for your records. Bring the CSV export above to a licensed tax preparer for
          filing.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 space-y-2">
        <h2 className="font-semibold">Security</h2>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li>API keys (ANTHROPIC_API_KEY, marketplace credentials) are read from server-side environment variables only — never exposed to the browser.</li>
          <li>Local data is stored in SQLite; the optional Postgres cloud-sync schema is in supabase/schema.sql for multi-device / multi-user deployments.</li>
          <li>Multi-user accounts with hashed passwords and signed session cookies are built in. Encrypted marketplace OAuth token storage and automatic backups are part of the cloud-sync roadmap (see README).</li>
        </ul>
      </section>
    </div>
  );
}
