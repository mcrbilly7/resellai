import Link from "next/link";

const FEATURES = [
  {
    title: "Supplier Sourcing Recommendations",
    description: "Suggest wholesale suppliers for your best-selling categories.",
    needs: "A supplier directory API or partnership feed — there's no generic public data source for this.",
  },
  {
    title: "Wholesale Finder",
    description: "Search wholesale marketplaces (liquidation pallets, closeouts) for inventory to flip.",
    needs: "Direct integration with each wholesale marketplace (e.g. B-Stock, Liquidation.com); each has its own API/auth.",
  },
  {
    title: "Auction Monitoring",
    description: "Watch eBay/estate-sale/local auctions for underpriced items matching your sourcing criteria.",
    needs: "Live polling access to auction sites' search/listing APIs, plus a saved-search + alerting pipeline.",
  },
];

export default function SourcingPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Sourcing</h1>
        <p className="text-sm text-muted">Supplier recommendations, wholesale finder, and auction monitoring.</p>
      </div>

      <div className="rounded-xl bg-warning/10 border border-warning/30 text-warning text-sm px-3 py-2">
        Not built yet — and deliberately not faked. These features need live data from real supplier/wholesale/auction
        platforms. This build environment has no network access to those services and no data feed to source from, so
        rather than show made-up &ldquo;recommendations,&rdquo; this page is honest about what&apos;s missing.
      </div>

      <div className="space-y-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="font-semibold text-sm">{f.title}</h2>
            <p className="text-sm text-muted mt-1">{f.description}</p>
            <p className="text-xs text-muted mt-2">
              <span className="font-medium">Needed to build:</span> {f.needs}
            </p>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted">
        In the meantime, the <Link href="/analytics" className="text-accent underline">Analytics</Link> page shows your
        best-performing brands and categories from your own sales history — a good starting point for deciding what
        to source more of.
      </p>
    </div>
  );
}
