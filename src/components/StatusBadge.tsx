import { STATUS_LABELS } from "@/lib/marketplaces";

const TONE: Record<string, string> = {
  purchased: "bg-surface-muted text-foreground",
  needs_photos: "bg-warning/15 text-warning",
  ai_processing: "bg-accent/15 text-accent",
  draft: "bg-warning/15 text-warning",
  listed: "bg-accent/15 text-accent",
  sold: "bg-success/15 text-success",
  shipped: "bg-success/15 text-success",
  archived: "bg-surface-muted text-muted",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[status] ?? "bg-surface-muted text-foreground"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
