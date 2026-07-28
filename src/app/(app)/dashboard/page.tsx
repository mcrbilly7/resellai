import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { StatCard } from "@/components/StatCard";
import { STATUS_LABELS } from "@/lib/marketplaces";
import { computeRepricingSuggestions } from "@/lib/repricing";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [active, listed, drafts, sold, activity, needsAttention, listedItems] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { userId: user.id, status: { notIn: ["sold", "archived"] } },
      select: { listingPrice: true, purchasePrice: true },
    }),
    prisma.inventoryItem.count({ where: { userId: user.id, status: "listed" } }),
    prisma.inventoryItem.count({ where: { userId: user.id, status: "draft" } }),
    prisma.inventoryItem.findMany({
      where: { userId: user.id, status: "sold" },
      select: { profit: true, daysListed: true },
    }),
    prisma.activityLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.inventoryItem.findMany({
      where: { userId: user.id, status: { in: ["needs_photos", "purchased"] } },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: { id: true, name: true, status: true, createdAt: true },
    }),
    prisma.inventoryItem.findMany({
      where: { userId: user.id, status: "listed" },
      select: {
        id: true, name: true, status: true, listingPrice: true, fastPrice: true, normalPrice: true,
        maxPrice: true, pricingStrategy: true, createdAt: true,
      },
    }),
  ]);

  const totalInventoryValue = active.reduce(
    (sum, i) => sum + (i.listingPrice ?? i.purchasePrice ?? 0),
    0
  );
  const itemsSold = sold.length;
  const totalProfit = sold.reduce((sum, i) => sum + (i.profit ?? 0), 0);
  const avgSaleTime =
    itemsSold > 0
      ? sold.reduce((sum, i) => sum + (i.daysListed ?? 0), 0) / itemsSold
      : 0;

  const repricing = computeRepricingSuggestions(listedItems);
  const recommendations = buildRecommendations({
    drafts,
    needsAttention: needsAttention.length,
    stale: repricing.length,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted">Your reselling business at a glance.</p>
        </div>
        <Link
          href="/scanner"
          className="inline-flex items-center gap-2 rounded-xl bg-accent text-accent-foreground px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-90"
        >
          + Scan Item
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Inventory Value" value={`$${totalInventoryValue.toFixed(2)}`} />
        <StatCard label="Active Listings" value={String(listed)} />
        <StatCard label="Pending Drafts" value={String(drafts)} tone={drafts > 0 ? "warning" : "default"} />
        <StatCard label="Items Sold" value={String(itemsSold)} tone="success" />
        <StatCard label="Total Profit" value={`$${totalProfit.toFixed(2)}`} tone="success" />
        <StatCard label="Avg Sale Time" value={itemsSold > 0 ? `${avgSaleTime.toFixed(1)} days` : "—"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-semibold mb-3">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted">
              No activity yet.{" "}
              <Link href="/scanner" className="text-accent underline">
                Scan your first item
              </Link>{" "}
              to get started.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {activity.map((a) => (
                <li key={a.id} className="flex justify-between gap-3 border-b border-border last:border-0 pb-2 last:pb-0">
                  <span>{a.message}</span>
                  <span className="text-muted shrink-0">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-semibold mb-3">AI Recommendations</h2>
          {recommendations.length === 0 ? (
            <p className="text-sm text-muted">You&apos;re all caught up. No recommendations right now.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent">●</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
          {needsAttention.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h3 className="text-xs font-semibold text-muted uppercase mb-2">Needs Attention</h3>
              <ul className="space-y-1.5 text-sm">
                {needsAttention.map((item) => (
                  <li key={item.id}>
                    <Link href={`/inventory/${item.id}`} className="hover:text-accent">
                      {item.name}
                      <span className="text-muted"> · {STATUS_LABELS[item.status] ?? item.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {repricing.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Repricing Suggestions</h2>
            <Link href="/listings" className="text-xs text-accent hover:underline">
              Manage in Listings →
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {repricing.slice(0, 4).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3">
                <Link href={`/inventory/${r.id}`} className="hover:text-accent truncate">
                  {r.name}
                </Link>
                <span className="text-xs text-muted shrink-0">
                  ${r.listingPrice.toFixed(2)} → <span className="text-warning font-medium">${r.suggestedPrice.toFixed(2)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function buildRecommendations({
  drafts,
  needsAttention,
  stale,
}: {
  drafts: number;
  needsAttention: number;
  stale: number;
}): string[] {
  const tips: string[] = [];
  if (drafts > 0) tips.push(`You have ${drafts} draft listing${drafts === 1 ? "" : "s"} waiting for approval.`);
  if (needsAttention > 0) tips.push(`${needsAttention} item${needsAttention === 1 ? "" : "s"} still need photos or processing.`);
  if (stale > 0) tips.push(`${stale} listing${stale === 1 ? "" : "s"} have been sitting a while — see repricing suggestions below.`);
  if (tips.length === 0) tips.push("Scan a new item to keep your pipeline moving.");
  return tips;
}
